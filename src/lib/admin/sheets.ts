import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureAdminTables } from "@/lib/admin/store";
import { getForm, getTemplate, listSubmissions, type FormDetail, type SubmissionRow } from "@/lib/admin/forms";
import { a1, cellValue, isColumn, sheetInput, sourceLabel, type SheetColumn, type SheetField, type SheetSubmission, type TemplateSheet } from "@/lib/sheet-columns";

// フォームの回答を Google スプレッドシートに書き込む（フォーム管理の「スプレッドシート連携」）。
//   ・会社の Google アカウントで一度「Google と連携」する（OAuth）。書き込みはそのアカウントの権限で行う
//     （新しいスプレッドシートはそのアカウントのドライブにでき、そのアカウントが編集できる既存のシートにも書ける）
//   ・連携の鍵（リフレッシュトークン）は、サイトの秘密鍵から作った鍵で暗号化して保存する
//   ・回答があったら、指定した列だけを「いちばん下の空いている行」に書く（ほかの列＝式や手書きのメモには触れない）
//   ・同じフォームに同時に回答があっても同じ行に書かないよう、フォームごとに順番待ちをする（データベースのロック）
// 環境変数（Amplify で設定）：GOOGLE_OAUTH_CLIENT_ID・GOOGLE_OAUTH_CLIENT_SECRET（Google Cloud の「OAuth クライアント ID」）

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/spreadsheets"].join(" ");
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

export const oauthConfigured = () => Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);

export class SheetError extends Error {}

// ---------- 連携の鍵の暗号化 ----------
const key = () => createHash("sha256").update(`${process.env.JWT_SECRET ?? ""}:google-oauth`).digest();
function encrypt(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}
function decrypt(s: string) {
  const [iv, tag, body] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

// ---------- Google との連携（OAuth） ----------
export function authUrl(state: string, redirectUri: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // あとから（人がいなくても）書き込めるように、リフレッシュトークンをもらう
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return u.toString();
}

export async function connectWithCode(code: string, redirectUri: string, adminId: number): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const json = (await res.json().catch(() => ({}))) as { refresh_token?: string; access_token?: string; id_token?: string; scope?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.refresh_token) throw new SheetError(`Google との連携に失敗しました（${json.error_description ?? res.status}）。`);
  if (!json.scope?.includes("spreadsheets")) throw new SheetError("スプレッドシートの権限が許可されませんでした。もう一度連携して、すべての項目にチェックを入れてください。");
  // メールアドレスは ID トークンの中身から（Google から直接受け取ったものなので、そのまま読む）
  let email: string | null = null;
  try {
    email = (JSON.parse(Buffer.from(json.id_token!.split(".")[1], "base64url").toString()) as { email?: string }).email ?? null;
  } catch {}
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_google_account (id, email, refresh_token_enc, scope, connected_by, connected_at)
    VALUES (1, ${email}, ${encrypt(json.refresh_token)}, ${json.scope ?? null}, ${adminId}, now())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, refresh_token_enc = EXCLUDED.refresh_token_enc, scope = EXCLUDED.scope,
      connected_by = EXCLUDED.connected_by, connected_at = EXCLUDED.connected_at`;
  cached = json.access_token ? { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 } : null;
  return email ?? "";
}

export async function getGoogleAccount() {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ email: string | null; connected_at: Date; connected_by_name: string | null }[]>`
    SELECT g.email, g.connected_at, COALESCE(a.name, a.email) AS connected_by_name
    FROM hp_google_account g LEFT JOIN hp_admin_user a ON a.id = g.connected_by WHERE g.id = 1`;
  return r ?? null;
}

export async function disconnectGoogle(): Promise<void> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ refresh_token_enc: string }[]>`SELECT refresh_token_enc FROM hp_google_account WHERE id = 1`;
  if (r) {
    // Google 側の許可も取り消す（失敗しても、こちらの記録は消す）
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(r.refresh_token_enc))}`, { method: "POST" }).catch(() => null);
  }
  await prisma.$executeRaw`DELETE FROM hp_google_account WHERE id = 1`;
  cached = null;
}

