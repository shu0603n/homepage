import { NextResponse } from "next/server";
import { CognitoAuthError, startPasswordReset } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { resendPasswordLinkIfPending } from "@/lib/auth/password-link";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";

// パスワードリセット（1/2）：登録メールアドレスへ確認コードを送る。登録の有無は答えない。
// スタッフ登録のあとパスワードをまだ設定していない方（ログイン用アカウントがない）には、パスワード設定リンクを送り直す
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);

  try {
    const pending = await resendPasswordLinkIfPending(request, email);
    if (typeof pending === "object") return jsonError(pending.limited, 429);
    if (pending === "sent") return NextResponse.json({ ok: true, kind: "link" });
  } catch (error) {
    console.error("password link resend failed:", error);
    return jsonError(AUTH_MESSAGES.unknown, 500);
  }

  try {
    await startPasswordReset(email);
  } catch (error) {
    const code = error instanceof CognitoAuthError ? error.code : "unknown";
    if (code === "too_many_requests") return jsonError(AUTH_MESSAGES[code], 429);
    if (code === "unknown") return jsonError(AUTH_MESSAGES.unknown, 500);
    // 未登録のアドレスでも成功と同じ応答にする
  }
  return NextResponse.json({ ok: true });
}
