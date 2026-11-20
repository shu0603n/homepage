import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { deleteSubmission } from "@/lib/admin/forms";
import { jsonError } from "@/lib/auth/http";

// 回答を1件消す（いたずら・テストの回答など）。添付ファイルも一緒に消す
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request);
  if (r instanceof Response) return r;
  const formId = await deleteSubmission(Number((await params).id) || 0);
  if (formId === null) return jsonError("回答が見つかりません。", 404);
  return NextResponse.json({ ok: true, formId });
}
