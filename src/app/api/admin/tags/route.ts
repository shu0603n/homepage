import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { saveTag } from "@/lib/admin/crm";
import { parseTag } from "@/lib/admin/tag-input";
import { jsonError } from "@/lib/auth/http";

// タグの作成（POST）。項目は ./[id]/ の更新と同じ（lib/admin/tag-input.ts）
export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const t = parseTag(r.body);
  if (typeof t === "string") return jsonError(t, 400);
  const id = await saveTag(null, t);
  return NextResponse.json({ ok: true, id });
}
