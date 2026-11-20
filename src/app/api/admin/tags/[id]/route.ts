import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { saveTag, setTagActive } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";
import { parseTag } from "@/lib/admin/tag-input";

// タグの更新（PATCH）。{ is_active } だけ送ると有効・無効の切り替え、それ以外はタグ名・色などの更新
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return jsonError("タグが見つかりません。", 404);
  if (Object.keys(r.body).length === 1 && typeof r.body.is_active === "boolean") {
    await setTagActive(id, r.body.is_active);
    return NextResponse.json({ ok: true });
  }
  const t = parseTag(r.body);
  if (typeof t === "string") return jsonError(t, 400);
  await saveTag(id, t);
  return NextResponse.json({ ok: true });
}