let cached: { value: string; expires: number } | null = null;
async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.value;
  if (!oauthConfigured()) throw new SheetError("Google との連携の設定（GOOGLE_OAUTH_CLIENT_ID など）がされていません。");
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ refresh_token_enc: string }[]>`SELECT refresh_token_enc FROM hp_google_account WHERE id = 1`;
  if (!r) throw new SheetError("Google と連携されていません。フォーム管理の「スプレッドシート連携」で「Google と連携」してください。");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!, refresh_token: decrypt(r.refresh_token_enc), grant_type: "refresh_token" }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") throw new SheetError("Google との連携が切れています（許可が取り消されたか、期限が切れました）。「Google と連携」からもう一度連携してください。");
    throw new SheetError(`Google にログインできませんでした（${json.error ?? res.status}）。`);
  }
  cached = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.value;
}

async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; status?: string } };
  if (!res.ok) {
    const msg = json.error?.message ?? String(res.status);
    if (res.status === 404) throw new SheetError("スプレッドシートが見つかりません。URL と、連携した Google アカウントで開けるか（共有）を確かめてください。");
    if (res.status === 403) throw new SheetError(`このスプレッドシートを編集する権限がありません（連携した Google アカウントに「編集者」の共有が必要です）。`);
    throw new SheetError(`スプレッドシートの操作に失敗しました（${msg}）。`);
  }
  return json;
}

// ---------- スプレッドシートを作る・調べる ----------
export const spreadsheetIdOf = (urlOrId: string) => urlOrId.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/)?.[1] ?? (/^[A-Za-z0-9_-]{20,}$/.test(urlOrId.trim()) ? urlOrId.trim() : null);
export const spreadsheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

export async function createSpreadsheet(title: string, sheetName: string) {
  const r = await api<{ spreadsheetId: string; properties: { title: string }; sheets: { properties: { title: string } }[] }>(SHEETS, {
    method: "POST",
    body: { properties: { title, locale: "ja_JP", timeZone: "Asia/Tokyo" }, sheets: [{ properties: { title: sheetName, gridProperties: { frozenRowCount: 1 } } }] },
  });
  return { id: r.spreadsheetId, title: r.properties.title, sheetName: r.sheets[0]?.properties.title ?? sheetName };
}

export async function inspectSpreadsheet(id: string) {
  const r = await api<{ properties: { title: string }; sheets: { properties: { title: string; sheetId: number } }[] }>(`${SHEETS}/${id}?fields=properties.title,sheets.properties(title,sheetId)`);
  return { id, title: r.properties.title, tabs: r.sheets.map((s) => s.properties.title) };
}

export async function addTab(id: string, name: string) {
  await api(`${SHEETS}/${id}:batchUpdate`, { method: "POST", body: { requests: [{ addSheet: { properties: { title: name, gridProperties: { frozenRowCount: 1 } } } }] } });
}

// ---------- フォームごとの連携の設定 ----------
export type SheetLink = {
  form_id: number;
  spreadsheet_id: string;
  spreadsheet_title: string | null;
  sheet_name: string;
  header_row: number;
  columns: SheetColumn[];
  enabled: boolean;
  last_synced_at: Date | null;
  last_error: string | null;
};

export async function getSheetLink(formId: number): Promise<SheetLink | null> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<SheetLink[]>`
    SELECT form_id, spreadsheet_id, spreadsheet_title, sheet_name, header_row, columns, enabled, last_synced_at, last_error FROM hp_form_sheet WHERE form_id = ${formId}`;
  return r ? { ...r, columns: Array.isArray(r.columns) ? r.columns : [] } : null;
}

