import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";
import { unsubscribeStaff, updateStaffProfile } from "@/lib/auth/staff";
import { parseProfile } from "@/lib/auth/validation";

// マイページでの登録情報の更新。更新できるのはログイン中のスタッフ本人の情報だけ（メールアドレスは変更しない）
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const session = await getSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (session.staffId === null) return jsonError("スタッフ情報が見つかりません。お電話にてお問い合わせください。", 400);

  const parsed = parseProfile(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.message, 400);

  try {
    await updateStaffProfile(session.staffId, parsed.input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("profile update failed:", error);
    return jsonError("更新に失敗しました。時間をおいて再度お試しください。", 500);
  }
}

// 登録解除。データは削除せず、ステータスを「配信停止」にする
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const session = await getSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (session.staffId === null) return jsonError("スタッフ情報が見つかりません。お電話にてお問い合わせください。", 400);

  try {
    await unsubscribeStaff(session.staffId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("profile unsubscribe failed:", error);
    return jsonError("登録解除に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
