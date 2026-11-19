import { NextResponse } from "next/server";
import { CognitoAuthError, createUser, setUserPassword, userLastModified } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { linkStaffLine } from "@/lib/auth/line-pending";
import { isLinkUsed, readPasswordToken } from "@/lib/auth/password-link";
import { createSession } from "@/lib/auth/session";
import { findStaffById, isLoginBlocked } from "@/lib/auth/staff";
import { passwordProblem } from "@/lib/auth/validation";

// LINE から来て、まだ連携していない方のパスワード設定（2/2）：メールのリンク（/password-setup/line/）から開いた画面で決めたパスワードを設定し、
// リンクに入っている LINE と連携して、ログイン状態にする（リンクを開けた＝メールアドレスの持ち主）
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { token?: unknown; password?: unknown } | null;
  const link = await readPasswordToken(typeof body?.token === "string" ? body.token : undefined, "line-setup");
  if (!link?.line) return jsonError("リンクの有効期限が切れているか、正しくありません。お手数ですが、LINE のメニューからもう一度お手続きください。", 400);
  const problem = passwordProblem(body?.password);
  if (problem) return jsonError(problem, 400);
  const password = body?.password as string;

  try {
    // リンクを送ったあとに社内システムでスタッフが削除・メール変更・NG/BL になっていたら使えない
    const staff = await findStaffById(link.staffId);
    if (!staff || staff.mail?.trim().toLowerCase() !== link.mail) return jsonError("このリンクは使えなくなりました。お手数ですが、お電話にてお問い合わせください。", 400);
    if (isLoginBlocked(staff)) return jsonError("このアカウントではログインできません。お電話にてお問い合わせください。", 403);
    // 一度パスワードを設定したリンクは使えない
    if (await isLinkUsed(link)) return jsonError("パスワードは既に設定されています。ログイン画面からログインしてください。", 400);

    if ((await userLastModified(link.mail)) !== null) await setUserPassword(link.mail, password);
    else await createUser(link.mail, password);

    const lineLink = await linkStaffLine(staff.id, link.line.lineUserId).catch((error) => {
      console.error("staff LINE link failed:", error);
      return null;
    });
    if (lineLink !== "linked" && lineLink !== "already") console.warn("staff LINE link skipped:", staff.id, lineLink);

    await createSession({ sub: link.mail, email: link.mail, staffId: staff.id, via: "cognito" });
    return NextResponse.json({ ok: true, lineLink });
  } catch (error) {
    if (error instanceof CognitoAuthError) {
      return jsonError(AUTH_MESSAGES[error.code], error.code === "invalid_password" ? 400 : error.code === "too_many_requests" ? 429 : 500);
    }
    console.error("line setup finish failed:", error);
    return jsonError("パスワードの設定に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
