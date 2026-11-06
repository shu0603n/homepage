import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isLineLoginEnabled, verifyLineIdToken } from "@/lib/auth/line";
import { createSession } from "@/lib/auth/session";
import { findStaffByLineUserId } from "@/lib/auth/staff";

// LINE（LIFF）からのログイン。LIFF_ID を設定するまでは無効（501）。
// LINE と紐づいたスタッフ（staff.line_user_id）が見つかったときだけ、通常のログインと同じセッションを作る
export async function POST(request: Request) {
  if (!isLineLoginEnabled()) return jsonError("LINE ログインは設定されていません。", 501);
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== "string" || !body.idToken) return jsonError("無効なリクエストです。", 400);

  const lineUserId = await verifyLineIdToken(body.idToken);
  if (!lineUserId) return jsonError("LINE の認証に失敗しました。", 401);

  const staff = await findStaffByLineUserId(lineUserId);
  if (!staff) return jsonError("LINE と連携済みのアカウントが見つかりません。", 404);

  await createSession({ sub: lineUserId, email: staff.mail, staffId: staff.id, via: "line" });
  return NextResponse.json({ ok: true });
}
