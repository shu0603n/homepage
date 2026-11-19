import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { LINE_PENDING_COOKIE, readLinePendingToken } from "@/lib/auth/line-pending";
import { findStaffByMail, isLoginBlocked } from "@/lib/auth/staff";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { generateCode, reserveSend, startVerification } from "@/lib/auth/verify-code";
import { isMailConfigured, sendMail } from "@/lib/mail";

// LINE から来て、まだ連携していない方のパスワード設定（1/2）：ご登録のメールアドレスへ6桁の確認コードを送る。
// 続きは ./finish/（コードと新しいパスワードを入力 → パスワード設定・LINE 連携・ログイン）。
//
// LINE の画面から出ずに済むよう、メールのリンクではなく確認コードにしている。
// コードは「このブラウザ（LINE が本人確認した LINE）・このスタッフ・このメールアドレス」の組み合わせにだけ有効。
// 登録の有無は答えない（登録がないアドレスでも同じ応答にし、どのコードも通らないようにする）
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const lineUserId = await readLinePendingToken((await cookies()).get(LINE_PENDING_COOKIE)?.value);
  if (!lineUserId) return jsonError("時間が経ったため、手続きを続けられません。お手数ですが、LINE のメニューからもう一度開いてください。", 400);

  const body = (await readJson(request)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);
  if (!isMailConfigured()) return jsonError("ただいまメールを送信できません。お手数ですが、お電話にてお問い合わせください。", 500);

  const limited = reserveSend(email);
  if (limited) return jsonError(limited, 429);

  try {
    const staff = await findStaffByMail(email);
    const code = generateCode();
    if (!staff || isLoginBlocked(staff)) {
      // 登録がない・ログインできない：送ったふりをする（コードは誰にも分からないので、次の画面で必ず「正しくありません」になる）
      await startVerification("line-setup", JSON.stringify({ staffId: 0, mail: email, lineUserId, decoy: randomUUID() }), code);
      return NextResponse.json({ ok: true });
    }
    await startVerification("line-setup", JSON.stringify({ staffId: staff.id, mail: email, lineUserId }), code);
    await sendMail({
      to: email,
      subject: "【株式会社エモリスリンク】パスワード設定の確認コード",
      text: [
        `${staff.name ? `${staff.name} 様` : "ご登録者様"}`,
        "",
        "LINE からのパスワード設定のお手続きを受け付けました。",
        "以下の確認コードを、LINE で開いている画面に入力してください。",
        "",
        `確認コード：${code}`,
        "",
        "有効期限は15分です。",
        "パスワードを設定すると、LINE と連携され、次回から LINE で自動ログインできます。",
        "このメールに心当たりがない場合は、何もせずに破棄してください（パスワードは変わりません）。",
      ].join("\n"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("line setup code failed:", error);
    return jsonError("確認コードの送信に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
