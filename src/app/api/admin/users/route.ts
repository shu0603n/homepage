import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { createAdminSetupLink, sendAdminSetupMail } from "@/lib/admin/invite";
import { getAdminSession } from "@/lib/admin/session";
import { deleteAdmin, findAdminById, insertAdmin } from "@/lib/admin/store";
import { isMailConfigured } from "@/lib/mail";

// 管理者の追加。追加した人に「パスワード設定のご案内」メールを送り、本人がリンクからパスワードを決める
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);

  const body = (await readJson(request)) as { email?: unknown; name?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  if (!name) return jsonError("お名前を入力してください。", 400);
  if (!isEmail(email)) return jsonError("正しいメールアドレスを入力してください。", 400);
  if (!isMailConfigured()) return jsonError("メールを送信できない設定になっています。", 500);

  try {
    const admin = await insertAdmin(email, name, session.id);
    if (!admin) return jsonError("このメールアドレスは既に追加されています。", 409);
    try {
      const me = await findAdminById(session.id);
      await sendAdminSetupMail(email, name, await createAdminSetupLink(request, admin), "invite", me?.name || session.email);
    } catch (error) {
      await deleteAdmin(admin.id).catch(() => {}); // メールを送れなければ、追加も取り消す（やり直せるように）
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin add failed:", error);
    return jsonError("追加に失敗しました。メールアドレスをご確認のうえ、もう一度お試しください。", 500);
  }
}
