import { NextResponse } from "next/server";
import { recordIncoming, upsertFriend } from "@/lib/admin/line";
import { LINEXT_URL } from "@/lib/admin/linext";
import { verifyLineSignature } from "@/lib/line-messaging";

// LINE 公式アカウントの受信（Webhook）。LINE Developers の「Webhook URL」に https://www.emorislink.co.jp/api/line/webhook/ を設定する
// （末尾の / まで含めること。このサイトは URL の末尾を / にそろえているため、/ がないと転送になり LINE が受け取れない）。
//   1. 署名を確かめる（LINE_CHANNEL_SECRET）
//   2. 受け取った内容を、そのまま Linext にも転送する（移行中も Linext を今まで通り動かすため。署名もそのまま渡すので Linext 側の確認も通る）
//      転送先は LINEXT_WEBHOOK_URL（未設定なら Linext の /api/line/webhook）。LINEXT_WEBHOOK_URL=off で転送を止める
//   3. 友だち追加・ブロック・メッセージを記録する（lib/admin/line.ts）
// LINE には、処理の成否にかかわらず 200 を返す（失敗はログに残す。返さないと LINE が再送を繰り返す）

type LineEvent = {
  type: string;
  webhookEventId?: string;
  timestamp?: number;
  source?: { type?: string; userId?: string };
  message?: { id?: string; type?: string; text?: string };
};

const FORWARD_URL = process.env.LINEXT_WEBHOOK_URL || `${LINEXT_URL}/api/line/webhook`;

async function forwardToLinext(rawBody: string, signature: string): Promise<void> {
  if (FORWARD_URL === "off") return;
  try {
    const res = await fetch(FORWARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Line-Signature": signature },
      body: rawBody,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("LINE webhook forward failed:", res.status);
  } catch (error) {
    console.error("LINE webhook forward failed:", error);
  }
}

async function handle(event: LineEvent): Promise<void> {
  const userId = event.source?.type === "user" ? event.source.userId : undefined;
  if (!userId) return; // グループ・トークルームからのものは扱わない
  if (event.type === "follow") return upsertFriend(userId, { follow: true });
  if (event.type === "unfollow") return upsertFriend(userId, { unfollow: true });
  if (event.type === "message" && event.message?.type) {
    await upsertFriend(userId);
    const type = event.message.type;
    await recordIncoming(
      userId,
      event.webhookEventId ?? `${userId}-${event.timestamp ?? Date.now()}-${event.message.id ?? ""}`,
      type,
      type === "text" ? (event.message.text ?? "") : null,
      event.message.id ?? null,
      new Date(event.timestamp ?? Date.now()),
    );
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, message: "invalid signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = ((JSON.parse(rawBody) as { events?: LineEvent[] }).events ?? []).filter(Boolean);
  } catch {
    return NextResponse.json({ ok: false, message: "invalid JSON" }, { status: 400 });
  }

  // 転送と記録は同時に進める（どちらかが失敗しても、もう一方は続ける）
  await Promise.all([
    forwardToLinext(rawBody, signature!),
    ...events.map((event) =>
      handle(event).catch((error) => console.error(`LINE webhook event failed (${event.type}):`, error)),
    ),
  ]);
  return NextResponse.json({ ok: true });
}
