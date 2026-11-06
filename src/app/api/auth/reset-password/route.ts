import { NextResponse } from "next/server";
import { CognitoAuthError, confirmPasswordReset } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isAcceptablePassword, isEmail, normalizeEmail, PASSWORD_MIN_LENGTH } from "@/lib/auth/validation";

// パスワードリセット（2/2）：確認コードと新しいパスワードで更新する
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { email?: unknown; code?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!isEmail(email) || !code) return jsonError("メールアドレスと確認コードを入力してください。", 400);
  if (!isAcceptablePassword(body?.password)) return jsonError(`パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`, 400);

  try {
    await confirmPasswordReset(email, code, body.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorCode = error instanceof CognitoAuthError ? error.code : "unknown";
    // 未登録アドレスでも「コードが違う」と同じ表示にする
    const shown = errorCode === "user_not_found" ? "invalid_code" : errorCode;
    const status = shown === "unknown" ? 500 : shown === "too_many_requests" ? 429 : 400;
    return jsonError(AUTH_MESSAGES[shown], status);
  }
}
