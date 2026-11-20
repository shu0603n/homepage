import { prisma } from "@/lib/prisma";
import { ensureAdminTables } from "@/lib/admin/store";
import { getLineProfile } from "@/lib/line-messaging";

// LINE 公式アカウントの友だち（hp_line_friend）と個別メッセージ（hp_line_message）。
//   - 受信（Webhook）は /api/line/webhook/ が受け、ここに記録する（同じものを Linext にも転送して、移行中も Linext を動かし続ける）
//   - 管理画面の「LINE 友だち」で一覧・個別チャットを見て、返信する（送ったメッセージもここに記録する）
//   - スタッフとの紐付けは、スタッフ表（next-app と共用）の line_user_id と突き合わせて表示するだけ

export type LineFriendRow = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  is_friend: boolean;
  followed_at: Date | null;
  last_message_at: Date | null;
  last_message_text: string | null;
  unread: number;
  staff_id: number | null;
  staff_name: string | null;
  staff_kana: string | null;
};

export type LineMessageRow = {
  id: bigint;
  direction: "in" | "out";
  message_type: string;
  text: string | null;
  sent_by: number | null;
  sent_by_name: string | null;
  created_at: Date;
};

// 受信したメッセージの種類ごとの、一覧に出す短い言葉（テキスト以外）
export const MESSAGE_LABELS: Record<string, string> = {
  image: "［画像］",
  video: "［動画］",
  audio: "［音声］",
  file: "［ファイル］",
  location: "［位置情報］",
  sticker: "［スタンプ］",
};

const short = (text: string) => ([...text].length > 60 ? `${[...text].slice(0, 60).join("")}…` : text);

// 友だちを記録する（無ければ作り、プロフィールを LINE から取り直す）。follow：友だち追加・ブロック解除のとき true
export async function upsertFriend(userId: string, opts: { follow?: boolean; unfollow?: boolean } = {}): Promise<void> {
  await ensureAdminTables();
  const profile = opts.unfollow ? null : await getLineProfile(userId).catch(() => null);
  await prisma.$executeRaw`
    INSERT INTO hp_line_friend (line_user_id, display_name, picture_url, status_message, is_friend, followed_at, unfollowed_at, profile_updated_at)
    VALUES (${userId}, ${profile?.displayName ?? null}, ${profile?.pictureUrl ?? null}, ${profile?.statusMessage ?? null},
            ${!opts.unfollow}, ${opts.follow ? new Date() : null}, ${opts.unfollow ? new Date() : null}, ${profile ? new Date() : null})
    ON CONFLICT (line_user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, hp_line_friend.display_name),
      picture_url = COALESCE(EXCLUDED.picture_url, hp_line_friend.picture_url),
      status_message = COALESCE(EXCLUDED.status_message, hp_line_friend.status_message),
      is_friend = CASE WHEN ${!!opts.unfollow} THEN false WHEN ${!!opts.follow} THEN true ELSE hp_line_friend.is_friend END,
      followed_at = COALESCE(EXCLUDED.followed_at, hp_line_friend.followed_at),
      unfollowed_at = CASE WHEN ${!!opts.unfollow} THEN EXCLUDED.unfollowed_at ELSE hp_line_friend.unfollowed_at END,
      profile_updated_at = COALESCE(EXCLUDED.profile_updated_at, hp_line_friend.profile_updated_at)`;
}

// 受信したメッセージを記録する（同じ受信の再送は1回だけ）。記録したら true
export async function recordIncoming(userId: string, eventId: string, type: string, text: string | null, lineMessageId: string | null, at: Date): Promise<boolean> {
  await ensureAdminTables();
  const n = await prisma.$executeRaw`
    INSERT INTO hp_line_message (line_user_id, direction, message_type, text, line_message_id, webhook_event_id, created_at)
    VALUES (${userId}, 'in', ${type}, ${text}, ${lineMessageId}, ${eventId}, ${at})
    ON CONFLICT (webhook_event_id) DO NOTHING`;
  if (n === 0) return false;
  const preview = short(type === "text" ? (text ?? "") : (MESSAGE_LABELS[type] ?? `［${type}］`));
  await prisma.$executeRaw`
    UPDATE hp_line_friend SET last_message_at = ${at}, last_message_text = ${preview}, unread = unread + 1, is_friend = true
    WHERE line_user_id = ${userId}`;
  return true;
}

