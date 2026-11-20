import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { parseTemplateInput, saveTemplate } from "@/lib/admin/forms";
import { sheetForTemplate } from "@/lib/admin/sheets";
import { jsonError } from "@/lib/auth/http";

// フォームのテンプレートを作る（POST { name, description, data: フォームの中身, sheet_from_form?: フォームの ID }）。
// sheet_from_form があれば、そのフォームのスプレッドシート連携の設定（書き込み先・どの列に何を入れるか）もテンプレートに入れる
export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const t = parseTemplateInput(r.body);
  if (typeof t === "string") return jsonError(t, 400);
  const from = r.body.sheet_from_form;
  if (Number.isInteger(from) && (from as number) > 0) t.data.sheet = await sheetForTemplate(from as number);
  const id = await saveTemplate(null, t, r.session.id);
  return NextResponse.json({ ok: true, id });
}
