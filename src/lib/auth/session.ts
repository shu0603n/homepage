import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

// ログイン状態は「署名つきの Cookie（JWT）」で保持する。
// Cognito でも LINE でも、ログインに成功したら同じ形のセッションを作るので、画面側はログイン方法を意識しなくてよい。
// LINE アプリ内ブラウザでも Cookie が使われるため、一度ログインすれば期限内は保持される。

export const SESSION_COOKIE = "emoris_session";
const SESSION_DAYS = 30;

export type LoginMethod = "cognito" | "line";

export type Session = {
  sub: string; // Cognito の sub、または LINE の userId
  email: string | null;
  staffId: number | null;
  via: LoginMethod;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ email: session.email, staffId: session.staffId, via: session.via })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      staffId: typeof payload.staffId === "number" ? payload.staffId : null,
      via: payload.via === "line" ? "line" : "cognito",
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
