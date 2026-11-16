import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { findStaffById, isLoginBlocked } from "@/lib/auth/staff";

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

// Cookie の署名が正しく、かつ紐づくスタッフがまだ存在して有効な場合だけセッションとして扱う。
// スタッフを社内システムで削除・NG/BL にしたら、発行済みのログイン状態もすぐ使えなくなる。
//
// スタッフ ID だけで判断してはいけない：社内システムのスタッフ ID は「現在の最大 + 1」で採番されるため、
// 最後に登録されたスタッフを削除すると、次に登録された別人に同じ ID が付く。ID だけで見ると、
// 削除前からログインしていた人が、その別人のマイページ（個人情報）を見られてしまう。
// そのため「ログインしたときと同じ本人か」（メールアドレス、LINE ログインなら LINE の userId）も確かめる
export async function getSession(): Promise<Session | null> {
  const session = await readSessionCookie();
  if (!session || session.staffId === null) return null;
  try {
    const staff = await findStaffById(session.staffId);
    if (!staff || isLoginBlocked(staff)) return null;
    return isSamePerson(session, staff) ? session : null;
  } catch (error) {
    console.error("session staff check failed:", error);
    return null;
  }
}

function isSamePerson(session: Session, staff: { mail: string | null; line_user_id: string | null }): boolean {
  if (session.via === "line") return Boolean(staff.line_user_id) && staff.line_user_id === session.sub;
  const mail = staff.mail?.trim().toLowerCase();
  return Boolean(mail) && mail === session.email?.trim().toLowerCase();
}

async function readSessionCookie(): Promise<Session | null> {
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
