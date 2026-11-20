import { prisma } from "@/lib/prisma";
import { ensureAdminTables } from "@/lib/admin/store";
import { linkStaffLine } from "@/lib/auth/line-pending";

// 友だち・求職者管理／個別チャット／タグ管理（Linext から移植）。友だちは LINE の userId（hp_line_friend.line_user_id）で扱う。
//   - ステータス・担当者・プロフィール・タグ・内部メモ・同意履歴は hp_ の表に持つ（lib/admin/store.ts の表の定義）
//   - スタッフ（next-app と共用のスタッフ表）とは staff.line_user_id で突き合わせて表示する

// 求職者のステータス（Linext と同じ。並び順もこのとおり）
export const CANDIDATE_STATUSES = [
  { key: "friend_added", label: "友だち追加" },
  { key: "unregistered", label: "未登録" },
  { key: "registering", label: "登録途中" },
  { key: "registered", label: "登録済み" },
  { key: "interview_requested", label: "面談希望" },
  { key: "interview_scheduling", label: "面談調整中" },
  { key: "interview_scheduled", label: "面談予定" },
  { key: "interview_done", label: "面談済み" },
  { key: "job_proposing", label: "求人提案中" },
  { key: "application_considering", label: "応募検討中" },
  { key: "applied", label: "応募済み" },
  { key: "screening", label: "選考中" },
  { key: "offer", label: "内定" },
  { key: "assignment_scheduled", label: "就業予定" },
  { key: "employed", label: "就業中" },
  { key: "dormant", label: "休眠" },
  { key: "closed", label: "対応終了" },
  { key: "unsubscribed", label: "配信停止希望" },
] as const;
export const STATUS_LABEL: Record<string, string> = Object.fromEntries(CANDIDATE_STATUSES.map((s) => [s.key, s.label]));
export const DEFAULT_STATUS = "friend_added";

// 個別チャットの対応状況（Linext と同じ）
export const CHAT_STATUSES = [
  { key: "UNHANDLED", label: "未対応" },
  { key: "IN_PROGRESS", label: "対応中" },
  { key: "DONE", label: "対応済み" },
] as const;
export const CHAT_STATUS_LABEL: Record<string, string> = Object.fromEntries(CHAT_STATUSES.map((s) => [s.key, s.label]));

// タグの自動付与のタイミング（このサイトで起きる出来事のうち、友だちに結び付けられるもの）
export const TAG_TRIGGERS = [
  { key: "friend_add", label: "友だち追加時" },
  { key: "message_reply", label: "メッセージ受信時" },
  { key: "form_submit", label: "フォーム回答時" },
] as const;
export const TAG_TRIGGER_LABEL: Record<string, string> = Object.fromEntries(TAG_TRIGGERS.map((t) => [t.key, t.label]));

// このタグが付いている友だちは「内勤者（社内スタッフ）」として、一覧のいちばん下に並べる（Linext と同じ）
export const INTERNAL_STAFF_TAG_NAME = "内勤者";

// プロフィールの項目（Linext の CandidateProfile と同じ）
export const PROFILE_FIELDS = [
  { key: "name", label: "氏名", max: 200 },
  { key: "name_kana", label: "フリガナ", max: 200 },
  { key: "phone", label: "電話番号", max: 50 },
  { key: "email", label: "メールアドレス", max: 254 },
  { key: "postal_code", label: "郵便番号", max: 20 },
  { key: "prefecture", label: "都道府県", max: 50 },
  { key: "city", label: "市区町村", max: 200 },
  { key: "nearest_station", label: "最寄駅", max: 200 },
  { key: "desired_job_type", label: "希望職種", max: 200 },
  { key: "desired_work_location", label: "希望勤務地", max: 200 },
  { key: "desired_employment_type", label: "希望雇用形態", max: 200 },
  { key: "desired_salary", label: "希望給与", max: 200 },
  { key: "desired_start_timing", label: "転職希望時期", max: 200 },
] as const;
export type ProfileKey = (typeof PROFILE_FIELDS)[number]["key"];
export type Profile = Record<ProfileKey, string | null>;

