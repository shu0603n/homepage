import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { deleteForm, parseFormInput, saveForm, setFormPublished } from "@/lib/admin/forms";
import { jsonError } from "@/lib/auth/http";

// フォームの保存（PUT：全体）・公開／非公開の切り替え（PATCH { is_published }）・削除（DELETE。回答があるものは消さない）
const formId = async (params: Promise<{ id: string }>) => {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = await formId(params);
  if (!id) return jsonError("フォームが見つかりません。", 404);
  const input = parseFormInput(r.body);
  if (typeof input === "string") return jsonError(input, 400);
  const saved = await saveForm(id, input, r.session.id);
  if (saved === "slug_taken") return jsonError("この URL の名前は、ほかのフォームで使われています。別の名前にしてください。", 409);
  if (saved === "not_found") return jsonError("フォームが見つかりません。", 404);
  return NextResponse.json({ ok: true, id: saved });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = await formId(params);
  if (!id || typeof r.body.is_published !== "boolean") return jsonError("無効なリクエストです。", 400);
  if (!(await setFormPublished(id, r.body.is_published))) return jsonError("フォームが見つかりません。", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request);
  if (r instanceof Response) return r;
  const id = await formId(params);
  if (!id) return jsonError("フォームが見つかりません。", 404);
  if ((await deleteForm(id)) === "has_answers") return jsonError("回答があるフォームは削除できません。受け付けを止めるときは「非公開」にしてください。", 409);
  return NextResponse.json({ ok: true });
}
