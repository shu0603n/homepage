import { NextResponse } from "next/server";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { sendForgotPasswordLink } from "@/lib/auth/password-link";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { reserveSend } from "@/lib/auth/verify-code";
import { isMailConfigured } from "@/lib/mail";

// パスワードをお忘れの方：ご登録のメールアドレスへ「パスワード再設定のご案内」（リンク）を送る。
// スタッフ登録のあとパスワードをまだ設定していない方には、パスワード設定のご案内を送り直す。
// 登録の有無は答えない（どのアドレスでも同じ応答にする）
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);
  if (!isMailConfigured()) return jsonError("ただいまメールを送信できません。お手数ですが、お電話にてお問い合わせください。", 500);

  // 送信回数の制限は、登録の有無にかかわらずすべてのアドレスに同じようにかける（制限の有無から登録が分からないように）
  const limited = reserveSend(email);
  if (limited) return jsonError(limited, 429);

  try {
    await sendForgotPasswordLink(request, email);
  } catch (error) {
    console.error("forgot password mail failed:", error);
    return jsonError(AUTH_MESSAGES.unknown, 500);
  }
  return NextResponse.json({ ok: true });
}
