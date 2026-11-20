import { NextResponse } from "next/server";
import { adminRequest, str } from "@/lib/admin/api";
import { getForm } from "@/lib/admin/forms";
import {
  addTab,
  createSpreadsheet,
  getSheetLink,
  inspectSpreadsheet,
  parseColumns,
  saveSheetSettings,
  saveSheetTarget,
  SheetError,
  sheetFieldsOf,
  spreadsheetIdOf,
  syncSubmissions,
  unlinkSheet,
  writeHeader,
} from "@/lib/admin/sheets";
import { jsonError } from "@/lib/auth/http";
import { defaultColumns } from "@/lib/sheet-columns";

// フォームの「スプレッドシート連携」の操作（POST { action, ... }）。仕組みは lib/admin/sheets.ts
//   create   新しいスプレッドシートを作って連携 { title, sheet_name }
//   inspect  既存のスプレッドシートを調べる（名前とシートの一覧）{ url }
//   link     既存のスプレッドシートに連携 { url, sheet_name, new_tab }
//   settings 見出しの行・どの列に何を入れるか・オン／オフ { header_row, columns, enabled }
//   header   見出し行に列の名前を書く
//   sync     まだ書いていない回答（失敗したものも）をまとめて書く
//   unlink   連携をやめる（スプレッドシートは消さない）
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const formId = Number((await params).id);
  const form = Number.isInteger(formId) && formId > 0 ? await getForm(formId) : null;
  if (!form) return jsonError("フォームが見つかりません。", 404);
  const b = r.body;
  try {
    switch (b.action) {
      case "create": {
        const title = str(b.title, 200) ?? `${form.title}（回答）`;
        const sheetName = str(b.sheet_name, 100) ?? "回答";
        const s = await createSpreadsheet(title, sheetName);
        await saveSheetTarget(formId, { spreadsheet_id: s.id, spreadsheet_title: s.title, sheet_name: s.sheetName }, r.session.id);
        // 新しいシートには、質問を順に並べた列の設定と見出しを入れておく（あとから自由に変えられる）
        await saveSheetSettings(formId, { header_row: 1, columns: defaultColumns(sheetFieldsOf(form)), enabled: true });
        await writeHeader(formId);
        return NextResponse.json({ ok: true });
      }
      case "inspect": {
        const id = spreadsheetIdOf(typeof b.url === "string" ? b.url : "");
        if (!id) return jsonError("スプレッドシートの URL を貼り付けてください（https://docs.google.com/spreadsheets/d/… の形）。", 400);
        return NextResponse.json({ ok: true, ...(await inspectSpreadsheet(id)) });
      }
      case "link": {
        const id = spreadsheetIdOf(typeof b.url === "string" ? b.url : "");
        const sheetName = str(b.sheet_name, 100);
        if (!id || !sheetName) return jsonError("スプレッドシートとシートを選んでください。", 400);
        const info = await inspectSpreadsheet(id);
        if (b.new_tab === true) {
          if (info.tabs.includes(sheetName)) return jsonError(`「${sheetName}」というシートはもうあります。別の名前にするか、既存のシートを選んでください。`, 400);
          await addTab(id, sheetName);
        } else if (!info.tabs.includes(sheetName)) return jsonError("そのシートが見つかりません。", 400);
        const before = await getSheetLink(formId);
        await saveSheetTarget(formId, { spreadsheet_id: id, spreadsheet_title: info.title, sheet_name: sheetName }, r.session.id);
        if (!before || before.columns.length === 0) await saveSheetSettings(formId, { header_row: 1, columns: defaultColumns(sheetFieldsOf(form)), enabled: true });
        return NextResponse.json({ ok: true });
      }
      case "settings": {
        const headerRow = Number(b.header_row);
        if (!Number.isInteger(headerRow) || headerRow < 0 || headerRow > 1000) return jsonError("見出しの行は 0〜1000 の数字にしてください（0＝見出しなし）。", 400);
        const columns = parseColumns(b.columns);
        if (typeof columns === "string") return jsonError(columns, 400);
        if (!(await saveSheetSettings(formId, { header_row: headerRow, columns, enabled: b.enabled !== false }))) return jsonError("先にスプレッドシートを連携してください。", 400);
        return NextResponse.json({ ok: true });
      }
      case "header": {
        const link = await getSheetLink(formId);
        if (link?.header_row === 0) return jsonError("見出しの行が 0（見出しなし）になっています。", 400);
        await writeHeader(formId);
        return NextResponse.json({ ok: true });
      }
      case "sync": {
        const res = await syncSubmissions(formId, { pending: true });
        if (res.error) return jsonError(res.error, 400);
        return NextResponse.json({ ok: true, written: res.written });
      }
      case "unlink":
        await unlinkSheet(formId);
        return NextResponse.json({ ok: true });
      default:
        return jsonError("無効な操作です。", 400);
    }
  } catch (error) {
    if (error instanceof SheetError) return jsonError(error.message, 400);
    console.error("sheet action failed:", error);
    return jsonError("スプレッドシートの操作に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
