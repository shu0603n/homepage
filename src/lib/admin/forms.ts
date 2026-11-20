import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAdminTables } from "@/lib/admin/store";
import { addFriendTag, applyAutoTags, PROFILE_FIELDS, saveProfile, setStatus, STATUS_LABEL, type Profile } from "@/lib/admin/crm";
import { upsertFriend } from "@/lib/admin/line";
import { AUTH_MODE_LABEL, BRANCH_TYPES, CHOICE_TYPES, isFieldType, isInputType, PROFILE_TARGET_LABEL, SLUG_RE, type AnswerValue, type AuthMode, type FieldLogic, type FieldType, type FormLogic, type PublicField } from "@/lib/forms-def";

// フォーム管理（Linext のフォームを移植）。
//   管理画面でフォーム（質問の並び）を作る → ホームページの /jobs/forms/<slug>/ が回答ページになる → 回答は管理画面で一覧・グラフ・CSV で見る。
//   回答者の確かめ方はフォームごとに選ぶ：line＝LINE ログイン必須（LINE の友だちと結び付く）／open＝誰でも回答可。
//   LINE ログイン必須のフォームでは、回答したときに「タグを付ける」「ステータスを変える」「基本情報に入れる」もできる（Linext と同じ）。
// 回答ページを /jobs/ の下に置くのは、LIFF（LINE ログイン）のエンドポイントが /jobs/ のため

export type FormRow = {
  id: number;
  slug: string;
  title: string;
  purpose: string | null;
  auth_mode: AuthMode;
  is_published: boolean;
  updated_at: Date;
  count: number;
  last_at: Date | null;
};

export type FormFieldRow = { id: number; uid: string; type: FieldType; label: string; help: string | null; required: boolean; options: string[]; profile_key: string | null; logic: FieldLogic | null; deleted: boolean };

export type FormDetail = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  purpose: string | null;
  auth_mode: AuthMode;
  is_published: boolean;
  done_message: string | null;
  on_submit_status: string | null;
  on_submit_tag_ids: number[];
  logic: FormLogic | null;
  updated_at: Date;
  fields: FormFieldRow[];
};

export async function listForms(): Promise<FormRow[]> {
  await ensureAdminTables();
  return prisma.$queryRaw<FormRow[]>`
    SELECT f.id, f.slug, f.title, f.purpose, f.auth_mode, f.is_published, f.updated_at,
           (SELECT count(*)::int FROM hp_form_submission s WHERE s.form_id = f.id) AS count,
           (SELECT max(s.submitted_at) FROM hp_form_submission s WHERE s.form_id = f.id) AS last_at
    FROM hp_form f ORDER BY f.updated_at DESC, f.id DESC`;
}

const toField = (r: { id: number; uid: string | null; type: string; label: string; help: string | null; required: boolean; options: unknown; profile_key: string | null; logic: unknown; deleted_at: Date | null }): FormFieldRow => ({
  id: r.id,
  uid: r.uid ?? `f${r.id}`,
  logic: r.logic && typeof r.logic === "object" ? (r.logic as FieldLogic) : null,
  type: (isFieldType(r.type) ? r.type : "SHORT_TEXT") as FieldType,
  label: r.label,
  help: r.help,
  required: r.required,
  options: Array.isArray(r.options) ? r.options.filter((o): o is string => typeof o === "string") : [],
  profile_key: r.profile_key,
  deleted: r.deleted_at !== null,
});

async function loadForm(where: Prisma.Sql): Promise<FormDetail | null> {
  await ensureAdminTables();
  const [f] = await prisma.$queryRaw<Omit<FormDetail, "fields">[]>`
    SELECT id, slug, title, description, purpose, auth_mode, is_published, done_message, on_submit_status, on_submit_tag_ids, logic, updated_at FROM hp_form WHERE ${where}`;
  if (!f) return null;
  const fields = await prisma.$queryRaw<Parameters<typeof toField>[0][]>`
    SELECT id, uid, type, label, help, required, options, profile_key, logic, deleted_at FROM hp_form_field WHERE form_id = ${f.id} ORDER BY sort_order, id`;
  return { ...f, on_submit_tag_ids: f.on_submit_tag_ids ?? [], fields: fields.map(toField) };
}

export const getForm = (id: number) => loadForm(Prisma.sql`id = ${id}`);
export const getFormBySlug = (slug: string) => loadForm(Prisma.sql`slug = ${slug}`);

