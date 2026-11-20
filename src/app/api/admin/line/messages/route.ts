import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getFriend, recordOutgoing } from "@/lib/admin/line";
import { getAdminSession } from "@/lib/admin/session";
import { isMessagingConfigured, LineSendError, pushLineText } from "@/lib/line-messaging";

// 管理画面の個別チャットから、友だち1人にテキストを送る。{ to: LINE の userId, text }
const MAX = 2000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (!isMessagingConfigured()) return jsonError("LINE との接続が設定されていません（LINE_CHANNEL_ACCESS_TOKEN）。", 501);

  const body = (await readJson(request)) as { to?: unknown; text?: unknown } | null;
  const to = typeof body?.to === "string" ? body.to : "";
  const text = typeof body?.text === "string" ? body.text.replace(/\r\n?/g, "\n").trim() : "";
  if (!/^U[0-9a-f]{32}$/.test(to)) return jsonError("送信先が正しくありません。", 400);
  if (!text) return jsonError("メッセージを入力してください。", 400);
  if ([...text].length > MAX) return jsonError(`メッセージは${MAX}文字までです。`, 400);

  const friend = await getFriend(to);
  if (!friend) return jsonError("この友だちは見つかりません。", 404);
  if (!friend.is_friend) return jsonError("この方は友だちではない（ブロック中）ため、送れません。", 400);

  try {
    await pushLineText(to, text);
  } catch (error) {
    console.error("LINE send failed:", error);
    const status = error instanceof LineSendError ? error.status : 0;
    if (status === 429) return jsonError("今月の送信できる通数の上限に達したか、短時間に送りすぎました。時間をおいてお試しください。", 429);
    return jsonError("送信できませんでした。時間をおいて再度お試しください。", 502);
  }
  await recordOutgoing(to, text, session.id).catch((error) => console.error("LINE outgoing record failed:", error));
  return NextResponse.json({ ok: true });
}
