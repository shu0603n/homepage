import { NextResponse } from "next/server";
import { CognitoAuthError, createUser, setUserPassword, userLastModified } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { isLinkUsed, readPasswordToken } from "@/lib/auth/password-link";
import { createSession } from "@/lib/auth/session";
import { findStaffById, isLoginBlocked } from "@/lib/auth/staff";
import { passwordProblem } from "@/lib/auth/validation";

// スタッフ登録（2/2）：メールのリンクから開いた画面で決めたパスワードで、ログイン用アカウントを作り、ログイン状態にする。
// 社内システムで登録済みのスタッフが「パスワード設定のご案内」から開いた画面（/password-setup/set/）でも使う
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { token?: unknown; password?: unknown } | null;
  // スタッフ登録後のパスワード設定と、登録済みスタッフのご利用開始（activate）で共通
  const token = typeof body?.token === "string" ? body.token : undefined;
  const link = (await readPasswordToken(token, "set-password")) ?? (await readPasswordToken(token, "activate"));
  if (!link) return jsonError("リンクの有効期限が切れているか、正しくありません。ログイン画面の「パスワードをお忘れの方」から、もう一度メールをお送りください。", 400);
  const problem = passwordProblem(body?.password);
  if (problem) return jsonError(problem, 400);
  const password = body?.password as string;

  try {
    // リンクを送ったあとに社内システムでスタッフが削除・メール変更・NG/BL になっていたら使えない
    const staff = await findStaffById(link.staffId);
    if (!staff || staff.mail?.toLowerCase() !== link.mail) return jsonError("このリンクは使えなくなりました。お手数ですが、お電話にてお問い合わせください。", 400);
    if (isLoginBlocked(staff)) return jsonError("このアカウントではログインできません。お電話にてお問い合わせください。", 403);

    // 一度パスワードを設定したリンクは使えない（設定済みの方はログイン画面へ）
    if (await isLinkUsed(link)) return jsonError("パスワードは既に設定されています。ログイン画面からログインしてください。", 400);
    // メールのリンクを開けた＝メールアドレスの持ち主なので、既にアカウントがある場合（以前の登録の残りなど）はパスワードを設定し直す
    if ((await userLastModified(link.mail)) !== null) await setUserPassword(link.mail, password);
    else await createUser(link.mail, password);

    await createSession({ sub: link.mail, email: link.mail, staffId: staff.id, via: "cognito" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CognitoAuthError) {
      return jsonError(AUTH_MESSAGES[error.code], error.code === "invalid_password" ? 400 : error.code === "too_many_requests" ? 429 : 500);
    }
    console.error("set password failed:", error);
    return jsonError("パスワードの設定に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