// 回答ページに渡す質問（消した質問は出さない）
export const publicFields = (f: FormDetail): PublicField[] =>
  f.fields.filter((x) => !x.deleted).map((x) => ({ id: x.id, uid: x.uid, type: x.type, label: x.label, help: x.help, required: x.required, options: x.options, logic: x.logic }));

// ---------- 作成・更新 ----------

export type FormInput = {
  title: string;
  slug: string;
  description: string | null;
  purpose: string | null;
  auth_mode: AuthMode;
  is_published: boolean;
  done_message: string | null;
  on_submit_status: string | null;
  on_submit_tag_ids: number[];
  logic: FormLogic;
  fields: { id: number | null; uid: string; type: FieldType; label: string; help: string | null; required: boolean; options: string[]; profile_key: string | null; logic: FieldLogic | null }[];
};

const s = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// 管理画面から送られた内容を確かめる（だめならメッセージを返す）
export function parseFormInput(b: Record<string, unknown>): FormInput | string {
  const title = s(b.title, 200);
  if (!title) return "タイトルを入力してください。";
  const slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  if (!SLUG_RE.test(slug)) return "URL の名前は、半角の英小文字・数字・ハイフンで 2〜60 文字にしてください（先頭は英数字）。";
  const auth = b.auth_mode === "open" ? "open" : b.auth_mode === "line" ? "line" : null;
  if (!auth) return "回答者の確かめ方を選んでください。";
  const status = b.on_submit_status == null || b.on_submit_status === "" ? null : typeof b.on_submit_status === "string" && STATUS_LABEL[b.on_submit_status] ? b.on_submit_status : undefined;
  if (status === undefined) return "回答時に変えるステータスが正しくありません。";
  const tagIds = Array.isArray(b.on_submit_tag_ids) ? b.on_submit_tag_ids.filter((x): x is number => Number.isInteger(x) && x > 0) : [];
  if (!Array.isArray(b.fields) || b.fields.length === 0) return "質問を1つ以上追加してください。";
  if (b.fields.length > 100) return "質問は100個までです。";
  const fields: FormInput["fields"] = [];
  for (const [i, raw] of (b.fields as unknown[]).entries()) {
    const x = (raw ?? {}) as Record<string, unknown>;
    const n = i + 1;
    if (!isFieldType(x.type)) return `質問${n}の回答形式を選んでください。`;
    const label = s(x.label, 2000);
    if (!label && x.type !== "SECTION") return x.type === "DESCRIPTION" ? `質問${n}（説明文）の文章を入力してください。` : `質問${n}の質問文を入力してください。`;
    const options = CHOICE_TYPES.includes(x.type)
      ? [...new Set((Array.isArray(x.options) ? x.options : []).map((o) => (typeof o === "string" ? o.trim().slice(0, 200) : "")).filter(Boolean))].slice(0, 100)
      : [];
    if (CHOICE_TYPES.includes(x.type) && options.length === 0) return `質問${n}「${(label ?? "").slice(0, 20)}」の選択肢を1つ以上入力してください。`;
    const profileKey = typeof x.profile_key === "string" && PROFILE_TARGET_LABEL[x.profile_key] && isInputType(x.type) && !["FILE", "CONSENT", "MULTI_CHOICE"].includes(x.type) ? x.profile_key : null;
    fields.push({
      id: Number.isInteger(x.id) && (x.id as number) > 0 ? (x.id as number) : null,
      uid: typeof x.uid === "string" && /^[A-Za-z0-9_]{1,20}$/.test(x.uid) && x.uid !== "_start" ? x.uid : "",
      type: x.type,
      label: label ?? "",
      help: s(x.help, x.type === "SECTION" ? 3000 : 1000),
      required: isInputType(x.type) ? x.required === true : false,
      options,
      profile_key: profileKey,
      logic: x.logic && typeof x.logic === "object" ? (x.logic as FieldLogic) : null,
    });
  }
  // 目印（uid）が無い・重なる質問には、新しい目印を付ける
  const seen = new Set<string>();
  for (const f of fields) {
    if (!f.uid || seen.has(f.uid)) f.uid = Math.random().toString(36).slice(2, 10);
    seen.add(f.uid);
  }
  // 分岐の行き先を整える：行き先は「その位置より後ろのセクション」か「送信」だけ。消したセクションなど、無い行き先は「いつもどおり」に戻す
  const sectionPos = new Map(fields.flatMap((f, i) => (f.type === "SECTION" ? [[f.uid, i] as const] : [])));
  const target = (t: unknown, from: number) => (t === "submit" ? "submit" : typeof t === "string" && (sectionPos.get(t) ?? -1) > from ? t : "");
  for (const [i, f] of fields.entries()) {
    const raw = f.logic;
    const logic: FieldLogic = {};
    if (f.type === "SECTION") {
      const t = target(raw?.next, i);
      if (t) logic.next = t;
    }
    if ((f.type === "SINGLE_CHOICE" || f.type === "MULTI_CHOICE") && raw?.other === true) logic.other = true;
    if (BRANCH_TYPES.includes(f.type) && raw?.branches && typeof raw.branches === "object") {
      const branches: Record<string, string> = {};
      for (const o of logic.other ? [...f.options, "__other"] : f.options) {
        const t = target((raw.branches as Record<string, unknown>)[o], i);
        if (t) branches[o] = t;
      }
      if (Object.keys(branches).length > 0) logic.branches = branches;
    }
    f.logic = Object.keys(logic).length > 0 ? logic : null;
  }
  const formLogicRaw = b.logic && typeof b.logic === "object" ? (b.logic as Record<string, unknown>) : {};
  const firstNext = target(formLogicRaw.first_next, -1);
  if (!fields.some((f) => isInputType(f.type) || f.type === "DESCRIPTION")) return "質問を1つ以上追加してください。";
  const used = fields.map((f) => f.profile_key).filter(Boolean);
  if (new Set(used).size !== used.length) return "「基本情報への反映先」が同じ項目の質問が2つあります。1つにしてください。";
  return {
    title,
    slug,
    description: s(b.description, 5000),
    purpose: s(b.purpose, 200),
    auth_mode: auth,
    is_published: b.is_published === true,
    done_message: s(b.done_message, 2000),
    on_submit_status: auth === "line" ? status : null,
    on_submit_tag_ids: auth === "line" ? [...new Set(tagIds)] : [],
    logic: firstNext ? { first_next: firstNext } : {},
    fields,
  };
}

