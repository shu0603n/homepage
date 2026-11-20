import { jwtVerify, SignJWT } from "jose";

// Google と連携するときの「行って帰ってくる」までの合言葉（10分だけ有効）。
// Google から戻ってくるときは、管理画面のログイン Cookie（SameSite=Strict）が送られないため、
// 連携を始めた管理者と戻り先を、この署名つき Cookie で覚えておく
export const GOOGLE_STATE_COOKIE = "emoris_google_state";
const secret = () => new TextEncoder().encode(`${process.env.JWT_SECRET ?? ""}:google-state`);

export async function makeState(p: { nonce: string; adminId: number; back: string }) {
  return new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(secret());
}

export async function readState(token: string | undefined): Promise<{ nonce: string; adminId: number; back: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.nonce !== "string" || typeof payload.adminId !== "number" || typeof payload.back !== "string") return null;
    return { nonce: payload.nonce, adminId: payload.adminId, back: payload.back };
  } catch {
    return null;
  }
}
