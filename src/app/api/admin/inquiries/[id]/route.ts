import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getAdminSession } from "@/lib/admin/session";
import { setInquiryAssignee, setInquiryHandled, setInquiryMemo } from "@/lib/admin/store";

// 問い合わせの更新。送られてきた項目だけを変える：
//   handled     「対応済み」のチェック（true / false）
//   assignee_id 担当者（管理者の id。null で未設定）
//   memo        内部メモ（社内だけで見るメモ。空にすると消える。5000文字まで）
const MEMO_MAX = 5000;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);

  const id = Number((await params).id);
  const body = (await readJson(request)) as { handled?: unknown; assignee_id?: unknown; memo?: unknown } | null;
  if (!Number.isInteger(id) || id <= 0 || !body) return jsonError("無効なリクエストです。", 400);

  const hasHandled = "handled" in body;
  const hasAssignee = "assignee_id" in body;
  const hasMemo = "memo" in body;
  if (!hasHandled && !hasAssignee && !hasMemo) return jsonError("無効なリクエストです。", 400);
  if (hasHandled && typeof body.handled !== "boolean") return jsonError("無効なリクエストです。", 400);
  if (hasAssignee && body.assignee_id !== null && !(Number.isInteger(body.assignee_id) && (body.assignee_id as number) > 0)) return jsonError("無効なリクエストです。", 400);
  if (hasMemo && body.memo !== null && typeof body.memo !== "string") return jsonError("無効なリクエストです。", 400);
  const memo = hasMemo ? (typeof body.memo === "string" ? body.memo.replace(/\r\n?/g, "\n").trim() : "") : "";
  if ([...memo].length > MEMO_MAX) return jsonError(`メモは${MEMO_MAX}文字までです。`, 400);

  try {
    let memoSavedAt: Date | null = null;
    if (hasHandled && !(await setInquiryHandled(id, body.handled as boolean))) return jsonError("問い合わせが見つかりません。", 404);
    if (hasAssignee && !(await setInquiryAssignee(id, body.assignee_id as number | null))) return jsonError("問い合わせか担当者が見つかりません。", 404);
    if (hasMemo) {
      const saved = await setInquiryMemo(id, memo || null, session.id);
      if (!saved) return jsonError("問い合わせが見つかりません。", 404);
      memoSavedAt = saved.at;
    }
    return NextResponse.json({ ok: true, memoSavedAt, memoSavedBy: hasMemo ? (session.name ?? session.email) : undefined });
  } catch (error) {
    console.error("inquiry update failed:", error);
    return jsonError("更新に失敗しました。", 500);
  }
}