// 保存する。新規なら id は null。URL の名前がほかのフォームと同じなら "slug_taken"
export async function saveForm(id: number | null, f: FormInput, adminId: number): Promise<number | "slug_taken" | "not_found"> {
  await ensureAdminTables();
  const [dup] = await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM hp_form WHERE slug = ${f.slug} AND id <> ${id ?? 0}`;
  if (dup) return "slug_taken";
  return prisma.$transaction(async (tx) => {
    let formId: number;
    if (id === null) {
      const [r] = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO hp_form (slug, title, description, purpose, auth_mode, is_published, done_message, on_submit_status, on_submit_tag_ids, logic, created_by)
        VALUES (${f.slug}, ${f.title}, ${f.description}, ${f.purpose}, ${f.auth_mode}, ${f.is_published}, ${f.done_message}, ${f.on_submit_status}, ${f.on_submit_tag_ids}::int[], ${JSON.stringify(f.logic)}::jsonb, ${adminId})
        RETURNING id`;
      formId = r.id;
    } else {
      const n = await tx.$executeRaw`
        UPDATE hp_form SET slug = ${f.slug}, title = ${f.title}, description = ${f.description}, purpose = ${f.purpose}, auth_mode = ${f.auth_mode},
          is_published = ${f.is_published}, done_message = ${f.done_message}, on_submit_status = ${f.on_submit_status},
          on_submit_tag_ids = ${f.on_submit_tag_ids}::int[], logic = ${JSON.stringify(f.logic)}::jsonb, updated_at = now()
        WHERE id = ${id}`;
      if (n === 0) return "not_found" as const;
      formId = id;
    }
    // 質問：既存のもの（id あり）は書き換え、新しいものは足す。画面から消えた質問は、回答が残っていれば「消した」印を付けて残し、無ければ消す
    const existing = (await tx.$queryRaw<{ id: number }[]>`SELECT id FROM hp_form_field WHERE form_id = ${formId}`).map((r) => r.id);
    const kept = new Set<number>();
    for (const [i, x] of f.fields.entries()) {
      const opts = JSON.stringify(x.options);
      const logic = x.logic ? JSON.stringify(x.logic) : null;
      if (x.id !== null && existing.includes(x.id)) {
        kept.add(x.id);
        await tx.$executeRaw`
          UPDATE hp_form_field SET sort_order = ${i}, type = ${x.type}, label = ${x.label}, help = ${x.help}, required = ${x.required},
            options = ${opts}::jsonb, profile_key = ${x.profile_key}, uid = ${x.uid}, logic = ${logic}::jsonb, deleted_at = NULL
          WHERE id = ${x.id}`;
      } else {
        await tx.$executeRaw`
          INSERT INTO hp_form_field (form_id, sort_order, type, label, help, required, options, profile_key, uid, logic)
          VALUES (${formId}, ${i}, ${x.type}, ${x.label}, ${x.help}, ${x.required}, ${opts}::jsonb, ${x.profile_key}, ${x.uid}, ${logic}::jsonb)`;
      }
    }
    for (const fid of existing.filter((e) => !kept.has(e))) {
      const [a] = await tx.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_form_answer WHERE field_id = ${fid}`;
      const [b] = await tx.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_form_file WHERE field_id = ${fid}`;
      if ((a?.n ?? 0) + (b?.n ?? 0) > 0) await tx.$executeRaw`UPDATE hp_form_field SET deleted_at = COALESCE(deleted_at, now()), sort_order = 10000 + ${fid} WHERE id = ${fid}`;
      else await tx.$executeRaw`DELETE FROM hp_form_field WHERE id = ${fid}`;
    }
    return formId;
  });
}

