import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { searchStaff } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";

// スタッフを探す（友だちとの手動連携用）。?q=氏名・フリガナ・電話番号・メール・スタッフ ID
export async function GET(request: Request) {
  const r = await adminRequest(request);
  if (r instanceof Response) return r;
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return jsonError("2文字以上で探してください。", 400);
  const rows = await searchStaff(q.slice(0, 100));
  return NextResponse.json({ ok: true, rows });
}