// 管理画面から送ったメッセージを記録する
export async function recordOutgoing(userId: string, text: string, adminId: number): Promise<void> {
  await ensureAdminTables();
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO hp_line_message (line_user_id, direction, message_type, text, sent_by, created_at)
    VALUES (${userId}, 'out', 'text', ${text}, ${adminId}, ${now})`;
  await prisma.$executeRaw`
    UPDATE hp_line_friend SET last_message_at = ${now}, last_message_text = ${short(text)}, unread = 0 WHERE line_user_id = ${userId}`;
}

// 友だちの一覧（新しくやり取りした順）。スタッフ表と line_user_id で突き合わせて、連携しているスタッフも出す
export async function listFriends(): Promise<LineFriendRow[]> {
  await ensureAdminTables();
  return prisma.$queryRaw<LineFriendRow[]>`
    SELECT f.line_user_id, f.display_name, f.picture_url, f.is_friend, f.followed_at, f.last_message_at, f.last_message_text, f.unread,
           s.id AS staff_id, s.name AS staff_name, s.name_k AS staff_kana
    FROM hp_line_friend f
    LEFT JOIN LATERAL (SELECT id, name, name_k FROM staff WHERE staff.line_user_id = f.line_user_id ORDER BY id DESC LIMIT 1) s ON true
    ORDER BY f.last_message_at DESC NULLS LAST, f.followed_at DESC NULLS LAST, f.created_at DESC
    LIMIT 2000`;
}

export async function getFriend(userId: string): Promise<LineFriendRow | null> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<LineFriendRow[]>`
    SELECT f.line_user_id, f.display_name, f.picture_url, f.is_friend, f.followed_at, f.last_message_at, f.last_message_text, f.unread,
           s.id AS staff_id, s.name AS staff_name, s.name_k AS staff_kana
    FROM hp_line_friend f
    LEFT JOIN LATERAL (SELECT id, name, name_k FROM staff WHERE staff.line_user_id = f.line_user_id ORDER BY id DESC LIMIT 1) s ON true
    WHERE f.line_user_id = ${userId}`;
  return rows[0] ?? null;
}

// 個別チャットのやり取り（古い順。直近 300 件）
export async function listMessages(userId: string): Promise<LineMessageRow[]> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<LineMessageRow[]>`
    SELECT * FROM (
      SELECT m.id, m.direction, m.message_type, m.text, m.sent_by, COALESCE(a.name, a.email) AS sent_by_name, m.created_at
      FROM hp_line_message m LEFT JOIN hp_admin_user a ON a.id = m.sent_by
      WHERE m.line_user_id = ${userId}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 300
    ) t ORDER BY created_at, id`;
  return rows;
}

export async function markRead(userId: string): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`UPDATE hp_line_friend SET unread = 0 WHERE line_user_id = ${userId} AND unread > 0`;
}

// 未読がある友だちの数（左のメニューの数字）
export async function countUnreadFriends(): Promise<number> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_line_friend WHERE unread > 0`;
  return rows[0]?.n ?? 0;
}

// 既存の友だちの取り込み（受信先を切り替える前からの友だちを一覧に出すため）：
// LINE の「友だち全員の一覧」が使えればそれを、使えなければスタッフ表で LINE 連携済みの人を、まだ記録していなければ記録する
// 1回で取り込むのは 150 人まで（LINE からプロフィールを1人ずつ取るため、時間がかかりすぎないように）。残りがあれば remaining に入る
const IMPORT_BATCH = 150;
export async function importExistingFriends(followerIds: string[] | null): Promise<{ source: "followers" | "staff"; added: number; remaining: number }> {
  await ensureAdminTables();
  let ids = followerIds;
  const source = ids ? "followers" : "staff";
  if (!ids) {
    const rows = await prisma.$queryRaw<{ line_user_id: string }[]>`
      SELECT DISTINCT line_user_id FROM staff WHERE line_user_id IS NOT NULL AND line_user_id <> ''`;
    ids = rows.map((r) => r.line_user_id);
  }
  const known = new Set((await prisma.$queryRaw<{ line_user_id: string }[]>`SELECT line_user_id FROM hp_line_friend`).map((r) => r.line_user_id));
  const todo = ids.filter((id) => !known.has(id) && /^U[0-9a-f]{32}$/.test(id));
  let added = 0;
  for (const id of todo.slice(0, IMPORT_BATCH)) {
    const profile = await getLineProfile(id).catch(() => null);
    if (!profile && source === "staff") continue; // スタッフ表にあっても、いま友だちでない（ブロック・削除）人は出さない
    await prisma.$executeRaw`
      INSERT INTO hp_line_friend (line_user_id, display_name, picture_url, status_message, is_friend, profile_updated_at)
      VALUES (${id}, ${profile?.displayName ?? null}, ${profile?.pictureUrl ?? null}, ${profile?.statusMessage ?? null}, true, ${profile ? new Date() : null})
      ON CONFLICT (line_user_id) DO NOTHING`;
    added++;
  }
  return { source, added, remaining: Math.max(0, todo.length - IMPORT_BATCH) };
}