export async function setFormPublished(id: number, published: boolean): Promise<boolean> {
  await ensureAdminTables();
  return (await prisma.$executeRaw`UPDATE hp_form SET is_published = ${published}, updated_at = now() WHERE id = ${id}`) > 0;
}

// 回答があるフォームは消さない（Linext と同じ。非公開にしてもらう）
export async function deleteForm(id: number): Promise<"ok" | "has_answers"> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_form_submission WHERE form_id = ${id}`;
  if ((r?.n ?? 0) > 0) return "has_answers";
  await prisma.$executeRaw`DELETE FROM hp_form_field WHERE form_id = ${id}`;
  await prisma.$executeRaw`DELETE FROM hp_form WHERE id = ${id}`;
  return "ok";
}

// ---------- 回答を受け付ける ----------

export type UploadedFile = { fieldId: number; name: string; type: string; data: Buffer };

// 同じ人の5秒以内の二重送信は、前の回答をそのまま返す（Linext と同じ）。誰でも回答可のフォームは、同じ接続元から10分に10件まで
export async function isDuplicateOrFlood(formId: number, lineUserId: string | null, ip: string | null): Promise<"dup" | "flood" | null> {
  await ensureAdminTables();
  if (lineUserId) {
    const [d] = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM hp_form_submission WHERE form_id = ${formId} AND line_user_id = ${lineUserId} AND submitted_at > now() - interval '5 seconds'`;
    if ((d?.n ?? 0) > 0) return "dup";
  }
  if (ip) {
    const [f] = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM hp_form_submission WHERE form_id = ${formId} AND ip = ${ip} AND submitted_at > now() - interval '10 minutes'`;
    if ((f?.n ?? 0) >= 10) return "flood";
  }
  return null;
}

export async function saveSubmission(
  form: FormDetail,
  answers: Map<number, AnswerValue>,
  files: UploadedFile[],
  who: { lineUserId: string | null; lineName: string | null; staffId: number | null; ip: string | null; userAgent: string | null },
): Promise<number> {
  await ensureAdminTables();
  const byId = new Map(form.fields.map((f) => [f.id, f]));
  const sid = await prisma.$transaction(async (tx) => {
    const [r] = await tx.$queryRaw<{ id: number }[]>`
      INSERT INTO hp_form_submission (form_id, line_user_id, line_name, staff_id, ip, user_agent)
      VALUES (${form.id}, ${who.lineUserId}, ${who.lineName}, ${who.staffId}, ${who.ip}, ${who.userAgent}) RETURNING id`;
    for (const [fid, v] of answers) {
      if (!byId.has(fid)) continue;
      if (Array.isArray(v)) await tx.$executeRaw`INSERT INTO hp_form_answer (submission_id, field_id, value_json) VALUES (${r.id}, ${fid}, ${JSON.stringify(v)}::jsonb)`;
      else if (v.trim() !== "") await tx.$executeRaw`INSERT INTO hp_form_answer (submission_id, field_id, value_text) VALUES (${r.id}, ${fid}, ${v.trim()})`;
    }
    for (const f of files) {
      await tx.$executeRaw`
        INSERT INTO hp_form_file (submission_id, field_id, file_name, content_type, size, data)
        VALUES (${r.id}, ${f.fieldId}, ${f.name.slice(0, 200)}, ${f.type}, ${f.data.length}, ${f.data})`;
    }
    return r.id;
  });
  if (who.lineUserId) await afterLineSubmit(form, answers, who.lineUserId, who.lineName).catch((error) => console.error("form submit actions failed:", error));
  return sid;
}

// LINE ログイン必須のフォームに回答があったとき：友だちとして記録し、最終反応日を更新、回答時のタグ・ステータス・基本情報への反映、「フォーム回答時」の自動タグ
async function afterLineSubmit(form: FormDetail, answers: Map<number, AnswerValue>, userId: string, lineName: string | null) {
  await upsertFriend(userId);
  await prisma.$executeRaw`
    UPDATE hp_line_friend SET display_name = COALESCE(display_name, ${lineName}), last_action_at = now() WHERE line_user_id = ${userId}`;
  for (const tagId of form.on_submit_tag_ids) await addFriendTag(userId, tagId, null, false);
  await applyAutoTags(userId, "form_submit");
  if (form.on_submit_status) await setStatus(userId, form.on_submit_status, null);
  const mapped = form.fields.filter((f) => f.profile_key && !f.deleted);
  const updates: Partial<Profile> = {};
  for (const f of mapped) {
    const v = answers.get(f.id);
    if (typeof v === "string" && v.trim()) updates[f.profile_key as keyof Profile] = v.trim();
  }
  if (Object.keys(updates).length > 0) {
    // 入っていない項目は今の値のまま（回答に出てきた項目だけ書き換える）
    const [cur] = await prisma.$queryRaw<Profile[]>`
      SELECT ${Prisma.raw(PROFILE_FIELDS.map((p) => p.key).join(", "))} FROM hp_line_profile WHERE line_user_id = ${userId}`;
    await saveProfile(userId, { ...(cur ?? {}), ...updates }, null);
  }
}

// ---------- 回答を見る ----------

export type SubmissionRow = {
  id: number;
  submitted_at: Date;
  line_user_id: string | null;
  line_name: string | null; // 回答したときの LINE の表示名
  who: string; // 回答者の名前（LINE の友だち・スタッフ・回答の「氏名」から。わからなければ「（匿名）」）
  picture_url: string | null;
  staff_id: number | null;
  is_friend_row: boolean; // 友だち・求職者の詳細を開けるか
  answers: Map<number, { text: string | null; json: unknown }>;
  files: { id: number; field_id: number; file_name: string; size: number }[];
};

export async function listSubmissions(form: FormDetail, opts: { id?: number; lineUserId?: string } = {}): Promise<SubmissionRow[]> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<
    { id: number; submitted_at: Date; line_user_id: string | null; line_name: string | null; staff_id: number | null; display_name: string | null; picture_url: string | null; profile_name: string | null; staff_name: string | null; friend: boolean }[]
  >`
    SELECT s.id, s.submitted_at, s.line_user_id, s.line_name, s.staff_id, f.display_name, f.picture_url, p.name AS profile_name, st.name AS staff_name,
           (f.line_user_id IS NOT NULL) AS friend
    FROM hp_form_submission s
    LEFT JOIN hp_line_friend f ON f.line_user_id = s.line_user_id
    LEFT JOIN hp_line_profile p ON p.line_user_id = s.line_user_id
    LEFT JOIN staff st ON st.id = s.staff_id
    WHERE s.form_id = ${form.id}
      AND (${opts.id ?? null}::int IS NULL OR s.id = ${opts.id ?? null})
      AND (${opts.lineUserId ?? null}::text IS NULL OR s.line_user_id = ${opts.lineUserId ?? null})
    ORDER BY s.submitted_at DESC, s.id DESC
    LIMIT 2000`;
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [answers, files] = await Promise.all([
    prisma.$queryRaw<{ submission_id: number; field_id: number; value_text: string | null; value_json: unknown }[]>`
      SELECT submission_id, field_id, value_text, value_json FROM hp_form_answer WHERE submission_id = ANY(${ids}::int[])`,
    prisma.$queryRaw<{ id: number; submission_id: number; field_id: number; file_name: string; size: number }[]>`
      SELECT id, submission_id, field_id, file_name, size FROM hp_form_file WHERE submission_id = ANY(${ids}::int[]) ORDER BY id`,
  ]);
  const nameField = form.fields.find((f) => f.profile_key === "name");
  return rows.map((r) => {
    const own = new Map(answers.filter((a) => a.submission_id === r.id).map((a) => [a.field_id, { text: a.value_text, json: a.value_json }]));
    const answeredName = nameField ? own.get(nameField.id)?.text : null;
    return {
      id: r.id,
      submitted_at: r.submitted_at,
      line_user_id: r.line_user_id,
      line_name: r.display_name ?? r.line_name,
      who: r.profile_name ?? r.display_name ?? r.line_name ?? r.staff_name ?? answeredName ?? "（匿名）",
      picture_url: r.picture_url,
      staff_id: r.staff_id,
      is_friend_row: r.friend,
      answers: own,
      files: files.filter((f) => f.submission_id === r.id),
    };
  });
}

export async function deleteSubmission(id: number): Promise<number | null> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ form_id: number }[]>`SELECT form_id FROM hp_form_submission WHERE id = ${id}`;
  if (!r) return null;
  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM hp_form_answer WHERE submission_id = ${id}`,
    prisma.$executeRaw`DELETE FROM hp_form_file WHERE submission_id = ${id}`,
    prisma.$executeRaw`DELETE FROM hp_form_submission WHERE id = ${id}`,
  ]);
  return r.form_id;
}

