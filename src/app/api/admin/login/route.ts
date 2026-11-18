import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { burnPasswordCheck, hashPassword, isWeakPassword, verifyPassword } from "@/lib/admin/password";
import { createAdminSession } from "@/lib/admin/session";
import { countAdmins, findAdminByEmail, insertFirstAdmin, recordLoginFailure, recordLoginSuccess } from "@/lib/admin/store";

// 管理ページのログイン。
// 総当たり対策：同じアカウントで 5 回続けて間違えると 15 分ロック。同じ接続元からは 15 分に 20 回まで。
// どの失敗も同じメッセージにする（登録されているメールアドレスかどうかを分からせない）
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const IP_LIMIT = 20;
const IP_WINDOW = 15 * 60_000;
const ipAttempts = new Map<string, number[]>();
const FAIL = "メールアドレスまたはパスワードが正しくありません。";

function tooManyFromIp(request: Request): boolean {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (ipAttempts.get(ip) ?? []).filter((t) => now - t < IP_WINDOW);
  recent.push(now);
  ipAttempts.set(ip, recent);
  if (ipAttempts.size > 5000) ipAttempts.clear();
  return recent.length > IP_LIMIT;
}

// 最初の管理者（表が空のとき）を、環境変数 ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD（と、あれば ADMIN_INITIAL_NAME）から作る。
// パスワードをプログラムに書かないのは、このリポジトリが公開されているため
async function seedFirstAdmin(): Promise<void> {
  const email = normalizeEmail(process.env.ADMIN_INITIAL_EMAIL);
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!isEmail(email) || !password) return;
  if ((await countAdmins()) > 0) return;
  await insertFirstAdmin(email, await hashPassword(password), process.env.ADMIN_INITIAL_NAME?.trim().slice(0, 100) || null);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  if (tooManyFromIp(request)) return jsonError("試行回数が多すぎます。しばらく時間をおいてからお試しください。", 429);

  const body = (await readJson(request)) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) return jsonError("メールアドレスとパスワードを入力してください。", 400);

  try {
    await seedFirstAdmin();
    const admin = await findAdminByEmail(email);
    if (!admin) {
      await burnPasswordCheck(password);
      return jsonError(FAIL, 401);
    }
    if (admin.locked_until && admin.locked_until.getTime() > Date.now()) {
      return jsonError(`続けて間違えたため、ロックしています。${LOCK_MINUTES}分ほど待ってからお試しください。`, 429);
    }
    if (!(await verifyPassword(password, admin.password_hash))) {
      await recordLoginFailure(admin.id, MAX_FAILURES, LOCK_MINUTES);
      return jsonError(FAIL, 401);
    }
    await recordLoginSuccess(admin.id);
    await createAdminSession(admin, isWeakPassword(password, admin.email));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin login failed:", error);
    return jsonError("ただいまログインできません。時間をおいて再度お試しください。", 500);
  }
}
