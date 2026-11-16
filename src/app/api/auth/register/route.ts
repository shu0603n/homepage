import { NextResponse } from "next/server";
import { CognitoAuthError, userExists } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { createPasswordLink, sendPasswordLinkMail } from "@/lib/auth/password-link";
import { createStaff, deleteStaff, findStaffByMail } from "@/lib/auth/staff";
import { parseRegistration } from "@/lib/auth/validation";
import { reserveSend } from "@/lib/auth/verify-code";
import { isMailConfigured } from "@/lib/mail";

// スタッフ登録（1/2）：入力内容を DB の staff に保存し、入力されたメールアドレス宛に「パスワード設定リンク」を送る。
// ログイン用アカウントは、リンクを開いてパスワードを決めたときに作る（register/password/route.ts）。
// メールアドレスが本人のものと確認できるまで、ログインはできない
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const parsed = parseRegistration(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.message, 400);
  const { input } = parsed;
  if (!isMailConfigured()) return jsonError("ただいま登録を受け付けられません。お手数ですが、お電話にてお問い合わせください。", 500);

  let createdStaffId: number | null = null;
  try {
    // 登録済み（ログイン用アカウントとスタッフ情報の両方がある）なら、ログインへ案内する
    if ((await userExists(input.mail)) && (await findStaffByMail(input.mail))) {
      return jsonError("このメールアドレスは既に登録されています。ログイン画面からログインしてください（パスワードをお忘れの場合は「パスワードをお忘れの方」から再設定できます）。", 409);
    }
    const limited = reserveSend(input.mail);
    if (limited) return jsonError(limited, 429);

    // next-app の登録フォームと同じく、メールが重複していても毎回新しいスタッフ行を作る（重複の整理は社内システム側で行う）
    const staffId = await createStaff(input);
    createdStaffId = staffId;
    await sendPasswordLinkMail(input.mail, input.name ?? null, await createPasswordLink(request, staffId, input.mail));
    return NextResponse.json({ ok: true });
  } catch (error) {
    // 案内メールを送れなかったときは、今回作ったスタッフ情報も取り消す（登録をやり直せるように）
    if (createdStaffId !== null) await deleteStaff(createdStaffId).catch((e) => console.error("rollback failed:", e));
    if (error instanceof CognitoAuthError) return jsonError(AUTH_MESSAGES[error.code], 500);
    console.error("register failed:", error);
    return jsonError("登録に失敗しました。メールアドレスをご確認のうえ、時間をおいて再度お試しください。", 500);
  }
}