export const isLineUserId = (v: unknown): v is string => typeof v === "string" && /^U[0-9a-f]{32}$/.test(v);

export type TagChip = { id: number; name: string; color: string };

export type CandidateRow = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  is_friend: boolean;
  status_key: string | null;
  assignee_id: number | null;
  unread: number;
  has_chat: boolean;
  last_action_at: Date | null;
  name: string | null;
  phone: string | null;
  staff_id: number | null;
  staff_name: string | null;
  tags: TagChip[];
};

// ---------- 友だち・求職者の一覧 ----------

export type CandidateFilter = { q?: string; status?: string; assignee?: number | null; friendStatus?: string };

export async function listCandidates(filter: CandidateFilter): Promise<CandidateRow[]> {
  await ensureAdminTables();
  const q = filter.q?.trim() ? `%${filter.q.trim()}%` : null;
  const rows = await prisma.$queryRaw<(Omit<CandidateRow, "tags"> & { tags: TagChip[] | null })[]>`
    SELECT f.line_user_id, f.display_name, f.picture_url, f.is_friend, f.status_key, f.assignee_id, f.unread,
           (f.last_message_at IS NOT NULL) AS has_chat,
           COALESCE(f.last_action_at, f.last_message_at, f.followed_at, f.created_at) AS last_action_at,
           p.name, p.phone, s.id AS staff_id, s.name AS staff_name,
           (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
              FROM hp_line_friend_tag ft JOIN hp_tag t ON t.id = ft.tag_id WHERE ft.line_user_id = f.line_user_id) AS tags
    FROM hp_line_friend f
    LEFT JOIN hp_line_profile p ON p.line_user_id = f.line_user_id
    LEFT JOIN LATERAL (SELECT id, name FROM staff WHERE staff.line_user_id = f.line_user_id ORDER BY id DESC LIMIT 1) s ON true
    WHERE (${filter.status ?? null}::text IS NULL OR f.status_key = ${filter.status ?? null})
      AND (${filter.assignee ?? null}::int IS NULL OR f.assignee_id = ${filter.assignee ?? null})
      AND (${filter.friendStatus ?? null}::text IS NULL
           OR (${filter.friendStatus ?? null} = 'active' AND f.is_friend)
           OR (${filter.friendStatus ?? null} = 'inactive' AND NOT f.is_friend))
      AND (${q}::text IS NULL OR f.display_name ILIKE ${q} OR p.name ILIKE ${q} OR p.name_kana ILIKE ${q}
           OR p.phone ILIKE ${q} OR p.email ILIKE ${q} OR s.name ILIKE ${q})
    ORDER BY COALESCE(f.last_action_at, f.last_message_at, f.followed_at, f.created_at) DESC NULLS LAST`;
  const list = rows.map((r) => ({ ...r, tags: r.tags ?? [] }));
  // 内勤者タグの人をいちばん下へ（それ以外の並びはそのまま）
  const isStaff = (r: CandidateRow) => r.tags.some((t) => t.name.replace(/\s/g, "") === INTERNAL_STAFF_TAG_NAME);
  return [...list.filter((r) => !isStaff(r)), ...list.filter(isStaff)];
}

// ---------- 友だち・求職者の詳細 ----------

export type CandidateDetail = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  is_friend: boolean;
  followed_at: Date | null;
  status_key: string | null;
  assignee_id: number | null;
  chat_status: string;
  chat_assignee_id: number | null;
  profile: Profile | null;
  profile_updated_at: Date | null;
  staff: { id: number; name: string | null; name_k: string | null; mail: string | null } | null;
  tags: (TagChip & { assigned_at: Date })[];
  history: { from_key: string | null; to_key: string; changed_at: Date; changed_by_name: string | null }[];
  consents: { type: string; version: string; consented_at: Date }[];
};

