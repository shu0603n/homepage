import { jwtVerify, SignJWT } from "jose";

// スタッフ登録後の「LINE 公式アカウントの友だち追加」と、スタッフ登録との LINE 連携。
//
// ホームページだけで完結させる（Linext は経由しない）：
//   1. ボタンのリンク先は、このサイトの /jobs/line-link/?t=…（t は「どのスタッフか」を署名した、24時間有効の引換券）
//   2. そのページで LINE ログイン（LIFF。LINE アプリ内でも、普通のブラウザでも動く）をして、本人の LINE userId を確かめる
//   3. /api/auth/line/link/ が、引換券のスタッフの staff.line_user_id に書き込む（next-app と同じスタッフ表）
//   4. LINE 公式アカウントの友だち追加画面へ移る
// 書き込むのは、そのスタッフがまだ LINE と連携しておらず、その LINE がほかのスタッフに使われていないときだけ（lib/auth/line-pending.ts の linkStaffLine）。
//
// LIFF（NEXT_PUBLIC_LIFF_ID）が未設定のときだけ、以前と同じ Linext のトラッキングリンクを使う。

const LINK_HOURS = 24;
const PURPOSE = "line-link";

// LINE 公式アカウントの友だち追加 URL（LINE_FRIEND_ADD_URL で差し替え可）
export const LINE_FRIEND_ADD_URL = process.env.LINE_FRIEND_ADD_URL || "https://lin.ee/7iAkvgb";

// LIFF が使えないときの予備（以前の Linext のトラッキングリンク）
const FALLBACK_TRACK_URL = { web: "https://line-recruit-hub.vercel.app/track/27dc72af", visit: "https://line-recruit-hub.vercel.app/track/2b1c82c3" };

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export type LineLinkTicket = { staffId: number; mail: string };

// サーバー側でだけ呼ぶこと（スタッフはログイン中の本人のセッション、または今登録したスタッフから渡す）
export async function lineFriendUrl(staffId: number, mail: string | null, source: "web" | "visit" = "web"): Promise<string> {
  if (!process.env.NEXT_PUBLIC_LIFF_ID || !mail) {
    const url = new URL(FALLBACK_TRACK_URL[source]);
    url.searchParams.set("externalRef", String(staffId));
    return url.toString();
  }
  const token = await new SignJWT({ purpose: PURPOSE, staffId, mail: mail.trim().toLowerCase(), source })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINK_HOURS}h`)
    .sign(secretKey());
  return `/jobs/line-link/?t=${encodeURIComponent(token)}`; // このサイト内のページ
}

export async function readLineLinkTicket(token: unknown): Promise<LineLinkTicket | null> {
  if (typeof token !== "string" || !token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== PURPOSE || typeof payload.staffId !== "number" || typeof payload.mail !== "string") return null;
    return { staffId: payload.staffId, mail: payload.mail };
  } catch {
    return null;
  }
}
