import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { readAdminSetupToken } from "@/lib/admin/invite";
import { adminPasswordProblem, hashPassword } from "@/lib/admin/password";
import { createAdminSession } from "@/lib/admin/session";
import { updateAdminPassword } from "@/lib/admin/store";

// ご案内メールのリンクから開いた画面で、パスワードを決める（決めたらそのままログイン状態にする）
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const body = (await readJson(request)) as { token?: unknown; password?: unknown } | null;
  const admin = await readAdminSetupToken(typeof body?.token === "string" ? body.token : undefined).catch(() => null);
  if (!admin) return jsonError("リンクの有効期限が切れているか、既に使われています。ほかの管理者に、ご案内メールの再送を頼んでください。", 400);
  const problem = adminPasswordProblem(body?.password, admin.email);
  if (problem) return jsonError(problem, 400);

  try {
    const changedAt = await updateAdminPassword(admin.id, await hashPassword(body?.password as string));
    await createAdminSession({ id: admin.id, email: admin.email, pwd_version: changedAt }, false);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin setup failed:", error);
    return jsonError("パスワードの設定に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