export async function getCandidate(id: string): Promise<CandidateDetail | null> {
  await ensureAdminTables();
  const [base] = await prisma.$queryRaw<
    (Omit<CandidateDetail, "profile" | "staff" | "tags" | "history" | "consents"> & { profile: Profile | null; staff_id: number | null; staff_name: string | null; staff_name_k: string | null; staff_mail: string | null })[]
  >`
    SELECT f.line_user_id, f.display_name, f.picture_url, f.is_friend, f.followed_at, f.status_key, f.assignee_id, f.chat_status, f.chat_assignee_id,
           CASE WHEN p.line_user_id IS NULL THEN NULL ELSE row_to_json(p)::jsonb END AS profile, p.updated_at AS profile_updated_at,
           s.id AS staff_id, s.name AS staff_name, s.name_k AS staff_name_k, s.mail AS staff_mail
    FROM hp_line_friend f
    LEFT JOIN hp_line_profile p ON p.line_user_id = f.line_user_id
    LEFT JOIN LATERAL (SELECT id, name, name_k, mail FROM staff WHERE staff.line_user_id = f.line_user_id ORDER BY id DESC LIMIT 1) s ON true
    WHERE f.line_user_id = ${id}`;
  if (!base) return null;
  const [tags, history, consents] = await Promise.all([
    prisma.$queryRaw<(TagChip & { assigned_at: Date })[]>`
      SELECT t.id, t.name, t.color, ft.assigned_at FROM hp_line_friend_tag ft JOIN hp_tag t ON t.id = ft.tag_id
      WHERE ft.line_user_id = ${id} ORDER BY t.name`,
    prisma.$queryRaw<CandidateDetail["history"]>`
      SELECT h.from_key, h.to_key, h.changed_at, COALESCE(a.name, a.email) AS changed_by_name
      FROM hp_line_status_history h LEFT JOIN hp_admin_user a ON a.id = h.changed_by
      WHERE h.line_user_id = ${id} ORDER BY h.changed_at DESC`,
    prisma.$queryRaw<CandidateDetail["consents"]>`
      SELECT type, version, consented_at FROM hp_line_consent WHERE line_user_id = ${id} ORDER BY consented_at DESC`,
  ]);
  const { staff_id, staff_name, staff_name_k, staff_mail, ...rest } = base;
  return { ...rest, staff: staff_id === null ? null : { id: staff_id, name: staff_name, name_k: staff_name_k, mail: staff_mail }, tags, history, consents };
}

// ---------- 変更 ----------

export async function setStatus(id: string, key: string, adminId: number | null): Promise<boolean> {
  await ensureAdminTables();
  if (!STATUS_LABEL[key]) return false;
  const [cur] = await prisma.$queryRaw<{ status_key: string | null }[]>`SELECT status_key FROM hp_line_friend WHERE line_user_id = ${id}`;
  if (!cur) return false;
  if (cur.status_key === key) return true;
  await prisma.$executeRaw`UPDATE hp_line_friend SET status_key = ${key} WHERE line_user_id = ${id}`;
  await prisma.$executeRaw`INSERT INTO hp_line_status_history (line_user_id, from_key, to_key, changed_by) VALUES (${id}, ${cur.status_key}, ${key}, ${adminId})`;
  return true;
}

