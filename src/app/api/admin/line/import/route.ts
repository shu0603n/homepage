import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { importExistingFriends } from "@/lib/admin/line";
import { getAdminSession } from "@/lib/admin/session";
import { isMessagingConfigured, listFollowerIds } from "@/lib/line-messaging";

// 既存の友だちを一覧に取り込む（受信先をこのサイトに切り替える前からの友だち）。1回で 150 人まで、残りがあればもう一度押す
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (!isMessagingConfigured()) return jsonError("LINE との接続が設定されていません（LINE_CHANNEL_ACCESS_TOKEN）。", 501);
  try {
    const result = await importExistingFriends(await listFollowerIds().catch(() => null));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("LINE friend import failed:", error);
    return jsonError("取り込みに失敗しました。時間をおいて再度お試しください。", 500);
  }
}
