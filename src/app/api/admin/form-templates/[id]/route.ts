import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { deleteTemplate, parseTemplateInput, saveTemplate } from "@/lib/admin/forms";
import { jsonError } from "@/lib/auth/http";

// フォームのテンプレートの保存（PUT）・削除（DELETE）。テンプレートを消しても、それから作ったフォームはそのまま
const tplId = async (params: Promise<{ id: string }>) => {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = await tplId(params);
  if (!id) return jsonError("テンプレートが見つかりません。", 404);
  const t = parseTemplateInput(r.body);
  if (typeof t === "string") return jsonError(t, 400);
  if ((await saveTemplate(id, t, r.session.id)) === null) return jsonError("テンプレートが見つかりません。", 404);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request);
  if (r instanceof Response) return r;
  const id = await tplId(params);
  if (!id || !(await deleteTemplate(id))) return jsonError("テンプレートが見つかりません。", 404);
  return NextResponse.json({ ok: true });
}
