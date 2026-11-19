import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

// メールで送る6桁の確認コード（メールアドレス変更と、LINE から来た方のパスワード設定で使う。送信回数の制限はスタッフ登録のご案内メールでも使う）。
// コードそのものは保存せず、「署名つきの Cookie（コードのハッシュ・対象・有効期限）」と、メールで送ったコードを突き合わせる。
//
// 総当たり対策：
//   - 間違えるたびに回数を数え、MAX_ATTEMPTS 回間違えたらそのコードは使えなくする（コードの送り直しが必要）
//   - 回数はサーバーのメモリと Cookie の両方で数える（古い Cookie を使い回しても、メモリ側の回数で止まる）
// 送信回数の制限：同じメールアドレスへの送信は RESEND_INTERVAL 秒に1回・1時間に MAX_SENDS_PER_HOUR 回まで
// ※ メモリ上の回数はサーバーのインスタンスごと（再起動で消える）。DB にテーブルを増やさずにできる範囲の対策

export type VerifyPurpose = "email-change" | "line-setup";

const COOKIE_NAME: Record<VerifyPurpose, string> = { "email-change": "emoris_email_change", "line-setup": "emoris_line_setup" };
const CODE_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_INTERVAL = 60;
const MAX_SENDS_PER_HOUR = 5;

const failures = new Map<string, { count: number; expires: number }>();
const sends = new Map<string, number[]>();

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET が設定されていません");
  return value;
}

function hashCode(purpose: VerifyPurpose, target: string, code: string): string {
  return createHmac("sha256", secret()).update(`${purpose}:${target}:${code}`).digest("hex");
}

function prune(now: number) {
  for (const [k, v] of failures) if (v.expires < now) failures.delete(k);
  for (const [k, v] of sends) if (v.every((t) => now - t > 3600_000)) sends.delete(k);
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// 送信してよいか（短時間に何度も送らせない）。送ってよければ記録して null、だめなら画面に出すメッセージを返す
export function reserveSend(email: string): string | null {
  const now = Date.now();
  prune(now);
  const key = email.toLowerCase();
  const recent = (sends.get(key) ?? []).filter((t) => now - t < 3600_000);
  const last = recent[recent.length - 1];
  if (last !== undefined && now - last < RESEND_INTERVAL * 1000) {
    return `メールは送信済みです。届かない場合は、迷惑メールフォルダもご確認のうえ、${RESEND_INTERVAL}秒ほど待ってから送り直してください。`;
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) return "メールの送信回数が上限に達しました。しばらく時間をおいてからお試しください。";
  sends.set(key, [...recent, now]);
  return null;
}

async function setCookie(purpose: VerifyPurpose, payload: { target: string; hash: string; jti: string; n: number }, expiresAt: number) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(new TextEncoder().encode(secret()));
  const store = await cookies();
  store.set(COOKIE_NAME[purpose], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)),
  });
}

// コードを発行して Cookie に記録する。target は「何に対するコードか」（登録ならメールアドレス、変更なら staffId:新メール）
export async function startVerification(purpose: VerifyPurpose, target: string, code: string): Promise<void> {
  await setCookie(purpose, { target, hash: hashCode(purpose, target, code), jti: randomUUID(), n: 0 }, Date.now() + CODE_MINUTES * 60_000);
}

export type VerifyResult = { ok: true; target: string } | { ok: false; reason: "missing" | "invalid" | "locked" };

export const VERIFY_MESSAGES: Record<Exclude<VerifyResult, { ok: true }>["reason"], string> = {
  missing: "確認コードの有効期限が切れています。もう一度コードを送信してください。",
  invalid: "確認コードが正しくありません。",
  locked: "確認コードを続けて間違えたため、このコードは使えなくなりました。もう一度コードを送信してください。",
};

export async function checkVerification(purpose: VerifyPurpose, code: string): Promise<VerifyResult> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME[purpose])?.value;
  if (!token) return { ok: false, reason: "missing" };

  let payload: { target?: unknown; hash?: unknown; jti?: unknown; n?: unknown; exp?: number };
  try {
    payload = (await jwtVerify(token, new TextEncoder().encode(secret()))).payload;
  } catch {
    return { ok: false, reason: "missing" };
  }
  const { target, hash, jti } = payload;
  if (typeof target !== "string" || typeof hash !== "string" || typeof jti !== "string" || !payload.exp) return { ok: false, reason: "missing" };

  const now = Date.now();
  prune(now);
  const expiresAt = payload.exp * 1000;
  const used = Math.max(typeof payload.n === "number" ? payload.n : 0, failures.get(jti)?.count ?? 0);
  if (used >= MAX_ATTEMPTS) {
    store.delete(COOKIE_NAME[purpose]);
    return { ok: false, reason: "locked" };
  }

  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(hashCode(purpose, target, code), "hex");
  if (expected.length === actual.length && timingSafeEqual(expected, actual)) return { ok: true, target };

  const count = used + 1;
  failures.set(jti, { count, expires: expiresAt });
  if (count >= MAX_ATTEMPTS) {
    store.delete(COOKIE_NAME[purpose]);
    return { ok: false, reason: "locked" };
  }
  await setCookie(purpose, { target, hash, jti, n: count }, expiresAt);
  return { ok: false, reason: "invalid" };
}

export async function clearVerification(purpose: VerifyPurpose): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME[purpose]);
}