export async function saveSheetTarget(formId: number, t: { spreadsheet_id: string; spreadsheet_title: string; sheet_name: string }, adminId: number) {
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_form_sheet (form_id, spreadsheet_id, spreadsheet_title, sheet_name, created_by)
    VALUES (${formId}, ${t.spreadsheet_id}, ${t.spreadsheet_title}, ${t.sheet_name}, ${adminId})
    ON CONFLICT (form_id) DO UPDATE SET spreadsheet_id = EXCLUDED.spreadsheet_id, spreadsheet_title = EXCLUDED.spreadsheet_title,
      sheet_name = EXCLUDED.sheet_name, last_error = NULL, updated_at = now()`;
}

// 列の設定を確かめる（だめならメッセージ）
export function parseColumns(raw: unknown): SheetColumn[] | string {
  if (!Array.isArray(raw)) return "列の設定が正しくありません。";
  if (raw.length > 200) return "列は200個までです。";
  const out: SheetColumn[] = [];
  const used = new Set<string>();
  for (const [i, x] of raw.entries()) {
    const c = (x ?? {}) as Record<string, unknown>;
    if (!isColumn(c.col)) return `${i + 1}行目：列は A〜ZZZ の形で入力してください。`;
    const col = c.col.toUpperCase();
    if (used.has(col)) return `${col}列が2回設定されています。1つの列には1つの内容だけにしてください。`;
    used.add(col);
    if (typeof c.source !== "string" || !c.source) return `${col}列：入れる内容を選んでください。`;
    out.push({ col, source: c.source.slice(0, 300), text: typeof c.text === "string" ? c.text.slice(0, 500) : undefined, mode: c.mode === "auto" ? "auto" : "text" });
  }
  return out;
}

export async function saveSheetSettings(formId: number, s: { header_row: number; columns: SheetColumn[]; enabled: boolean }) {
  await ensureAdminTables();
  return (
    (await prisma.$executeRaw`
      UPDATE hp_form_sheet SET header_row = ${s.header_row}, columns = ${JSON.stringify(s.columns)}::jsonb, enabled = ${s.enabled}, updated_at = now()
      WHERE form_id = ${formId}`) > 0
  );
}

export async function unlinkSheet(formId: number) {
  await ensureAdminTables();
  await prisma.$executeRaw`DELETE FROM hp_form_sheet WHERE form_id = ${formId}`;
}

export const sheetFieldsOf = (form: FormDetail): SheetField[] =>
  form.fields.map((f) => ({ uid: f.uid, type: f.type, label: f.label, options: f.options, other: f.logic?.other === true, deleted: f.deleted }));

// 見出し行に、各列の名前を書く
export async function writeHeader(formId: number) {
  const [form, link] = await Promise.all([getForm(formId), getSheetLink(formId)]);
  if (!form || !link) throw new SheetError("連携の設定が見つかりません。");
  if (link.columns.length === 0) throw new SheetError("先に、どの列に何を入れるかを設定してください。");
  const fields = sheetFieldsOf(form);
  await api(`${SHEETS}/${link.spreadsheet_id}/values:batchUpdate`, {
    method: "POST",
    body: {
      valueInputOption: "RAW",
      data: link.columns.map((c) => ({ range: a1(link.sheet_name, `${c.col}${link.header_row}`), values: [[sourceLabel(c, fields)]] })),
    },
  });
}

// ---------- 回答を書き込む ----------
function toSheetSubmission(form: FormDetail, s: SubmissionRow): SheetSubmission {
  const byId = new Map(form.fields.map((f) => [f.id, f]));
  const answers = new Map<string, { type: string; text: string | null; json: unknown }>();
  for (const [fid, a] of s.answers) {
    const f = byId.get(fid);
    if (f) answers.set(f.uid, { type: f.type, text: a.text, json: a.json });
  }
  const files = new Map<string, string[]>();
  for (const x of s.files) {
    const f = byId.get(x.field_id);
    if (f) files.set(f.uid, [...(files.get(f.uid) ?? []), x.file_name]);
  }
  return { id: s.id, submitted_at: s.submitted_at, who: s.who, line_name: s.line_name, line_user_id: s.line_user_id, staff_id: s.staff_id, answers, files };
}

// 書く行の準備：
//   ・シートの行が足りなければ足す（シートはふつう 1000 行。超えると書き込めないため、余裕を持って足す）
//   ・すぐ上の行（前の回答）の書式（色・罫線・文字・日付や数値の表示形式・そろえ方・入力規則）を、書く行にコピーする
//     （GAS で行ごとに付けていたような見た目を、そのまま引き継ぐ。シートの書式を変えれば、次の行からそれに合わせる）
// 書式のコピーができなくても、回答の書き込みは続ける
async function prepareRows(link: SheetLink, first: number, count: number) {
  const meta = await api<{ sheets: { properties: { title: string; sheetId: number; gridProperties?: { rowCount?: number } } }[] }>(
    `${SHEETS}/${link.spreadsheet_id}?fields=sheets.properties(title,sheetId,gridProperties.rowCount)`,
  );
  const sheet = meta.sheets.find((s) => s.properties.title === link.sheet_name)?.properties;
  if (!sheet) throw new SheetError(`シート「${link.sheet_name}」が見つかりません（名前が変わったか、消されました）。「書き込み先を変える」から選び直してください。`);
  const requests: unknown[] = [];
  const last = first + count - 1;
  const rows = sheet.gridProperties?.rowCount ?? 0;
  if (rows && last > rows) requests.push({ appendDimension: { sheetId: sheet.sheetId, dimension: "ROWS", length: last - rows + 100 } });
  if (first - 1 > link.header_row) {
    // 行の番号は 0 から数える（1行目＝0）。すぐ上の行の書式を、書く行（count 行）に貼る
    requests.push({
      copyPaste: {
        source: { sheetId: sheet.sheetId, startRowIndex: first - 2, endRowIndex: first - 1 },
        destination: { sheetId: sheet.sheetId, startRowIndex: first - 1, endRowIndex: first - 1 + count },
        pasteType: "PASTE_FORMAT",
        pasteOrientation: "NORMAL",
      },
    });
  }
  if (requests.length === 0) return;
  try {
    await api(`${SHEETS}/${link.spreadsheet_id}:batchUpdate`, { method: "POST", body: { requests } });
  } catch (error) {
    console.error("sheet row prepare failed:", error);
  }
}

// 回答をシートに書く（同じフォームの書き込みは1つずつ。いちばん下の空いている行を、設定した列の範囲で探す）
async function writeRows(form: FormDetail, link: SheetLink, subs: SubmissionRow[]) {
  if (link.columns.length === 0) throw new SheetError("どの列に何を入れるかが設定されていません。");
  // 設定した列だけを見て、いちばん下に書かれている行を探す（設定していない列の式やメモは数えない）
  const q = new URLSearchParams({ majorDimension: "COLUMNS" });
  for (const c of link.columns) q.append("ranges", a1(link.sheet_name, `${c.col}${link.header_row + 1}:${c.col}`));
  const got = await api<{ valueRanges?: { values?: unknown[][] }[] }>(`${SHEETS}/${link.spreadsheet_id}/values:batchGet?${q}`);
  const used = Math.max(0, ...(got.valueRanges ?? []).map((v) => v.values?.[0]?.length ?? 0));
  const first = link.header_row + 1 + used;
  await prepareRows(link, first, subs.length);
  const data = subs.flatMap((s, i) => {
    const row = first + i;
    const ss = toSheetSubmission(form, s);
    return link.columns.map((c) => ({ range: a1(link.sheet_name, `${c.col}${row}`), values: [[sheetInput(c, cellValue(c, ss, form.title))]] }));
  });
  await api(`${SHEETS}/${link.spreadsheet_id}/values:batchUpdate`, { method: "POST", body: { valueInputOption: "USER_ENTERED", data } });
  return first;
}

// 書き込む（回答があったとき・まとめて書くとき）。結果は回答ごとに記録する（失敗したものは、あとで「未送信の回答を書き込む」で書き直せる）
export async function syncSubmissions(formId: number, opts: { submissionId?: number; pending?: boolean; limit?: number } = {}): Promise<{ written: number; error: string | null }> {
  await ensureAdminTables();
  const [form, link] = await Promise.all([getForm(formId), getSheetLink(formId)]);
  if (!form || !link || (!link.enabled && opts.submissionId)) return { written: 0, error: null };
  // 書く前に必要なもの（書く回答・Google の鍵）をそろえておく。
  // 下の順番待ち（ロック）の間は、データベースの接続を1本ふさぐため、その間にほかの接続を使わないようにする（接続が足りなくなって止まらないように）
  const ids = opts.submissionId
    ? [opts.submissionId]
    : (
        await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM hp_form_submission WHERE form_id = ${formId} AND (sheet_status IS NULL OR sheet_status = 'error')
          ORDER BY submitted_at, id LIMIT ${opts.limit ?? 200}`
      ).map((r) => r.id);
  if (ids.length === 0) return { written: 0, error: null };
  const candidates = (await listSubmissions(form)).filter((s) => ids.includes(s.id));
  const fail = async (message: string, targetIds: number[]) => {
    await prisma.$executeRaw`UPDATE hp_form_submission SET sheet_status = 'error', sheet_error = ${message} WHERE id = ANY(${targetIds}::int[])`;
    await prisma.$executeRaw`UPDATE hp_form_sheet SET last_error = ${message} WHERE form_id = ${formId}`;
    return { written: 0, error: message };
  };
  try {
    await accessToken();
  } catch (error) {
    return fail(error instanceof SheetError ? error.message : "Google にログインできませんでした。", ids);
  }
  const result = await prisma.$transaction(
    async (tx) => {
      // 同じシートへの書き込みは順番に（別のフォームが同じシートに書くときも、同じ行に重ねて書かないように）
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${link.spreadsheet_id}!${link.sheet_name}`}))::text`;
      // 待っている間に、ほかの処理が書き終えた回答は除く
      const still = new Set(
        (
          await tx.$queryRaw<{ id: number }[]>`
            SELECT id FROM hp_form_submission WHERE id = ANY(${ids}::int[]) AND (sheet_status IS NULL OR sheet_status = 'error')`
        ).map((r) => r.id),
      );
      const subs = candidates.filter((s) => still.has(s.id)).sort((x, y) => x.submitted_at.getTime() - y.submitted_at.getTime() || x.id - y.id);
      if (subs.length === 0) return { written: 0, error: null as string | null };
      try {
        const first = await writeRows(form, link, subs);
        for (const [i, s] of subs.entries()) await tx.$executeRaw`UPDATE hp_form_submission SET sheet_status = 'ok', sheet_row = ${first + i}, sheet_error = NULL WHERE id = ${s.id}`;
        await tx.$executeRaw`UPDATE hp_form_sheet SET last_synced_at = now(), last_error = NULL WHERE form_id = ${formId}`;
        return { written: subs.length, error: null as string | null };
      } catch (error) {
        const message = error instanceof SheetError ? error.message : "スプレッドシートに書き込めませんでした。";
        if (!(error instanceof SheetError)) console.error("sheet sync failed:", error);
        for (const s of subs) await tx.$executeRaw`UPDATE hp_form_submission SET sheet_status = 'error', sheet_error = ${message} WHERE id = ${s.id}`;
        await tx.$executeRaw`UPDATE hp_form_sheet SET last_error = ${message} WHERE form_id = ${formId}`;
        return { written: 0, error: message };
      }
    },
    { timeout: 60_000, maxWait: 20_000 },
  );
  return result;
}

