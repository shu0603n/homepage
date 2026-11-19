import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

// 「LINE ではログインできたが、連携しているスタッフが見つからなかった」人を、
// 続けてメールアドレスとパスワードでログインしたときに、その LINE と自動で連携する。
//
//   1. LINE ログイン（LIFF・Web のどちらでも）で LINE が本人確認した userId を、署名つきの Cookie に10分だけ覚えておく
//   2. その間にメールアドレスとパスワードでログインに成功したら、そのスタッフの staff.line_user_id に書き込む
//   3. 次からは LINE の自動ログインでそのまま入れる
//
// 書き込むのは次のときだけ（next-app の line-link-manual と同じ考え方）：
//   - そのスタッフがまだ LINE と連携していない（別の LINE と連携済みなら上書きしない）
//   - その LINE がほかのスタッフと連携されていない
// Cookie の userId は LINE が検証した値だけを入れ、サイトの秘密鍵で署名するので、利用者が書き換えることはできない

export const LINE_PENDING_COOKIE = "emoris_line_pending";
const MAX_AGE = 10 * 60;
const AUDIENCE = "emoris-line-pending";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export const LINE_PENDING_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

export async function makeLinePendingToken(lineUserId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(lineUserId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function readLinePendingToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: AUDIENCE });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export type LineLinkResult = "linked" | "already" | "other_line" | "taken";

// スタッフに LINE を連携する。
//   linked     いま連携した
//   already    もともとこの LINE と連携済み
//   other_line このスタッフは別の LINE と連携済み（上書きしない）
//   taken      この LINE はほかのスタッフと連携済み
export async function linkStaffLine(staffId: number, lineUserId: string): Promise<LineLinkResult> {
  const holder = await prisma.staff.findFirst({ where: { line_user_id: lineUserId }, select: { id: true } });
  if (holder) return holder.id === staffId ? "already" : "taken";
  // 「まだ連携していない」ことを条件に書き込む（同時に別の操作で連携された場合に上書きしない）
  const { count } = await prisma.staff.updateMany({
    where: { id: staffId, OR: [{ line_user_id: null }, { line_user_id: "" }] },
    data: { line_user_id: lineUserId, updated_at: new Date() },
  });
  if (count === 0) return "other_line";
  await notifyLineRecruitHub(lineUserId);
  return "linked";
}

// Linext（line-recruit-hub）へ「この LINE がスタッフと連携された」と知らせる（next-app の notifyLineRecruitHub と同じ）。
// Linext がその友だちのプロフィールを取り込み直す。環境変数が未設定なら何もしない。失敗しても連携自体は成立させる
async function notifyLineRecruitHub(lineUserId: string): Promise<void> {
  const baseUrl = process.env.LINE_RECRUIT_HUB_API_URL;
  const secret = process.env.LINE_RECRUIT_HUB_SYNC_SECRET;
  if (!baseUrl || !secret) return;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/public/next-app/line-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ lineUserId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("line-recruit-hub line-sync failed:", res.status);
  } catch (error) {
    console.error("line-recruit-hub line-sync failed:", error);
  }
}
