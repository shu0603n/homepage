import { NextResponse } from "next/server";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { sendActivationLink } from "@/lib/auth/password-link";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { reserveSend } from "@/lib/auth/verify-code";
import { isMailConfigured } from "@/lib/mail";

// 既に登録済みのスタッフ向け「パスワード設定のご案内」：ご登録のメールアドレスへ、パスワード設定リンクを送る。
// 登録の有無は答えない（どのアドレスでも同じ応答にする）
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);
  if (!isMailConfigured()) return jsonError("ただいまメールを送信できません。お手数ですが、お電話にてお問い合わせください。", 500);

  const limited = reserveSend(email);
  if (limited) return jsonError(limited, 429);

  try {
    await sendActivationLink(request, email);
  } catch (error) {
    console.error("activation mail failed:", error);
    return jsonError(AUTH_MESSAGES.unknown, 500);
  }
  return NextResponse.json({ ok: true });
}