export async function pendingCount(formId: number): Promise<number> {
  await ensureAdminTables();
  const [r] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM hp_form_submission WHERE form_id = ${formId} AND (sheet_status IS NULL OR sheet_status = 'error')`;
  return r?.n ?? 0;
}

// ---------- テンプレート ----------

// フォームのいまの連携の設定を、テンプレートに入れる形にする（連携していなければ null）
export async function sheetForTemplate(formId: number): Promise<TemplateSheet | null> {
  const link = await getSheetLink(formId);
  if (!link) return null;
  return { spreadsheet_id: link.spreadsheet_id, spreadsheet_title: link.spreadsheet_title, sheet_name: link.sheet_name, header_row: link.header_row, columns: link.columns, enabled: link.enabled };
}

// テンプレートから作ったフォームに、スプレッドシート連携を引き継ぐ。
//   same：テンプレートと同じスプレッドシート・シートに書く（列の設定もそのまま）
//   new ：新しいスプレッドシートを作り、列の設定だけ引き継いで見出しを書く
// 引き継げなかった（Google と連携していない など）ときは "failed"。フォームはそのまま作られている
export async function applyTemplateSheet(formId: number, templateId: number, mode: "same" | "new", adminId: number): Promise<"ok" | "failed" | "none"> {
  const [tpl, form] = await Promise.all([getTemplate(templateId), getForm(formId)]);
  const t = tpl?.data.sheet;
  if (!t || !form) return "none";
  try {
    if (mode === "same") {
      await saveSheetTarget(formId, { spreadsheet_id: t.spreadsheet_id, spreadsheet_title: t.spreadsheet_title ?? "", sheet_name: t.sheet_name }, adminId);
      await saveSheetSettings(formId, { header_row: t.header_row, columns: t.columns, enabled: t.enabled });
    } else {
      const s = await createSpreadsheet(`${form.title}（回答）`, t.sheet_name || "回答");
      await saveSheetTarget(formId, { spreadsheet_id: s.id, spreadsheet_title: s.title, sheet_name: s.sheetName }, adminId);
      await saveSheetSettings(formId, { header_row: t.header_row || 1, columns: t.columns, enabled: t.enabled });
      if ((t.header_row || 1) > 0) await writeHeader(formId);
    }
    return "ok";
  } catch (error) {
    console.error("template sheet apply failed:", error);
    return "failed";
  }
}
