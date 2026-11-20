import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { renewAdminSession } from "@/lib/admin/session";

// 管理ページを開いたときに呼ぶ（AdminSessionKeeper）。ログイン状態の期限を延ばして、毎日ログインし直さなくて済むようにする
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  return NextResponse.json({ ok: true, renewed: await renewAdminSession() });
}
