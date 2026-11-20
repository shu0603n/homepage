import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { disconnectGoogle } from "@/lib/admin/sheets";
import { jsonError } from "@/lib/auth/http";

// Google との連携を外す（特級の管理者だけ）。外すと、どのフォームもスプレッドシートに書き込めなくなる
export async function POST(request: Request) {
  const r = await adminRequest(request);
  if (r instanceof Response) return r;
  if (r.session.role !== "super") return jsonError("Google との連携の変更は、特級の管理者だけができます。", 403);
  await disconnectGoogle();
  return NextResponse.json({ ok: true });
}
