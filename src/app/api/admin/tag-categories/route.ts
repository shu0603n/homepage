import { NextResponse } from "next/server";
import { adminRequest, str } from "@/lib/admin/api";
import { deleteCategory, saveCategory } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";

// タグのカテゴリ：POST { name, sort_order }＝作成、PATCH { id, name, sort_order }＝変更、DELETE { id }＝削除（中のタグは「カテゴリなし」になる）
export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const name = str(r.body.name, 100);
  if (!name) return jsonError("カテゴリ名を入力してください。", 400);
  await saveCategory(null, name, Number.isInteger(r.body.sort_order) ? (r.body.sort_order as number) : 0);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const name = str(r.body.name, 100);
  if (!Number.isInteger(r.body.id)) return jsonError("カテゴリが見つかりません。", 404);
  if (!name) return jsonError("カテゴリ名を入力してください。", 400);
  await saveCategory(r.body.id as number, name, Number.isInteger(r.body.sort_order) ? (r.body.sort_order as number) : 0);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  if (!Number.isInteger(r.body.id)) return jsonError("カテゴリが見つかりません。", 404);
  await deleteCategory(r.body.id as number);
  return NextResponse.json({ ok: true });
}
