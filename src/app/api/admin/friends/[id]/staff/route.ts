import { NextResponse } from "next/server";
import { adminRequest } from "@/lib/admin/api";
import { fillProfileFromStaff, friendExists, isLineUserId, linkFriendToStaff } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";

// 友だちとスタッフ（スタッフ表）を手動で連携する。{ staff_id }。スタッフ表の line_user_id に書き込み、プロフィールの空いている項目も埋める。
// そのスタッフが別の LINE と連携済み、またはこの LINE が別のスタッフと連携済みなら連携しない（上書きしない）
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const id = (await params).id;
  const staffId = r.body.staff_id;
  if (!isLineUserId(id) || !(await friendExists(id))) return jsonError("友だちが見つかりません。", 404);
  if (!Number.isInteger(staffId) || (staffId as number) <= 0) return jsonError("スタッフが正しくありません。", 400);
  const result = await linkFriendToStaff(id, staffId as number);
  if (result === "other_line") return jsonError("このスタッフは、すでに別の LINE と連携しています（上書きはしません）。", 409);
  if (result === "taken") return jsonError("この LINE は、すでに別のスタッフと連携しています。", 409);
  await fillProfileFromStaff(id, r.session.id).catch((error) => console.error("profile fill failed:", error));
  return NextResponse.json({ ok: true, result });
}
