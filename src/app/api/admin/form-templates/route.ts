import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { parseTemplateInput, saveTemplate } from "@/lib/admin/forms";
import { jsonError } from "@/lib/auth/http";

// フォームのテンプレートを作る（POST { name, description, data: フォームの中身 }）
export async function POST(request: Request) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const t = parseTemplateInput(r.body);
  if (typeof t === "string") return jsonError(t, 400);
  const id = await saveTemplate(null, t, r.session.id);
  return NextResponse.json({ ok: true, id });
}
