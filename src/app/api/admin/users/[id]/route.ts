import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { createAdminSetupLink, sendAdminSetupMail } from "@/lib/admin/invite";
import { getAdminSession } from "@/lib/admin/session";
import { countAdmins, deleteAdmin, findAdminById, NO_PASSWORD } from "@/lib/admin/store";

async function target(request: Request, params: Promise<{ id: string }>) {
  if (!isSameOrigin(request)) return { error: jsonError("不正なリクエストです。", 403) };
  const session = await getAdminSession();
  if (!session) return { error: jsonError("ログインが必要です。", 401) };
  const id = Number((await params).id);
  const admin = Number.isInteger(id) && id > 0 ? await findAdminById(id) : null;
  if (!admin) return { error: jsonError("管理者が見つかりません。", 404) };
  return { session, admin };
}

// パスワード設定（再設定）のご案内メールを送る。まだ設定していない人には最初のご案内、設定済みの人には再設定のご案内
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await target(request, params);
  if ("error" in t) return t.error;
  try {
    const me = await findAdminById(t.session.id);
    const kind = t.admin.password_hash === NO_PASSWORD ? "invite" : "reset";
    await sendAdminSetupMail(t.admin.email, t.admin.name, await createAdminSetupLink(request, t.admin), kind, me?.name || t.session.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin invite resend failed:", error);
    return jsonError("メールの送信に失敗しました。", 500);
  }
}

// 管理者を削除する。自分自身と、最後の 1 人は削除できない
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await target(request, params);
  if ("error" in t) return t.error;
  if (t.admin.id === t.session.id) return jsonError("自分自身は削除できません。", 400);
  try {
    if ((await countAdmins()) <= 1) return jsonError("最後の 1 人は削除できません。", 400);
    await deleteAdmin(t.admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin delete failed:", error);
    return jsonError("削除に失敗しました。", 500);
  }
}
