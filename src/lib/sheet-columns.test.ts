import { describe, expect, it } from "vitest";
import { a1, cellValue, colIndex, colLetter, defaultColumns, isColumn, sheetInput, sourceLabel, type SheetField, type SheetSubmission } from "@/lib/sheet-columns";

const fields: SheetField[] = [
  { uid: "q1", type: "SHORT_TEXT", label: "お名前", options: [], other: false },
  { uid: "p2", type: "SECTION", label: "ページ2", options: [], other: false },
  { uid: "q2", type: "SINGLE_CHOICE", label: "働き方", options: ["正社員", "派遣"], other: true },
  { uid: "q3", type: "MULTI_CHOICE", label: "曜日", options: ["月", "火"], other: true },
  { uid: "q4", type: "FILE", label: "履歴書", options: [], other: false },
];
const sub: SheetSubmission = {
  id: 12,
  submitted_at: new Date("2026-11-21T05:03:09Z"),
  who: "山田 花子",
  line_name: "はなこ",
  line_user_id: "Uabc",
  staff_id: null,
  answers: new Map([
    ["q1", { type: "SHORT_TEXT", text: "=HYPERLINK(\"x\")", json: null }],
    ["q2", { type: "SINGLE_CHOICE", text: "その他：学生", json: null }],
    ["q3", { type: "MULTI_CHOICE", text: null, json: ["月", "その他：土"] }],
    ["q5", { type: "DATE", text: "2026-12-01", json: null }],
  ]),
  files: new Map([["q4", ["a.pdf", "b.png"]]]),
};

describe("sheet columns", () => {
  it("列の文字と番号", () => {
    expect(colIndex("A")).toBe(1);
    expect(colIndex("z")).toBe(26);
    expect(colIndex("AA")).toBe(27);
    expect(colLetter(27)).toBe("AA");
    expect(colLetter(702)).toBe("ZZ");
    expect(colLetter(703)).toBe("AAA");
    expect(isColumn("ab")).toBe(true);
    expect(isColumn("A1")).toBe(false);
  });

  it("値：日時は日本時間、答え・ファイル・選択肢の印", () => {
    expect(cellValue({ col: "A", source: "submitted_at" }, sub, "F")).toBe("2026/11/21 14:03:09");
    expect(cellValue({ col: "A", source: "submitted_date" }, sub, "F")).toBe("2026/11/21");
    expect(cellValue({ col: "A", source: "q:q4" }, sub, "F")).toBe("a.pdf、b.png");
    expect(cellValue({ col: "A", source: "q:q3" }, sub, "F")).toBe("月、その他：土");
    expect(cellValue({ col: "A", source: "opt:q3:月" }, sub, "F")).toBe("○");
    expect(cellValue({ col: "A", source: "opt:q3:火" }, sub, "F")).toBe("");
    expect(cellValue({ col: "A", source: "opt:q2:__other", text: "該当" }, sub, "F")).toBe("該当");
    expect(cellValue({ col: "A", source: "const", text: "HP" }, sub, "F")).toBe("HP");
    expect(cellValue({ col: "A", source: "form_title" }, sub, "面談")).toBe("面談");
    expect(cellValue({ col: "A", source: "staff_id" }, sub, "F")).toBe("");
    expect(cellValue({ col: "A", source: "q:q5" }, sub, "F")).toBe("2026/12/01");
  });

  it("式として動かないように、文字の列と式に見える値には ' を付ける", () => {
    expect(sheetInput({ col: "A", source: "q:q1", mode: "text" }, "=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(sheetInput({ col: "A", source: "q:q1", mode: "auto" }, "=1+1")).toBe("'=1+1");
    expect(sheetInput({ col: "A", source: "submitted_at", mode: "auto" }, "2026/11/21 14:03:09")).toBe("2026/11/21 14:03:09");
    expect(sheetInput({ col: "A", source: "q:q1", mode: "text" }, "090-1234-5678")).toBe("'090-1234-5678");
    expect(sheetInput({ col: "A", source: "q:q1", mode: "text" }, "")).toBe("");
  });

  it("見出しの名前と、質問を並べた初期の列", () => {
    expect(sourceLabel({ col: "A", source: "opt:q2:__other" }, fields)).toBe("働き方：その他");
    expect(sourceLabel({ col: "A", source: "q:zz" }, fields)).toBe("（削除した質問）");
    expect(defaultColumns(fields).map((c) => `${c.col}=${c.source}`)).toEqual(["A=submitted_at", "B=who", "C=q:q1", "D=q:q2", "E=q:q3", "F=q:q4"]);
  });

  it("シート名の A1 形式（' はかさねる）", () => {
    expect(a1("回答", "A2:C")).toBe("'回答'!A2:C");
    expect(a1("O'Brien", "A1")).toBe("'O''Brien'!A1");
  });
});