export async function setAssignee(id: string, adminId: number | null, which: "candidate" | "chat"): Promise<boolean> {
  await ensureAdminTables();
  if (adminId !== null) {
    const [a] = await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM hp_admin_user WHERE id = ${adminId}`;
    if (!a) return false;
  }
  const n =
    which === "candidate"
      ? await prisma.$executeRaw`UPDATE hp_line_friend SET assignee_id = ${adminId} WHERE line_user_id = ${id}`
      : await prisma.$executeRaw`UPDATE hp_line_friend SET chat_assignee_id = ${adminId} WHERE line_user_id = ${id}`;
  return n > 0;
}

export async function setChatStatus(id: string, status: string): Promise<boolean> {
  await ensureAdminTables();
  if (!CHAT_STATUS_LABEL[status]) return false;
  return (await prisma.$executeRaw`UPDATE hp_line_friend SET chat_status = ${status} WHERE line_user_id = ${id}`) > 0;
}

export async function saveProfile(id: string, values: Partial<Profile>, adminId: number | null): Promise<void> {
  await ensureAdminTables();
  const v = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, (values[f.key] ?? "").toString().trim().slice(0, f.max) || null])) as Profile;
  await prisma.$executeRaw`
    INSERT INTO hp_line_profile (line_user_id, name, name_kana, phone, email, postal_code, prefecture, city, nearest_station,
      desired_job_type, desired_work_location, desired_employment_type, desired_salary, desired_start_timing, updated_by, updated_at)
    VALUES (${id}, ${v.name}, ${v.name_kana}, ${v.phone}, ${v.email}, ${v.postal_code}, ${v.prefecture}, ${v.city}, ${v.nearest_station},
      ${v.desired_job_type}, ${v.desired_work_location}, ${v.desired_employment_type}, ${v.desired_salary}, ${v.desired_start_timing}, ${adminId}, now())
    ON CONFLICT (line_user_id) DO UPDATE SET
      name = EXCLUDED.name, name_kana = EXCLUDED.name_kana, phone = EXCLUDED.phone, email = EXCLUDED.email,
      postal_code = EXCLUDED.postal_code, prefecture = EXCLUDED.prefecture, city = EXCLUDED.city, nearest_station = EXCLUDED.nearest_station,
      desired_job_type = EXCLUDED.desired_job_type, desired_work_location = EXCLUDED.desired_work_location,
      desired_employment_type = EXCLUDED.desired_employment_type, desired_salary = EXCLUDED.desired_salary,
      desired_start_timing = EXCLUDED.desired_start_timing, updated_by = EXCLUDED.updated_by, updated_at = now()`;
}

// 連携しているスタッフ（スタッフ表）の登録内容で、プロフィールの空いている項目を埋める
export async function fillProfileFromStaff(id: string, adminId: number | null): Promise<boolean> {
  await ensureAdminTables();
  const [st] = await prisma.$queryRaw<
    { name: string | null; name_k: string | null; phone_number: string | null; mail: string | null; postal_code: string | null; prefecture: string | null; address: string | null; desired_job_type: string | null; desired_start_date: Date | null }[]
  >`SELECT name, name_k, phone_number, mail, postal_code, prefecture, address, desired_job_type, desired_start_date
    FROM staff WHERE line_user_id = ${id} ORDER BY id DESC LIMIT 1`;
  if (!st) return false;
  const [cur] = await prisma.$queryRaw<{ profile: Profile | null }[]>`SELECT row_to_json(p)::jsonb AS profile FROM hp_line_profile p WHERE line_user_id = ${id}`;
  const p = (cur?.profile ?? {}) as Partial<Profile>;
  const pick = (a: string | null | undefined, b: string | null | undefined) => (a && a.trim() ? a : (b ?? null));
  await saveProfile(
    id,
    {
      ...p,
      name: pick(p.name, st.name),
      name_kana: pick(p.name_kana, st.name_k),
      phone: pick(p.phone, st.phone_number),
      email: pick(p.email, st.mail),
      postal_code: pick(p.postal_code, st.postal_code),
      prefecture: pick(p.prefecture, st.prefecture),
      city: pick(p.city, st.address),
      desired_job_type: pick(p.desired_job_type, st.desired_job_type),
      desired_start_timing: pick(p.desired_start_timing, st.desired_start_date ? st.desired_start_date.toISOString().slice(0, 10) : null),
    },
    adminId,
  );
  return true;
}

// スタッフを探す（氏名・フリガナ・電話番号・メール・スタッフ ID）。LINE と未連携の人を上に
export async function searchStaff(q: string) {
  const like = `%${q.trim()}%`;
  const id = /^\d+$/.test(q.trim()) ? Number(q.trim()) : -1;
  return prisma.$queryRaw<{ id: number; name: string | null; name_k: string | null; phone_number: string | null; mail: string | null; linked: boolean }[]>`
    SELECT id, name, name_k, phone_number, mail, (line_user_id IS NOT NULL AND line_user_id <> '') AS linked FROM staff
    WHERE id = ${id} OR name ILIKE ${like} OR name_k ILIKE ${like} OR phone_number ILIKE ${like} OR mail ILIKE ${like}
    ORDER BY linked, id DESC LIMIT 20`;
}

// 友だちとスタッフを手動で連携する（スタッフ表の line_user_id に書き込む。上書きはしない）
export async function linkFriendToStaff(id: string, staffId: number) {
  return linkStaffLine(staffId, id);
}

// ---------- タグ ----------

export type TagRow = TagChip & {
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  is_manual_allowed: boolean;
  auto_trigger: string | null;
  is_active: boolean;
  count: number;
};

export async function listTags(): Promise<TagRow[]> {
  await ensureAdminTables();
  return prisma.$queryRaw<TagRow[]>`
    SELECT t.id, t.name, t.color, t.category_id, c.name AS category_name, t.description, t.is_manual_allowed, t.auto_trigger, t.is_active,
           (SELECT count(*)::int FROM hp_line_friend_tag ft WHERE ft.tag_id = t.id) AS count
    FROM hp_tag t LEFT JOIN hp_tag_category c ON c.id = t.category_id
    ORDER BY c.sort_order NULLS LAST, c.id NULLS LAST, t.created_at, t.id`;
}

export async function listCategories() {
  await ensureAdminTables();
  return prisma.$queryRaw<{ id: number; name: string; sort_order: number; count: number }[]>`
    SELECT c.id, c.name, c.sort_order, (SELECT count(*)::int FROM hp_tag t WHERE t.category_id = c.id) AS count
    FROM hp_tag_category c ORDER BY c.sort_order, c.id`;
}

export type TagInput = { name: string; description: string | null; color: string; category_id: number | null; is_manual_allowed: boolean; auto_trigger: string | null };

export async function saveTag(id: number | null, t: TagInput): Promise<number> {
  await ensureAdminTables();
  if (id === null) {
    const [r] = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO hp_tag (name, description, color, category_id, is_manual_allowed, auto_trigger)
      VALUES (${t.name}, ${t.description}, ${t.color}, ${t.category_id}, ${t.is_manual_allowed}, ${t.auto_trigger}) RETURNING id`;
    return r.id;
  }
  await prisma.$executeRaw`
    UPDATE hp_tag SET name = ${t.name}, description = ${t.description}, color = ${t.color}, category_id = ${t.category_id},
      is_manual_allowed = ${t.is_manual_allowed}, auto_trigger = ${t.auto_trigger} WHERE id = ${id}`;
  return id;
}

