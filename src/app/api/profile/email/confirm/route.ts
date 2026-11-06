import { NextResponse } from "next/server";
import { changeUserEmail, CognitoAuthError } from "@/lib/auth/cognito";
import { checkEmailChange, clearEmailChange } from "@/lib/auth/email-change";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { createSession, getSession } from "@/lib/auth/session";
import { updateStaffMail } from "@/lib/auth/staff";

// メールアドレス変更（2/2）：確認コードが合っていれば、ログイン用アカウントと登録情報のメールアドレスを更新する
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const session = await getSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (session.staffId === null || !session.email || session.via !== "cognito") {
    return jsonError("この方法でログインしている場合は、メールアドレスを変更できません。", 400);
  }

  const body = (await readJson(request)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return jsonError("6桁の確認コードを入力してください。", 400);

  const newEmail = await checkEmailChange(session.staffId, code);
  if (!newEmail) return jsonError("確認コードが正しくないか、有効期限が切れています。", 400);

  const oldEmail = session.email;
  try {
    await changeUserEmail(oldEmail, newEmail);
  } catch (error) {
    if (error instanceof CognitoAuthError) {
      return jsonError(error.code === "user_exists" ? "このメールアドレスは既に使われています。" : AUTH_MESSAGES[error.code], error.code === "user_exists" ? 409 : 500);
    }
    console.error("email change (cognito) failed:", error);
    return jsonError("メールアドレスの変更に失敗しました。時間をおいて再度お試しください。", 500);
  }

  try {
    await updateStaffMail(session.staffId, newEmail);
  } catch (error) {
    // 登録情報を更新できなかったときは、ログイン用アカウントも元に戻して、二つのメールアドレスがずれないようにする
    console.error("email change (db) failed:", error);
    await changeUserEmail(newEmail, oldEmail).catch((e) => console.error("email change rollback failed:", e));
    return jsonError("メールアドレスの変更に失敗しました。時間をおいて再度お試しください。", 500);
  }

  await clearEmailChange();
  await createSession({ ...session, email: newEmail });
  return NextResponse.json({ ok: true });
}
