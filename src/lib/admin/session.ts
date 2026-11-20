import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { findAdminById, type AdminRole } from "@/lib/admin/store";

// 管理ページのログイン状態。スタッフのログイン（emoris_session）とは別の Cookie・別の用途（aud=admin）にして、
// スタッフのログイン状態では管理ページに入れないようにする。
//   - 有効期限は 30 日。管理ページを開くたびに（前回の延長から半日以上たっていれば）そこから 30 日に延ばす（/api/admin/refresh/）。
//     毎日使っていれば、ログインし直さなくてよい。30 日使わなければ切れる
//   - パスワードを変えると、それより前に発行したログイン状態はすべて使えなくなる（pwd に変更日時を入れて照合）
//   - SameSite=Strict：他のサイトから管理ページの操作を送らせない
export const ADMIN_COOKIE = "emoris_admin";
const DAYS = 30;
const RENEW_AFTER_MS = 12 * 60 * 60 * 1000; // 前回の発行から半日たったら延長する（毎回 Cookie を書き換えないため）
const AUDIENCE = "emoris-admin";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export type AdminSession = { id: number; email: string; name: string | null; role: AdminRole; avatarVersion: number | null; weak: boolean; issuedAt: number; pwdVersion: number };

export async function createAdminSession(admin: { id: number; email: string; pwd_version: number }, weak: boolean): Promise<void> {
  const token = await new SignJWT({ email: admin.email, pwd: admin.pwd_version, weak })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secretKey());
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DAYS * 24 * 60 * 60,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

// Cookie の署名・期限が正しく、その管理者がまだいて、パスワードがログイン後に変わっていなければ有効
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: AUDIENCE });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || typeof payload.pwd !== "number") return null;
    const admin = await findAdminById(id);
    if (!admin || admin.pwd_version !== payload.pwd) return null;
    return { id, email: admin.email, name: admin.name, role: admin.role, avatarVersion: admin.avatar_version, weak: payload.weak === true, issuedAt: (payload.iat ?? 0) * 1000, pwdVersion: payload.pwd };
  } catch {
    return null;
  }
}

// ログイン状態の延長（Route Handler からだけ呼ぶ。Cookie を書き換えるため）。
// 有効なログイン状態で、前回の発行から半日以上たっていれば、今から 30 日に延ばす。延ばしたら true
export async function renewAdminSession(): Promise<boolean> {
  const session = await getAdminSession();
  if (!session || Date.now() - session.issuedAt < RENEW_AFTER_MS) return false;
  await createAdminSession({ id: session.id, email: session.email, pwd_version: session.pwdVersion }, session.weak);
  return true;
}
