import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { addFriendTag, friendExists, isLineUserId, removeFriendTag } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";

// 友だちにタグを付ける（POST { tag_id }）・外す（DELETE { tag_id }）
async function handle(request: Request, params: Promise<{ id: string }>, add: boolean) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = (await params).id;
  const tagId = r.body.tag_id;
  if (!isLineUserId(id) || !(await friendExists(id))) return jsonError("友だちが見つかりません。", 404);
  if (!Number.isInteger(tagId)) return jsonError("タグが正しくありません。", 400);
  if (!add) {
    await removeFriendTag(id, tagId as number);
    return NextResponse.json({ ok: true });
  }
  const result = await addFriendTag(id, tagId as number, r.session.id);
  if (result === "not_found") return jsonError("タグが見つからないか、無効になっています。", 404);
  if (result === "not_allowed") return jsonError("このタグは手動では付けられません（自動付与のみ）。", 400);
  return NextResponse.json({ ok: true });
}

export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, true);
}
export function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, false);
}
