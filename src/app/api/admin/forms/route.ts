import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { parseFormInput, saveForm } from "@/lib/admin/forms";
import { applyTemplateSheet } from "@/lib/admin/sheets";
import { jsonError } from "@/lib/auth/http";

// フォームを作る（POST）。中身は lib/admin/forms.ts の parseFormInput を参照
export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const input = parseFormInput(r.body);
  if (typeof input === "string") return jsonError(input, 400);
  const id = await saveForm(null, input, r.session.id);
  if (id === "slug_taken") return jsonError("この URL の名前は、ほかのフォームで使われています。別の名前にしてください。", 409);
  if (id === "not_found") return jsonError("フォームが見つかりません。", 404);
  // テンプレートから作ったとき：スプレッドシート連携を引き継ぐ（template_id と sheet_mode＝same／new。none なら引き継がない）
  const tplId = r.body.template_id;
  const mode = r.body.sheet_mode;
  const sheet = Number.isInteger(tplId) && (mode === "same" || mode === "new") ? await applyTemplateSheet(id, tplId as number, mode, r.session.id) : "none";
  return NextResponse.json({ ok: true, id, sheet });
}