export async function getFile(id: number) {
  await ensureAdminTables();
  const [f] = await prisma.$queryRaw<{ file_name: string; content_type: string; data: Uint8Array }[]>`SELECT file_name, content_type, data FROM hp_form_file WHERE id = ${id}`;
  return f ?? null;
}

// 友だち・求職者の詳細の「フォーム回答」：その人が答えたフォームと日時
export async function listFriendSubmissions(lineUserId: string) {
  await ensureAdminTables();
  return prisma.$queryRaw<{ id: number; form_id: number; title: string; submitted_at: Date }[]>`
    SELECT s.id, s.form_id, f.title, s.submitted_at FROM hp_form_submission s JOIN hp_form f ON f.id = s.form_id
    WHERE s.line_user_id = ${lineUserId} ORDER BY s.submitted_at DESC LIMIT 200`;
}

export const authModeLabel = (m: string) => AUTH_MODE_LABEL[m] ?? m;

// ---------- テンプレート ----------
// フォームの中身（質問・回答者の確かめ方・回答されたときの動き・説明文など）を名前を付けて取っておき、新しいフォームのもとにする。
// URL の名前と公開の有無は、フォームごとに決めるものなので入れない。質問の ID も入れない（新しいフォームでは新しい質問になる）

export type TemplateData = Omit<FormInput, "slug" | "is_published">;
export type TemplateRow = { id: number; name: string; description: string | null; data: TemplateData; updated_at: Date };

