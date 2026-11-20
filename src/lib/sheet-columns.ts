import { answerText, isInputType, isOtherValue, OTHER, OTHER_KEY, type FieldType } from "@/lib/forms-def";

// フォームの回答を Google スプレッドシートに書くときの「どの列に何を入れるか」（管理画面とサーバーで共通。データベースには触れない）。
//   col：列（"A"〜"ZZZ"）
//   source：入れる内容
//     submitted_at 回答日時／submitted_date 回答日／who 回答者名／line_name LINE の表示名／line_user_id LINE の ID／
//     staff_id スタッフ ID／form_title フォーム名／submission_id 回答番号／const 決まった文字（text）／
//     q:<質問の uid> その質問の答え／opt:<質問の uid>:<選択肢> その選択肢を選んでいたら text（無ければ「○」）
//   mode：text＝書いたとおりの文字で入れる（式としては扱わない）／auto＝スプレッドシートに数値・日付として読ませる
export type SheetColumn = { col: string; source: string; text?: string; mode?: "text" | "auto" };

// テンプレートに取っておくスプレッドシート連携の設定（書き込み先と、どの列に何を入れるか）
export type TemplateSheet = { spreadsheet_id: string; spreadsheet_title: string | null; sheet_name: string; header_row: number; columns: SheetColumn[]; enabled: boolean };

export const BASIC_SOURCES = [
  { key: "submitted_at", label: "回答日時" },
  { key: "submitted_date", label: "回答日" },
  { key: "who", label: "回答者名" },
  { key: "line_name", label: "LINE の表示名" },
  { key: "line_user_id", label: "LINE ユーザー ID" },
  { key: "staff_id", label: "スタッフ ID" },
  { key: "form_title", label: "フォーム名" },
  { key: "submission_id", label: "回答番号" },
  { key: "const", label: "決まった文字（毎回同じ）" },
] as const;
const BASIC_LABEL: Record<string, string> = Object.fromEntries(BASIC_SOURCES.map((s) => [s.key, s.label]));

export type SheetField = { uid: string; type: FieldType | string; label: string; options: string[]; other: boolean; deleted?: boolean };

// 「A」→1、「AA」→27（列の番号）
export const colIndex = (col: string) => [...col.toUpperCase()].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
export const colLetter = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};
export const isColumn = (col: unknown): col is string => typeof col === "string" && /^[A-Za-z]{1,3}$/.test(col) && colIndex(col) <= 18278;

// 見出しに書く名前（管理画面の一覧でも使う）
export function sourceLabel(c: SheetColumn, fields: SheetField[]): string {
  if (c.source === "const") return c.text?.trim() ? c.text.trim() : BASIC_LABEL.const;
  if (BASIC_LABEL[c.source]) return BASIC_LABEL[c.source];
  const [kind, uid, ...rest] = c.source.split(":");
  const f = fields.find((x) => x.uid === uid);
  if (!f) return "（削除した質問）";
  if (kind === "q") return f.label;
  if (kind === "opt") {
    const opt = rest.join(":");
    return `${f.label}：${opt === OTHER_KEY ? OTHER : opt}`;
  }
  return c.source;
}

// 選べる内容（管理画面のプルダウン）：基本の項目 → 質問の答え → 選択肢ごとの印
export function sourceChoices(fields: SheetField[]) {
  const qs = fields.filter((f) => isInputType(f.type) && !f.deleted);
  return [
    { group: "基本", items: BASIC_SOURCES.map((s) => ({ value: s.key, label: s.label })) },
    { group: "質問の答え", items: qs.map((f) => ({ value: `q:${f.uid}`, label: f.label || "（無題の質問）" })) },
    {
      group: "選んだ選択肢に印（○）",
      items: qs
        .filter((f) => ["SINGLE_CHOICE", "MULTI_CHOICE", "SELECT"].includes(f.type))
        .flatMap((f) => [...f.options, ...(f.other ? [OTHER_KEY] : [])].map((o) => ({ value: `opt:${f.uid}:${o}`, label: `${f.label}：${o === OTHER_KEY ? OTHER : o}` }))),
    },
  ];
}

// 「質問を全部並べる」：A 回答日時、B 回答者名、C から質問の順
export function defaultColumns(fields: SheetField[]): SheetColumn[] {
  const qs = fields.filter((f) => isInputType(f.type) && !f.deleted);
  return [
    { col: "A", source: "submitted_at", mode: "auto" as const },
    { col: "B", source: "who", mode: "text" as const },
    ...qs.map((f, i) => ({ col: colLetter(3 + i), source: `q:${f.uid}`, mode: "text" as const })),
  ];
}

const jst = (d: Date, withTime: boolean) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return withTime ? `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}` : `${p.year}/${p.month}/${p.day}`;
};

export type SheetSubmission = {
  id: number;
  submitted_at: Date;
  who: string;
  line_name: string | null;
  line_user_id: string | null;
  staff_id: number | null;
  answers: Map<string, { type: string; text: string | null; json: unknown }>; // 質問の uid → 答え
  files: Map<string, string[]>; // 質問の uid → 添付ファイル名
};

// 1つの列に入れる値（文字）
export function cellValue(c: SheetColumn, s: SheetSubmission, formTitle: string): string {
  switch (c.source) {
    case "submitted_at":
      return jst(s.submitted_at, true);
    case "submitted_date":
      return jst(s.submitted_at, false);
    case "who":
      return s.who;
    case "line_name":
      return s.line_name ?? "";
    case "line_user_id":
      return s.line_user_id ?? "";
    case "staff_id":
      return s.staff_id === null ? "" : String(s.staff_id);
    case "form_title":
      return formTitle;
    case "submission_id":
      return String(s.id);
    case "const":
      return c.text ?? "";
  }
  const [kind, uid, ...rest] = c.source.split(":");
  if (kind === "q") {
    const files = s.files.get(uid);
    if (files?.length) return files.join("、");
    const a = s.answers.get(uid);
    return a ? answerText(a.type, a.text, a.json) : "";
  }
  if (kind === "opt") {
    const opt = rest.join(":");
    const a = s.answers.get(uid);
    if (!a) return "";
    const values = Array.isArray(a.json) ? (a.json as string[]) : a.text ? [a.text] : [];
    const hit = opt === OTHER_KEY ? values.some((v) => isOtherValue(v)) : values.includes(opt);
    return hit ? c.text?.trim() || "○" : "";
  }
  return "";
}

// スプレッドシートに送る形にする。text の列と、式に見える値（= + - @ で始まる）は、先頭に「'」を付けて文字として入れる
// （回答者が「=IMPORTXML(...)」などを入れても、式として動かないように）
export function sheetInput(c: SheetColumn, value: string): string {
  if (value === "") return "";
  if (c.mode === "auto" && !/^[=+\-@]/.test(value)) return value;
  return `'${value}`;
}

// シート名を A1 形式の範囲に入れるときの書き方（'シート名'!A1）
export const a1 = (sheet: string, range: string) => `'${sheet.replace(/'/g, "''")}'!${range}`;
