import { NextResponse } from "next/server";
import { CognitoAuthError, signIn } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { createSession } from "@/lib/auth/session";
import { findStaffByMail, isLoginBlocked, reactivateIfUnsubscribed } from "@/lib/auth/staff";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const body = (await readJson(request)) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) return jsonError("メールアドレスとパスワードを入力してください。", 400);

  try {
    const user = await signIn(email, password);
    // 社内システムのスタッフ情報と紐づける。スタッフが削除されている場合（Cognito のアカウントだけが残っている場合）はログインさせない
    const staff = await findStaffByMail(email).catch((error) => {
      console.error("staff lookup failed:", error);
      return undefined;
    });
    if (staff === undefined) return jsonError("ただいまログインできません。時間をおいて再度お試しください。", 503);
    if (staff === null || isLoginBlocked(staff)) return jsonError("このアカウントではログインできません。お電話にてお問い合わせください。", 403);
    await reactivateIfUnsubscribed(staff.id).catch((error) => console.error("staff reactivate failed:", error));
    await createSession({ sub: user.sub, email: user.email, staffId: staff.id, via: "cognito" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof CognitoAuthError ? error.code : "unknown";
    const status = code === "too_many_requests" ? 429 : code === "unknown" ? 500 : 401;
    return jsonError(AUTH_MESSAGES[code], status);
  }
}
