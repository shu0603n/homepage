import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// 管理ページのパスワード。そのままは保存せず、scrypt（総当たりに時間がかかる方式）でハッシュにして保存する。
// 形式：scrypt$N$r$p$<salt(base64)>$<hash(base64)>
const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// 登録されていないメールアドレスでも、同じくらいの時間をかけて答える（時間差から登録の有無を推測させない）
let dummy: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(password, await dummy);
}

// 新しいパスワードの条件：12文字以上、英大文字・英小文字・数字を含む、メールアドレスと同じでない
export const ADMIN_PASSWORD_MIN = 12;
export function adminPasswordProblem(password: unknown, email: string): string | null {
  if (typeof password !== "string" || password.length < ADMIN_PASSWORD_MIN || password.length > 200) return `パスワードは${ADMIN_PASSWORD_MIN}文字以上で入力してください。`;
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return "パスワードは英大文字・英小文字・数字を含めてください。";
  if (password.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "メールアドレスを含まないパスワードにしてください。";
  return null;
}

// 今のパスワードが弱い（最初に設定した仮のパスワードのまま等）かどうか。弱ければ管理ページに注意を出す
export function isWeakPassword(password: string, email: string): boolean {
  return adminPasswordProblem(password, email) !== null;
}
