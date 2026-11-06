import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

// メールアドレス変更の確認コード。
// 確認コードそのものは保存せず、「署名つきの Cookie（コードのハッシュ・新しいメール・スタッフ ID・有効期限）」と
// 新しいメール宛に送ったコードを突き合わせる。サーバー側に状態（DB のテーブル）を持たない。

export const EMAIL_CHANGE_COOKIE = "emoris_email_change";
const CODE_MINUTES = 15;

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET が設定されていません");
  return value;
}

function hashCode(staffId: number, newEmail: string, code: string): string {
  return createHmac("sha256", secret()).update(`${staffId}:${newEmail}:${code}`).digest("hex");
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function startEmailChange(staffId: number, newEmail: string, code: string): Promise<void> {
  const token = await new SignJWT({ staffId, newEmail, hash: hashCode(staffId, newEmail, code) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CODE_MINUTES}m`)
    .sign(new TextEncoder().encode(secret()));
  const store = await cookies();
  store.set(EMAIL_CHANGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CODE_MINUTES * 60,
  });
}

// コードが正しければ、変更先のメールアドレスを返す（別のスタッフのコードや期限切れ・誤りは null）
export async function checkEmailChange(staffId: number, code: string): Promise<string | null> {
  const store = await cookies();
  const token = store.get(EMAIL_CHANGE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret()));
    if (payload.staffId !== staffId || typeof payload.newEmail !== "string" || typeof payload.hash !== "string") return null;
    const expected = Buffer.from(payload.hash, "hex");
    const actual = Buffer.from(hashCode(staffId, payload.newEmail, code), "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? payload.newEmail : null;
  } catch {
    return null;
  }
}

export async function clearEmailChange(): Promise<void> {
  const store = await cookies();
  store.delete(EMAIL_CHANGE_COOKIE);
}
