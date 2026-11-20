import { NextResponse } from "next/server";
import { adminRequest, str } from "@/lib/admin/api";
import { addNote, friendExists, isLineUserId } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";

// 個別チャットの内部メモを足す（相手には送られない）。{ body }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = (await params).id;
  if (!isLineUserId(id) || !(await friendExists(id))) return jsonError("友だちが見つかりません。", 404);
  const body = str(r.body.body, 5000);
  if (!body) return jsonError("メモを入力してください。", 400);
  await addNote(id, body, r.session.id);
  return NextResponse.json({ ok: true });
}
