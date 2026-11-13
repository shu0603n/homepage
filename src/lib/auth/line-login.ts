import { jwtVerify, SignJWT } from "jose";

// ログイン画面の「LINE でログイン」（LINE ログインの Web ログイン。PC・スマホのどのブラウザでも使える）。
// LINE Developers のプロバイダ「社内案件通知BOT」の LINE ログインチャネル「スタッフ連携」を使う。
// 公式アカウント・Linext と同じプロバイダなので、LINE の userId は staff.line_user_id と一致する。
//
// 有効にするには：
//   1. 「スタッフ連携」チャネルの「LINEログイン設定」>「コールバックURL」に
//      <サイトの URL>/api/auth/line/callback/ を追加する
//   2. 環境変数 LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET に、そのチャネルの ID とシークレットを入れる
// 未設定のあいだはボタンを出さない。

const AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export const LINE_STATE_COOKIE = "emoris_line_state";
export const LINE_STATE_MAX_AGE = 10 * 60; // LINE の同意画面を往復するあいだだけ有効（10分）

function credentials() {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  return channelId && channelSecret ? { channelId, channelSecret } : null;
}

export function isLineWebLoginEnabled(): boolean {
  return credentials() !== null;
}

// サイト内の URL を、公開 URL（NEXT_PUBLIC_APP_URL。未設定ならリクエストの URL）を基準に作る
export function siteUrl(path: string, request: Request): URL {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin);
}

// コールバック URL。LINE 側に登録した URL と一字一句同じである必要がある
export function lineCallbackUrl(request: Request): string {
  return siteUrl("/api/auth/line/callback/", request).toString();
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Buffer.from(bytes).toString("base64url");
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

type LineState = { state: string; nonce: string; next: string };

// LINE へ移動する URL と、戻ってきたときに照合する値（Cookie に入れる署名つきトークン）を作る。
// state は他サイトから仕組まれたログイン（CSRF）を、nonce は ID トークンの使い回しを防ぐ
export async function startLineLogin(request: Request, next: string): Promise<{ url: string; cookie: string } | null> {
  const cred = credentials();
  if (!cred) return null;
  const st: LineState = { state: randomToken(), nonce: randomToken(), next };

  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: cred.channelId,
    redirect_uri: lineCallbackUrl(request),
    state: st.state,
    nonce: st.nonce,
    scope: "openid profile",
  }).toString();

  const cookie = await new SignJWT(st)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINE_STATE_MAX_AGE}s`)
    .sign(secretKey());
  return { url: url.toString(), cookie };
}

export async function readLineState(cookie: string | undefined): Promise<LineState | null> {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, secretKey());
    const { state, nonce, next } = payload as Partial<LineState>;
    return typeof state === "string" && typeof nonce === "string" && typeof next === "string" ? { state, nonce, next } : null;
  } catch {
    return null;
  }
}

// LINE から戻ってきた認可コードを ID トークンに交換し、LINE に検証させて userId を返す（失敗なら null）
export async function finishLineLogin(request: Request, code: string, nonce: string): Promise<string | null> {
  const cred = credentials();
  if (!cred) return null;

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: lineCallbackUrl(request),
      client_id: cred.channelId,
      client_secret: cred.channelSecret,
    }),
  });
  if (!tokenRes.ok) {
    console.error("LINE token exchange failed:", tokenRes.status, await tokenRes.text().catch(() => ""));
    return null;
  }
  const { id_token: idToken } = (await tokenRes.json()) as { id_token?: string };
  if (!idToken) return null;

  const verifyRes = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: cred.channelId, nonce }),
  });
  if (!verifyRes.ok) {
    console.error("LINE id_token verify failed:", verifyRes.status, await verifyRes.text().catch(() => ""));
    return null;
  }
  const verified = (await verifyRes.json()) as { aud?: string; sub?: string; nonce?: string };
  return verified.aud === cred.channelId && verified.nonce === nonce && verified.sub ? verified.sub : null;
}
