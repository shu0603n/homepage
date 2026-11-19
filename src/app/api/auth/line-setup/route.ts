import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { LINE_PENDING_COOKIE, readLinePending } from "@/lib/auth/line-pending";
import { sendLineSetupLink } from "@/lib/auth/password-link";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { reserveSend } from "@/lib/auth/verify-code";
import { isMailConfigured } from "@/lib/mail";

// LINE から来て、まだ連携していない方のパスワード設定（1/2）：ご登録のメールアドレスへパスワード設定リンクを送る。
// リンクには、LINE が本人確認した LINE（userId・表示名）を署名して入れる。続きは /password-setup/line/ と ./finish/。
// 登録の有無は答えない（どのアドレスでも同じ応答にする）
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const line = await readLinePending((await cookies()).get(LINE_PENDING_COOKIE)?.value);
  if (!line) return jsonError("時間が経ったため、手続きを続けられません。お手数ですが、LINE のメニューからもう一度開いてください。", 400);

  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);
  if (!isMailConfigured()) return jsonError("ただいまメールを送信できません。お手数ですが、お電話にてお問い合わせください。", 500);

  const limited = reserveSend(email);
  if (limited) return jsonError(limited, 429);

  try {
    await sendLineSetupLink(request, email, { lineUserId: line.lineUserId, lineName: line.name });
  } catch (error) {
    console.error("line setup mail failed:", error);
    return jsonError(AUTH_MESSAGES.unknown, 500);
  }
  return NextResponse.json({ ok: true });
}