export function parseTemplateInput(b: Record<string, unknown>): { name: string; description: string | null; data: TemplateData } | string {
  const name = s(b.name, 100);
  if (!name) return "テンプレートの名前を入力してください。";
  const raw = b.data && typeof b.data === "object" ? (b.data as Record<string, unknown>) : null;
  if (!raw) return "テンプレートの中身がありません。";
  const parsed = parseFormInput({ ...raw, slug: "template", is_published: false });
  if (typeof parsed === "string") return parsed;
  const { slug: _slug, is_published: _pub, ...rest } = parsed;
  void _slug;
  void _pub;
  return { name, description: s(b.description, 500), data: { ...rest, fields: rest.fields.map((f) => ({ ...f, id: null })) } };
}

export async function listTemplates(): Promise<TemplateRow[]> {
  await ensureAdminTables();
  return prisma.$queryRaw<TemplateRow[]>`SELECT id, name, description, data, updated_at FROM hp_form_template ORDER BY updated_at DESC, id DESC`;
}

export async function getTemplate(id: number): Promise<TemplateRow | null> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<TemplateRow[]>`SELECT id, name, description, data, updated_at FROM hp_form_template WHERE id = ${id}`;
  return r ?? null;
}

export async function saveTemplate(id: number | null, t: { name: string; description: string | null; data: TemplateData }, adminId: number): Promise<number | null> {
  await ensureAdminTables();
  const data = JSON.stringify(t.data);
  if (id === null) {
    const [r] = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO hp_form_template (name, description, data, created_by) VALUES (${t.name}, ${t.description}, ${data}::jsonb, ${adminId}) RETURNING id`;
    return r.id;
  }
  const n = await prisma.$executeRaw`
    UPDATE hp_form_template SET name = ${t.name}, description = ${t.description}, data = ${data}::jsonb, updated_at = now() WHERE id = ${id}`;
  return n > 0 ? id : null;
}

export async function deleteTemplate(id: number): Promise<boolean> {
  await ensureAdminTables();
  return (await prisma.$executeRaw`DELETE FROM hp_form_template WHERE id = ${id}`) > 0;
}
