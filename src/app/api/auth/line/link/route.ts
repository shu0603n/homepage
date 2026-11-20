import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isLineLoginEnabled, verifyLineIdToken } from "@/lib/auth/line";
import { linkStaffLine } from "@/lib/auth/line-pending";
import { findStaffById, isLoginBlocked } from "@/lib/auth/staff";
import { recordLineIdentity } from "@/lib/line-identity";
import { LINE_FRIEND_ADD_URL, readLineLinkTicket } from "@/lib/line-friend";

// スタッフ登録と LINE の連携（/jobs/line-link/ から呼ぶ。仕組みは lib/line-friend.ts）。
// { ticket: 引換券, idToken: LIFF の ID トークン } を受け取り、LINE が確かめた本人の LINE を、引換券のスタッフに連携する。
// 結果（result）：linked＝連携した／already＝連携済み／other_line＝このスタッフは別の LINE と連携済み／taken＝この LINE はほかのスタッフと連携済み
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  if (!isLineLoginEnabled()) return jsonError("現在、LINE との連携はご利用いただけません。", 501);

  const body = (await readJson(request)) as { ticket?: unknown; idToken?: unknown } | null;
  const ticket = await readLineLinkTicket(body?.ticket);
  if (!ticket) return jsonError("リンクの有効期限が切れています。マイページの「LINE で友だち追加する」から、もう一度お試しください。", 400);
  if (typeof body?.idToken !== "string" || !body.idToken) return jsonError("LINE の認証に失敗しました。もう一度お試しください。", 400);

  const line = await verifyLineIdToken(body.idToken);
  if (!line) return jsonError("LINE の認証に失敗しました。もう一度お試しください。", 401);

  try {
    // 引換券を作ったあとに、スタッフが削除・メール変更・NG/BL になっていたら連携しない
    const staff = await findStaffById(ticket.staffId);
    if (!staff || staff.mail?.trim().toLowerCase() !== ticket.mail || isLoginBlocked(staff)) {
      return jsonError("ご登録の情報を確認できませんでした。お手数ですが、お電話にてお問い合わせください。", 400);
    }
    await recordLineIdentity({ userId: line.userId, name: line.name, picture: line.picture, via: "link" });
    const result = await linkStaffLine(staff.id, line.userId);
    if (result !== "linked" && result !== "already") console.warn("staff LINE link skipped:", staff.id, result);
    return NextResponse.json({ ok: true, result, friendUrl: LINE_FRIEND_ADD_URL });
  } catch (error) {
    console.error("staff LINE link failed:", error);
    return jsonError("連携に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
