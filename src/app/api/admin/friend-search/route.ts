import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { searchFriends } from "@/lib/admin/crm";

// 個別チャットの「新規メッセージ」で、送る相手（友だち）を探す。?q=氏名・LINE名・フリガナ・電話番号・スタッフ名（空なら最近の友だち）
export async function GET(request: Request) {
  const r = await adminRequest(request);
  if (r instanceof Response) return r;
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  return NextResponse.json({ ok: true, rows: await searchFriends(q) });
}
