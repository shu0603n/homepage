import { NextResponse } from "next/server";
import { adminRequest, intOrNull } from "@/lib/admin/api";
import { fillProfileFromStaff, friendExists, isLineUserId, PROFILE_FIELDS, saveProfile, setAssignee, setChatStatus, setStatus, type Profile } from "@/lib/admin/crm";
import { jsonError } from "@/lib/auth/http";

// 友だち・求職者の更新。送られた項目だけ変える：
//   status（ステータスのキー）／assignee_id（求職者の担当者。null で未割当）／chat_status・chat_assignee_id（個別チャットの対応状況・担当者）
//   profile（プロフィールの項目）／fill_from_staff: true（連携しているスタッフの登録内容で、空いている項目を埋める）
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await adminRequest(request, { body: true });
  if (r instanceof Response) return r;
  const { session, body } = r;
  const id = (await params).id;
  if (!isLineUserId(id) || !(await friendExists(id))) return jsonError("友だちが見つかりません。", 404);
  try {
    if ("status" in body && (typeof body.status !== "string" || !(await setStatus(id, body.status, session.id)))) return jsonError("ステータスが正しくありません。", 400);
    for (const [key, which] of [
      ["assignee_id", "candidate"],
      ["chat_assignee_id", "chat"],
    ] as const) {
      if (!(key in body)) continue;
      const v = intOrNull(body[key]);
      if (v === undefined || !(await setAssignee(id, v, which))) return jsonError("担当者が正しくありません。", 400);
    }
    if ("chat_status" in body && (typeof body.chat_status !== "string" || !(await setChatStatus(id, body.chat_status)))) return jsonError("対応状況が正しくありません。", 400);
    if ("profile" in body) {
      const p = body.profile as Record<string, unknown> | null;
      if (!p || typeof p !== "object") return jsonError("プロフィールが正しくありません。", 400);
      const values = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, typeof p[f.key] === "string" ? (p[f.key] as string) : null])) as Profile;
      await saveProfile(id, values, session.id);
    }
    if (body.fill_from_staff === true && !(await fillProfileFromStaff(id, session.id))) return jsonError("連携しているスタッフがいません。", 400);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("friend update failed:", error);
    return jsonError("保存に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
