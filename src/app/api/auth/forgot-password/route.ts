import { NextResponse } from "next/server";
import { CognitoAuthError, startPasswordReset } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";

// パスワードリセット（1/2）：登録メールアドレスへ確認コードを送る。登録の有無は答えない
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);

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
