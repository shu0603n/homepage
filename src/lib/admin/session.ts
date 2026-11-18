import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { findAdminById } from "@/lib/admin/store";

// 管理ページのログイン状態。スタッフのログイン（emoris_session）とは別の Cookie・別の用途（aud=admin）にして、
// スタッフのログイン状態では管理ページに入れないようにする。
//   - 有効期限は 8 時間（1 日の勤務の間）
//   - パスワードを変えると、それより前に発行したログイン状態はすべて使えなくなる（pwd に変更日時を入れて照合）
//   - SameSite=Strict：他のサイトから管理ページの操作を送らせない
export const ADMIN_COOKIE = "emoris_admin";
const HOURS = 8;
const AUDIENCE = "emoris-admin";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export type AdminSession = { id: number; email: string; name: string | null; weak: boolean };

export async function createAdminSession(admin: { id: number; email: string; pwd_version: number }, weak: boolean): Promise<void> {
  const token = await new SignJWT({ email: admin.email, pwd: admin.pwd_version, weak })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${HOURS}h`)
    .sign(secretKey());
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: HOURS * 60 * 60,
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
    return { id, email: admin.email, name: admin.name, weak: payload.weak === true };
  } catch {
    return null;
  }
}
