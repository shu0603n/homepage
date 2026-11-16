import { NextResponse } from "next/server";
import { CognitoAuthError, setUserPassword, userLastModified } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isLinkUsed, readPasswordToken } from "@/lib/auth/password-link";
import { createSession } from "@/lib/auth/session";
import { findStaffById, isLoginBlocked } from "@/lib/auth/staff";
import { passwordProblem } from "@/lib/auth/validation";

// パスワード再設定：メールのリンクから開いた画面で決めた新しいパスワードに変え、そのままログイン状態にする
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { token?: unknown; password?: unknown } | null;
  const link = await readPasswordToken(typeof body?.token === "string" ? body.token : undefined, "reset-password");
  const expired = "リンクの有効期限が切れているか、既に使用されています。お手数ですが、「パスワードをお忘れの方」から、もう一度お手続きください。";
  if (!link) return jsonError(expired, 400);
  const problem = passwordProblem(body?.password);
  if (problem) return jsonError(problem, 400);
  const password = body?.password as string;

  try {
    const staff = await findStaffById(link.staffId);
    if (!staff || staff.mail?.toLowerCase() !== link.mail) return jsonError("このリンクは使えなくなりました。お手数ですが、お電話にてお問い合わせください。", 400);
    if (isLoginBlocked(staff)) return jsonError("このアカウントではログインできません。お電話にてお問い合わせください。", 403);
    if ((await userLastModified(link.mail)) === null || (await isLinkUsed(link))) return jsonError(expired, 400);

    await setUserPassword(link.mail, password);
    await createSession({ sub: link.mail, email: link.mail, staffId: staff.id, via: "cognito" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CognitoAuthError) {
      return jsonError(AUTH_MESSAGES[error.code], error.code === "invalid_password" ? 400 : error.code === "too_many_requests" ? 429 : 500);
    }
    console.error("reset password failed:", error);
    return jsonError("パスワードの再設定に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
