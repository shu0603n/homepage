import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { checkBlockedFriends } from "@/lib/admin/line";
import { jsonError } from "@/lib/auth/http";
import { isMessagingConfigured } from "@/lib/line-messaging";

// 「ブロック状況を確認」（POST { after?: 前回の続き }）。仕組みは lib/admin/line.ts の checkBlockedFriends
export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  if (!isMessagingConfigured()) return jsonError("LINE との接続が設定されていません（LINE_CHANNEL_ACCESS_TOKEN）。", 501);
  const after = typeof r.body.after === "string" && /^U[0-9a-f]{32}$/.test(r.body.after) ? r.body.after : null;
  try {
    return NextResponse.json({ ok: true, ...(await checkBlockedFriends(after)) });
  } catch (error) {
    console.error("LINE block check failed:", error);
    return jsonError("確認に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
