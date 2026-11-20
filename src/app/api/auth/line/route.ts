import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isLineLoginEnabled, verifyLineIdToken } from "@/lib/auth/line";
import { LINE_PENDING_COOKIE, LINE_PENDING_COOKIE_OPTIONS, makeLinePendingToken } from "@/lib/auth/line-pending";
import { createSession } from "@/lib/auth/session";
import { recordLineIdentity } from "@/lib/line-identity";
import { findStaffByLineUserId, isLoginBlocked, reactivateIfUnsubscribed } from "@/lib/auth/staff";

// LINE（LIFF）からのログイン。LIFF_ID を設定するまでは無効（501）。
// LINE と紐づいたスタッフ（staff.line_user_id）が見つかったときだけ、通常のログインと同じセッションを作る
export async function POST(request: Request) {
  if (!isLineLoginEnabled()) return jsonError("LINE ログインは設定されていません。", 501);
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== "string" || !body.idToken) return jsonError("無効なリクエストです。", 400);

  const line = await verifyLineIdToken(body.idToken);
  if (!line) return jsonError("LINE の認証に失敗しました。", 401);

  const lineUserId = line.userId;
  const staff = await findStaffByLineUserId(lineUserId);
  await recordLineIdentity({ userId: lineUserId, name: line.name, picture: line.picture, staffId: staff?.id ?? null, via: "login" });
  if (!staff) {
    // 続けてメールアドレスとパスワードでログインしたら、この LINE と連携する（lib/auth/line-pending.ts）
    const res = jsonError("LINE と連携済みのアカウントが見つかりません。", 404);
    res.cookies.set(LINE_PENDING_COOKIE, await makeLinePendingToken(lineUserId, line.name), LINE_PENDING_COOKIE_OPTIONS);
    return res;
  }

  if (isLoginBlocked(staff)) return jsonError("このアカウントではログインできません。お電話にてお問い合わせください。", 403);

  await reactivateIfUnsubscribed(staff.id).catch((error) => console.error("staff reactivate failed:", error));
  await createSession({ sub: lineUserId, email: staff.mail, staffId: staff.id, via: "line" });
  return NextResponse.json({ ok: true });
}