export async function setTagActive(id: number, active: boolean): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`UPDATE hp_tag SET is_active = ${active} WHERE id = ${id}`;
}

export async function saveCategory(id: number | null, name: string, sortOrder: number): Promise<void> {
  await ensureAdminTables();
  if (id === null) await prisma.$executeRaw`INSERT INTO hp_tag_category (name, sort_order) VALUES (${name}, ${sortOrder})`;
  else await prisma.$executeRaw`UPDATE hp_tag_category SET name = ${name}, sort_order = ${sortOrder} WHERE id = ${id}`;
}

// カテゴリを消す（そのカテゴリのタグは「カテゴリなし」になる。タグ自体は消さない）
export async function deleteCategory(id: number): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`UPDATE hp_tag SET category_id = NULL WHERE category_id = ${id}`;
  await prisma.$executeRaw`DELETE FROM hp_tag_category WHERE id = ${id}`;
}

export async function addFriendTag(id: string, tagId: number, adminId: number | null, manual = true): Promise<"ok" | "not_allowed" | "not_found"> {
  await ensureAdminTables();
  const [t] = await prisma.$queryRaw<{ is_active: boolean; is_manual_allowed: boolean }[]>`SELECT is_active, is_manual_allowed FROM hp_tag WHERE id = ${tagId}`;
  if (!t || !t.is_active) return "not_found";
  if (manual && !t.is_manual_allowed) return "not_allowed";
  await prisma.$executeRaw`
    INSERT INTO hp_line_friend_tag (line_user_id, tag_id, assigned_by) VALUES (${id}, ${tagId}, ${adminId}) ON CONFLICT DO NOTHING`;
  return "ok";
}

export async function removeFriendTag(id: string, tagId: number): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`DELETE FROM hp_line_friend_tag WHERE line_user_id = ${id} AND tag_id = ${tagId}`;
}

