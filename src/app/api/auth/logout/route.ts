import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  await destroySession();
  return NextResponse.json({ ok: true });
}
