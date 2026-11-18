import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getAdminSession } from "@/lib/admin/session";
import { setInquiryHandled } from "@/lib/admin/store";

// 問い合わせの「対応済み」チェックの切り替え
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  if (!(await getAdminSession())) return jsonError("ログインが必要です。", 401);

  const id = Number((await params).id);
  const body = (await readJson(request)) as { handled?: unknown } | null;
  if (!Number.isInteger(id) || id <= 0 || typeof body?.handled !== "boolean") return jsonError("無効なリクエストです。", 400);

  try {
    if (!(await setInquiryHandled(id, body.handled))) return jsonError("問い合わせが見つかりません。", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("inquiry update failed:", error);
    return jsonError("更新に失敗しました。", 500);
  }
}