// 自動付与ルールのタグを付ける（受信・フォーム回答などから呼ぶ）
export async function applyAutoTags(id: string, trigger: string): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_line_friend_tag (line_user_id, tag_id)
    SELECT ${id}, t.id FROM hp_tag t WHERE t.is_active AND t.auto_trigger = ${trigger}
    ON CONFLICT DO NOTHING`;
}

// ---------- 個別チャット ----------

export type ChatRow = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  name: string | null;
  is_friend: boolean;
  unread: number;
  chat_status: string;
  chat_assignee_id: number | null;
  last_message_at: Date | null;
  last_message_text: string | null;
};

export async function listChats(filter: { q?: string; status?: string; assignee?: number | null }): Promise<ChatRow[]> {
  await ensureAdminTables();
  const q = filter.q?.trim() ? `%${filter.q.trim()}%` : null;
  return prisma.$queryRaw<ChatRow[]>`
    SELECT f.line_user_id, f.display_name, f.picture_url, p.name, f.is_friend, f.unread, f.chat_status, f.chat_assignee_id, f.last_message_at, f.last_message_text
    FROM hp_line_friend f LEFT JOIN hp_line_profile p ON p.line_user_id = f.line_user_id
    WHERE f.last_message_at IS NOT NULL
      AND (${filter.status ?? null}::text IS NULL OR f.chat_status = ${filter.status ?? null})
      AND (${filter.assignee ?? null}::int IS NULL OR f.chat_assignee_id = ${filter.assignee ?? null})
      AND (${q}::text IS NULL OR f.display_name ILIKE ${q} OR p.name ILIKE ${q})
    -- 内勤者タグの人はいちばん下へ（友だち・求職者管理と同じ）
    ORDER BY EXISTS (SELECT 1 FROM hp_line_friend_tag ft JOIN hp_tag t ON t.id = ft.tag_id
                     WHERE ft.line_user_id = f.line_user_id AND regexp_replace(t.name, '[[:space:]　]', '', 'g') = ${INTERNAL_STAFF_TAG_NAME}),
             f.last_message_at DESC
    LIMIT 200`;
}

export async function listNotes(id: string) {
  await ensureAdminTables();
  return prisma.$queryRaw<{ id: number; body: string; created_at: Date; admin_name: string | null }[]>`
    SELECT n.id, n.body, n.created_at, COALESCE(a.name, a.email) AS admin_name
    FROM hp_line_note n LEFT JOIN hp_admin_user a ON a.id = n.admin_id
    WHERE n.line_user_id = ${id} ORDER BY n.created_at DESC`;
}

export async function addNote(id: string, body: string, adminId: number): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`INSERT INTO hp_line_note (line_user_id, admin_id, body) VALUES (${id}, ${adminId}, ${body})`;
}

// 個別チャットの「新規メッセージ」：送る相手（友だち）を探す。q が空なら、最近反応のあった友だちから。ブロック中の人は出さない
export async function searchFriends(q: string) {
  await ensureAdminTables();
  const like = q.trim() ? `%${q.trim()}%` : null;
  return prisma.$queryRaw<{ line_user_id: string; display_name: string | null; picture_url: string | null; name: string | null; staff_name: string | null; has_chat: boolean }[]>`
    SELECT f.line_user_id, f.display_name, f.picture_url, p.name, s.name AS staff_name, (f.last_message_at IS NOT NULL) AS has_chat
    FROM hp_line_friend f
    LEFT JOIN hp_line_profile p ON p.line_user_id = f.line_user_id
    LEFT JOIN LATERAL (SELECT name FROM staff WHERE staff.line_user_id = f.line_user_id ORDER BY id DESC LIMIT 1) s ON true
    WHERE f.is_friend
      AND (${like}::text IS NULL OR f.display_name ILIKE ${like} OR p.name ILIKE ${like} OR p.name_kana ILIKE ${like} OR p.phone ILIKE ${like} OR s.name ILIKE ${like})
    ORDER BY COALESCE(f.last_action_at, f.last_message_at, f.followed_at, f.created_at) DESC NULLS LAST
    LIMIT 30`;
}

export async function friendExists(id: string): Promise<boolean> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_line_friend WHERE line_user_id = ${id}`;
  return (r?.n ?? 0) > 0;
}
