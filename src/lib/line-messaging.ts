import { createHmac, timingSafeEqual } from "node:crypto";

// LINE 公式アカウント（Messaging API）とのやり取り。外部ライブラリは使わない。
// 環境変数（LINE Developers の Messaging API チャネルの値。Linext に設定してあるものと同じ）：
//   LINE_CHANNEL_SECRET        受信（Webhook）の署名の確認に使う
//   LINE_CHANNEL_ACCESS_TOKEN  プロフィールの取得・メッセージの送信に使う（長期のチャネルアクセストークン）

const API = "https://api.line.me/v2/bot";

export function isMessagingConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN);
}

// 受信した内容が本当に LINE から来たものか（X-Line-Signature＝本文をチャネルシークレットで署名した値）
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "base64");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""}` };
}

export type LineProfile = { displayName: string; pictureUrl?: string; statusMessage?: string };

// 友だちのプロフィール（ブロックされている・友だちでない場合は null）
export async function getLineProfile(userId: string): Promise<LineProfile | null> {
  const res = await fetch(`${API}/profile/${encodeURIComponent(userId)}`, { headers: authHeaders(), signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return (await res.json()) as LineProfile;
}

export class LineSendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// 1人にテキストを送る（プッシュメッセージ。月の無料通数に数えられる）。
// senderName を渡すと、相手の LINE には「送信者名 from 株式会社エモリスリンク」と表示される（Linext と同じ。20文字まで。アイコンは公式アカウントのまま）
export async function pushLineText(userId: string, text: string, senderName?: string | null): Promise<void> {
  const name = senderName?.trim().slice(0, 20);
  const res = await fetch(`${API}/message/push`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text, ...(name ? { sender: { name } } : {}) }] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LineSendError(`LINE push failed: ${res.status} ${detail.slice(0, 300)}`, res.status);
  }
}

// 友だち全員の userId（認証済みアカウント・プレミアムアカウントでだけ使える。使えなければ null）
export async function listFollowerIds(): Promise<string[] | null> {
  const ids: string[] = [];
  let start: string | undefined;
  for (let page = 0; page < 100; page++) {
    const url = new URL(`${API}/followers/ids`);
    url.searchParams.set("limit", "1000");
    if (start) url.searchParams.set("start", start);
    const res = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return page === 0 ? null : ids;
    const data = (await res.json()) as { userIds?: string[]; next?: string };
    ids.push(...(data.userIds ?? []));
    if (!data.next) break;
    start = data.next;
  }
  return ids;
}
