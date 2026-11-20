// フォーム管理（Linext から移植）で、管理画面・回答ページ・サーバーが共通に使う定義。
// データベースには触れないので、画面（ブラウザ）からも読み込める

export const FIELD_TYPES = [
  { key: "SHORT_TEXT", label: "短文回答", icon: "bi-input-cursor-text" },
  { key: "LONG_TEXT", label: "長文回答", icon: "bi-text-paragraph" },
  { key: "SINGLE_CHOICE", label: "単一選択（ラジオ）", icon: "bi-ui-radios" },
  { key: "MULTI_CHOICE", label: "複数選択（チェックボックス）", icon: "bi-ui-checks" },
  { key: "SELECT", label: "プルダウン選択", icon: "bi-menu-button-wide" },
  { key: "DATE", label: "日付", icon: "bi-calendar3" },
  { key: "TIME", label: "時刻", icon: "bi-clock" },
  { key: "NUMBER", label: "数値", icon: "bi-123" },
  { key: "PHONE", label: "電話番号", icon: "bi-telephone" },
  { key: "EMAIL", label: "メールアドレス", icon: "bi-envelope" },
  { key: "ADDRESS", label: "住所", icon: "bi-geo-alt" },
  { key: "FILE", label: "ファイル添付", icon: "bi-paperclip" },
  { key: "CONSENT", label: "同意チェック", icon: "bi-check2-square" },
  { key: "DESCRIPTION", label: "説明文（回答不要）", icon: "bi-info-circle" },
  { key: "SECTION", label: "セクション（ページの区切り）", icon: "bi-layout-split" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["key"];
export const FIELD_TYPE_LABEL: Record<string, string> = Object.fromEntries(FIELD_TYPES.map((t) => [t.key, t.label]));
export const isFieldType = (v: unknown): v is FieldType => typeof v === "string" && v in FIELD_TYPE_LABEL;
export const CHOICE_TYPES: readonly string[] = ["SINGLE_CHOICE", "MULTI_CHOICE", "SELECT"];
// 回答の要らない項目（説明文・セクションの区切り）。回答一覧・CSV・必須の確認では除く
export const isInputType = (t: string) => t !== "DESCRIPTION" && t !== "SECTION";
// 回答によって次のセクションを変えられる質問（Google フォームと同じく、単一選択とプルダウン）
export const BRANCH_TYPES: readonly string[] = ["SINGLE_CHOICE", "SELECT"];

// 回答者の確かめ方：line＝LINE ログインが必要（誰が答えたか LINE の友だちと結び付く）／open＝誰でも回答できる
export const AUTH_MODES = [
  { key: "line", label: "LINE ログイン必須", help: "LINE でログインしてから回答します。回答は LINE の友だち（求職者）と結び付き、タグ・ステータス・基本情報にも反映できます。" },
  { key: "open", label: "誰でも回答可", help: "ログインなしで誰でも回答できます。回答者は、回答の中身（氏名・連絡先など）で確かめます。" },
] as const;
export type AuthMode = (typeof AUTH_MODES)[number]["key"];
export const AUTH_MODE_LABEL: Record<string, string> = Object.fromEntries(AUTH_MODES.map((m) => [m.key, m.label]));

// 回答を、求職者の基本情報のどの項目に入れるか（lib/admin/crm.ts の PROFILE_FIELDS と同じキー）
export const PROFILE_TARGETS = [
  { key: "name", label: "氏名" },
  { key: "name_kana", label: "フリガナ" },
  { key: "phone", label: "電話番号" },
  { key: "email", label: "メールアドレス" },
  { key: "postal_code", label: "郵便番号" },
  { key: "prefecture", label: "都道府県" },
  { key: "city", label: "市区町村" },
  { key: "nearest_station", label: "最寄駅" },
  { key: "desired_job_type", label: "希望職種" },
  { key: "desired_work_location", label: "希望勤務地" },
  { key: "desired_employment_type", label: "希望雇用形態" },
  { key: "desired_salary", label: "希望給与" },
  { key: "desired_start_timing", label: "転職希望時期" },
] as const;
export const PROFILE_TARGET_LABEL: Record<string, string> = Object.fromEntries(PROFILE_TARGETS.map((p) => [p.key, p.label]));

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,59}$/;

// 添付ファイル：PDF・JPEG・PNG・WebP、1つ 4MB まで（送信全体でも 4.5MB まで。サーバーが受け取れる大きさの上限のため）
export const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const FILE_MAX = 4 * 1024 * 1024;
export const FILES_TOTAL_MAX = 4.5 * 1024 * 1024;

// 分岐の設定（Google フォームの「回答に応じてセクションに移動」「セクション N 以降」と同じ）。
//   行き先：""＝いつもどおり（次のセクション）／"submit"＝フォームを送信／セクションの uid＝そのセクションへ
//   next：セクションの区切り（SECTION）に付ける「このセクションのあと」の行き先
//   branches：単一選択・プルダウンに付ける「この回答なら、ここへ」（選択肢 → 行き先）
export type FieldLogic = { next?: string; branches?: Record<string, string> };
export type FormLogic = { first_next?: string }; // 最初のセクション（区切りより前）のあとの行き先

export type PublicField = { id: number; uid: string; type: FieldType; label: string; help: string | null; required: boolean; options: string[]; logic: FieldLogic | null };

export type AnswerValue = string | string[];

const MAX_LEN: Partial<Record<FieldType, number>> = { SHORT_TEXT: 500, LONG_TEXT: 5000, ADDRESS: 500, PHONE: 30, EMAIL: 254, NUMBER: 30 };

// 1つの回答を確かめる。正しければ null、だめなら利用者向けのメッセージ（画面とサーバーで同じ判定を使う）
export function checkAnswer(f: PublicField, v: AnswerValue | undefined): string | null {
  if (!isInputType(f.type) || f.type === "FILE") return null; // ファイルは別に確かめる
  const empty = v === undefined || (typeof v === "string" ? v.trim() === "" || (f.type === "CONSENT" && v !== "true") : v.length === 0);
  if (empty) return f.required ? (f.type === "CONSENT" ? "同意が必要です" : "必須項目です") : null;
  if (f.type === "MULTI_CHOICE") {
    if (!Array.isArray(v) || v.some((x) => !f.options.includes(x))) return "選択肢から選んでください";
    return null;
  }
  if (typeof v !== "string") return "入力内容を確認してください";
  const s = v.trim();
  const max = MAX_LEN[f.type];
  if (max && s.length > max) return `${max}文字以内で入力してください`;
  switch (f.type) {
    case "SINGLE_CHOICE":
    case "SELECT":
      return f.options.includes(s) ? null : "選択肢から選んでください";
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : "メールアドレスの形式で入力してください";
    case "PHONE":
      return /^[0-9０-９+\-－ ()（）]{8,30}$/.test(s) && s.replace(/\D/g, "").length >= 8 ? null : "電話番号を確認してください";
    case "NUMBER":
      return /^-?\d+(\.\d+)?$/.test(s) ? null : "数字で入力してください";
    case "DATE":
      return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? null : "日付を確認してください";
    case "TIME":
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? null : "時刻を確認してください";
    case "CONSENT":
      return s === "true" ? null : "同意が必要です";
    default:
      return null;
  }
}

// 回答の表示用の文字（一覧・CSV で使う）
export function answerText(type: string, text: string | null, json: unknown): string {
  if (Array.isArray(json)) return json.join("、");
  if (type === "CONSENT") return text === "true" ? "同意する" : text ? "同意しない" : "";
  return text ?? "";
}

// ---------- セクション（ページ）と分岐 ----------
// 質問の並びを、セクションの区切りでページに分ける。最初のページは区切りより前の質問（uid は "_start"）
export type Section = { uid: string; title: string | null; help: string | null; fields: PublicField[]; next: string };

export function splitSections(fields: PublicField[], logic: FormLogic | null): Section[] {
  const sections: Section[] = [{ uid: "_start", title: null, help: null, fields: [], next: logic?.first_next ?? "" }];
  for (const f of fields) {
    if (f.type === "SECTION") sections.push({ uid: f.uid, title: f.label, help: f.help, fields: [], next: f.logic?.next ?? "" });
    else sections[sections.length - 1].fields.push(f);
  }
  // 区切りが先頭にあって、最初のページに何も無いときは、その空のページを飛ばす
  if (sections.length > 1 && sections[0].fields.length === 0) sections.shift();
  return sections;
}

// いまのページ（i）の回答から、次のページの番号を出す（"submit"＝ここで送信）。
// 同じページに分岐する質問が複数あるときは、あとの質問の回答を優先する（Google フォームと同じ）。
// 行き先は、いまより後ろのセクションだけ（前に戻る設定は無視して次へ。行ったり来たりが止まらなくならないように）
export function nextSection(sections: Section[], i: number, answers: Record<number, AnswerValue | undefined>): number | "submit" {
  const sec = sections[i];
  let target = "";
  for (const f of sec.fields) {
    if (!BRANCH_TYPES.includes(f.type) || !f.logic?.branches) continue;
    const v = answers[f.id];
    if (typeof v === "string" && v && f.logic.branches[v]) target = f.logic.branches[v];
  }
  if (!target) target = sec.next;
  if (target === "submit") return "submit";
  if (target) {
    const j = sections.findIndex((x) => x.uid === target);
    if (j > i) return j;
  }
  return i + 1 < sections.length ? i + 1 : "submit";
}

// 回答の内容から、通るページを最初から順に出す（サーバーで、必須の確認と、通らなかったページの回答を捨てるのに使う）
export function visitedSections(sections: Section[], answers: Record<number, AnswerValue | undefined>): number[] {
  const path: number[] = [];
  let i: number | "submit" = 0;
  while (i !== "submit" && path.length <= sections.length) {
    path.push(i);
    i = nextSection(sections, i, answers);
  }
  return path;
}
