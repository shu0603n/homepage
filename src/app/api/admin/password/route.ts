import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { adminPasswordProblem, hashPassword, verifyPassword } from "@/lib/admin/password";
import { createAdminSession, getAdminSession } from "@/lib/admin/session";
import { findAdminById, updateAdminPassword } from "@/lib/admin/store";

// 管理ページのパスワード変更。今のパスワードを確かめてから変える。
// 変えると、ほかの端末のログイン状態は使えなくなり、この端末はそのままログインを続ける
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);

  const body = (await readJson(request)) as { current?: unknown; next?: unknown } | null;
  const current = typeof body?.current === "string" ? body.current : "";
  if (!current) return jsonError("今のパスワードを入力してください。", 400);
  const problem = adminPasswordProblem(body?.next, session.email);
  if (problem) return jsonError(problem, 400);
  const next = body?.next as string;
  if (next === current) return jsonError("今のパスワードと違うものにしてください。", 400);

  try {
    const admin = await findAdminById(session.id);
    if (!admin) return jsonError("ログインが必要です。", 401);
    if (!(await verifyPassword(current, admin.password_hash))) return jsonError("今のパスワードが正しくありません。", 400);
    const changedAt = await updateAdminPassword(admin.id, await hashPassword(next));
    await createAdminSession({ id: admin.id, email: admin.email, pwd_version: changedAt }, false);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin password change failed:", error);
    return jsonError("パスワードの変更に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
