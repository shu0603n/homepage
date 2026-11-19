import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CognitoAuthError, createUser, setUserPassword, userLastModified } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { LINE_PENDING_COOKIE, linkStaffLine } from "@/lib/auth/line-pending";
import { createSession } from "@/lib/auth/session";
import { findStaffById, isLoginBlocked } from "@/lib/auth/staff";
import { passwordProblem } from "@/lib/auth/validation";
import { checkVerification, clearVerification, VERIFY_MESSAGES } from "@/lib/auth/verify-code";

// LINE から来て、まだ連携していない方のパスワード設定（2/2）：
// 確認コードが正しければ（＝メールアドレスの持ち主）、パスワードを設定し、LINE と連携して、ログイン状態にする
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { code?: unknown; password?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return jsonError("メールに届いた6桁の確認コードを入力してください。", 400);
  const problem = passwordProblem(body?.password);
  if (problem) return jsonError(problem, 400);
  const password = body?.password as string;

  const result = await checkVerification("line-setup", code);
  if (!result.ok) return jsonError(VERIFY_MESSAGES[result.reason], 400);
  let target: { staffId?: unknown; mail?: unknown; lineUserId?: unknown };
  try {
    target = JSON.parse(result.target);
  } catch {
    return jsonError(VERIFY_MESSAGES.missing, 400);
  }
  const { staffId, mail, lineUserId } = target;
  if (typeof staffId !== "number" || staffId <= 0 || typeof mail !== "string" || typeof lineUserId !== "string") return jsonError(VERIFY_MESSAGES.invalid, 400);

  try {
    // コードを送ったあとに社内システムでスタッフが削除・メール変更・NG/BL になっていたら使えない
    const staff = await findStaffById(staffId);
    if (!staff || staff.mail?.trim().toLowerCase() !== mail) return jsonError("お手続きを続けられません。お手数ですが、お電話にてお問い合わせください。", 400);
    if (isLoginBlocked(staff)) return jsonError("このアカウントではログインできません。お電話にてお問い合わせください。", 403);

    // メールのコードを受け取れた＝メールアドレスの持ち主なので、既にアカウントがある場合はパスワードを設定し直す
    if ((await userLastModified(mail)) !== null) await setUserPassword(mail, password);
    else await createUser(mail, password);

    const lineLink = await linkStaffLine(staff.id, lineUserId).catch((error) => {
      console.error("staff LINE link failed:", error);
      return null;
    });
    if (lineLink !== "linked" && lineLink !== "already") console.warn("staff LINE link skipped:", staff.id, lineLink);

    await clearVerification("line-setup");
    (await cookies()).delete({ name: LINE_PENDING_COOKIE, path: "/" });
    await createSession({ sub: mail, email: mail, staffId: staff.id, via: "cognito" });
    return NextResponse.json({ ok: true, lineLink });
  } catch (error) {
    if (error instanceof CognitoAuthError) {
      return jsonError(AUTH_MESSAGES[error.code], error.code === "invalid_password" ? 400 : error.code === "too_many_requests" ? 429 : 500);
    }
    console.error("line setup finish failed:", error);
    return jsonError("パスワードの設定に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
