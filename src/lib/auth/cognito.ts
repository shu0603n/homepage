import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// Cognito ユーザープール（メールアドレスを username にする設定）。
// 認証情報は .env の AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION を SDK が自動で読む。

function requireEnv(name: "COGNITO_USER_POOL_ID" | "COGNITO_CLIENT_ID"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が設定されていません`);
  return value;
}

// 認証情報は .env の REGION / ACCESS_KEY_ID / SECRET_ACCESS_KEY を使う
// （Amplify は AWS_ で始まる環境変数を設定できないため、AWS_ を付けない名前にしている）。
// 未設定のときは SDK の標準の取得方法（実行ロールなど）に任せる。
let client: CognitoIdentityProviderClient | undefined;
function getClient(): CognitoIdentityProviderClient {
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY;
  client ??= new CognitoIdentityProviderClient({
    region: process.env.REGION || process.env.AWS_REGION || "ap-northeast-1",
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return client;
}

export type CognitoSignInResult = { sub: string; email: string };

export type CognitoErrorCode =
  | "invalid_credentials"
  | "user_not_found"
  | "user_exists"
  | "invalid_password"
  | "invalid_code"
  | "expired_code"
  | "too_many_requests"
  | "new_password_required"
  | "unknown";

export class CognitoAuthError extends Error {
  code: CognitoErrorCode;
  constructor(code: CognitoErrorCode) {
    super(code);
    this.code = code;
  }
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
}

// SDK のエラー名を画面に出してよい分類に変換する（存在確認につながる情報は呼び出し側で伏せる）
export function toAuthError(error: unknown): CognitoAuthError {
  if (error instanceof CognitoAuthError) return error;
  switch (errorName(error)) {
    case "NotAuthorizedException":
    case "UserNotConfirmedException":
      return new CognitoAuthError("invalid_credentials");
    case "UserNotFoundException":
      return new CognitoAuthError("user_not_found");
    case "UsernameExistsException":
      return new CognitoAuthError("user_exists");
    case "InvalidPasswordException":
      return new CognitoAuthError("invalid_password");
    case "CodeMismatchException":
      return new CognitoAuthError("invalid_code");
    case "ExpiredCodeException":
      return new CognitoAuthError("expired_code");
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return new CognitoAuthError("too_many_requests");
    default:
      // 設定漏れ（.env の COGNITO_* が空など）や権限不足の原因を、サーバーのログで分かるようにする
      console.error("Cognito error:", errorName(error), error instanceof Error ? error.message : "");
      return new CognitoAuthError("unknown");
  }
}

function attributeValue(attributes: { Name?: string; Value?: string }[] | undefined, name: string): string | undefined {
  return attributes?.find((a) => a.Name === name)?.Value;
}

// メール＋パスワードでサインイン（サーバー側認証：ADMIN_USER_PASSWORD_AUTH）
export async function signIn(email: string, password: string): Promise<CognitoSignInResult> {
  try {
    const auth = await getClient().send(
      new AdminInitiateAuthCommand({
        UserPoolId: requireEnv("COGNITO_USER_POOL_ID"),
        ClientId: requireEnv("COGNITO_CLIENT_ID"),
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    );
    if (!auth.AuthenticationResult) throw new CognitoAuthError("new_password_required");
    const user = await getClient().send(
      new AdminGetUserCommand({ UserPoolId: requireEnv("COGNITO_USER_POOL_ID"), Username: email }),
    );
    return {
      sub: attributeValue(user.UserAttributes, "sub") ?? email,
      email: attributeValue(user.UserAttributes, "email") ?? email,
    };
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function userExists(email: string): Promise<boolean> {
  try {
    await getClient().send(new AdminGetUserCommand({ UserPoolId: requireEnv("COGNITO_USER_POOL_ID"), Username: email }));
    return true;
  } catch (error) {
    if (errorName(error) === "UserNotFoundException") return false;
    throw toAuthError(error);
  }
}

// 新規ユーザーを作成し、パスワードを確定させる（確認メールは送らず、そのままログインできる状態にする）
export async function createUser(email: string, password: string): Promise<void> {
  const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
  try {
    await getClient().send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
      }),
    );
  } catch (error) {
    // 作成できなかった場合は何も作られていない（既存ユーザーを消さないよう、ここでは削除しない）
    throw toAuthError(error);
  }
  try {
    await getClient().send(
      new AdminSetUserPasswordCommand({ UserPoolId: userPoolId, Username: email, Password: password, Permanent: true }),
    );
  } catch (error) {
    // パスワードが規則に合わず確定できなかったときは、今作ったばかりのユーザーを残さない
    await deleteUser(email).catch(() => undefined);
    throw toAuthError(error);
  }
}

export async function deleteUser(email: string): Promise<void> {
  await getClient().send(new AdminDeleteUserCommand({ UserPoolId: requireEnv("COGNITO_USER_POOL_ID"), Username: email }));
}

// パスワードリセット：登録メールアドレスへ確認コードを送る
export async function startPasswordReset(email: string): Promise<void> {
  try {
    await getClient().send(new ForgotPasswordCommand({ ClientId: requireEnv("COGNITO_CLIENT_ID"), Username: email }));
  } catch (error) {
    // コードを送れない（未登録・メール未確認など）場合も「ユーザーなし」として扱い、呼び出し側は成功と同じ応答にする
    if (errorName(error) === "InvalidParameterException") throw new CognitoAuthError("user_not_found");
    throw toAuthError(error);
  }
}

// パスワードリセット：確認コードと新しいパスワードで更新する
export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  try {
    await getClient().send(
      new ConfirmForgotPasswordCommand({
        ClientId: requireEnv("COGNITO_CLIENT_ID"),
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      }),
    );
  } catch (error) {
    throw toAuthError(error);
  }
}

// ログイン用メールアドレスを変更する（確認コードによる本人確認は呼び出し側で済ませてから呼ぶ）。
// メールをユーザー名にしているプールなので、変更後は新しいメールでログインする
export async function changeUserEmail(currentEmail: string, newEmail: string): Promise<void> {
  try {
    await getClient().send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: requireEnv("COGNITO_USER_POOL_ID"),
        Username: currentEmail,
        UserAttributes: [
          { Name: "email", Value: newEmail },
          { Name: "email_verified", Value: "true" },
        ],
      }),
    );
  } catch (error) {
    if (errorName(error) === "AliasExistsException") throw new CognitoAuthError("user_exists");
    throw toAuthError(error);
  }
}
