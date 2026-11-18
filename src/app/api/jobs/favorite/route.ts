import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/auth/staff";
import { addFavorite, parseJobKey, removeFavorite } from "@/lib/jobs-activity";

// 案件の「気になる」の登録・解除（ログイン中のスタッフ本人の分だけ）。{ kind, id, on }
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getSession();
  if (!session || session.staffId === null) return jsonError("ログインが必要です。", 401);

  const body = (await readJson(request)) as { kind?: unknown; id?: unknown; on?: unknown } | null;
  const job = parseJobKey(body);
  if (!job || typeof body?.on !== "boolean") return jsonError("無効なリクエストです。", 400);

  try {
    const staff = await findStaffById(session.staffId);
    if (!staff?.mail) return jsonError("スタッフ情報が見つかりません。", 400);
    if (body.on) await addFavorite(staff.id, staff.mail, job);
    else await removeFavorite(staff.id, staff.mail, job);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("favorite failed:", error);
    return jsonError("保存できませんでした。時間をおいて再度お試しください。", 500);
  }
}
