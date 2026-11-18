import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { destroyAdminSession } from "@/lib/admin/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
