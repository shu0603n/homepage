import { NextResponse } from "next/server";
import { CognitoAuthError, signIn, userExists } from "@/lib/auth/cognito";
import { generateCode, startEmailChange } from "@/lib/auth/email-change";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getSession } from "@/lib/auth/session";
import { isEmail, normalizeEmail } from "@/lib/auth/validation";
import { isMailConfigured, sendMail } from "@/lib/mail";

// メールアドレス変更（1/2）：現在のパスワードを確認し、新しいメールアドレス宛に確認コードを送る
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const session = await getSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (session.staffId === null || !session.email || session.via !== "cognito") {
    return jsonError("この方法でログインしている場合は、メールアドレスを変更できません。", 400);
  }

  const body = (await readJson(request)) as { newEmail?: unknown; password?: unknown } | null;
  const newEmail = normalizeEmail(body?.newEmail);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(newEmail)) return jsonError("正しいメールアドレスを入力してください。", 400);
  if (newEmail === session.email.toLowerCase()) return jsonError("現在のメールアドレスと同じです。", 400);
  if (!password) return jsonError("現在のパスワードを入力してください。", 400);
  if (!isMailConfigured()) return jsonError("確認メールを送信できません。お電話にてお問い合わせください。", 500);

  try {
    await signIn(session.email, password); // 本人確認（現在のパスワード）
    if (await userExists(newEmail)) return jsonError("このメールアドレスは既に使われています。", 409);

    const code = generateCode();
    await startEmailChange(session.staffId, newEmail, code);
    await sendMail({
      to: newEmail,
      subject: "【株式会社エモリスリンク】メールアドレス変更の確認コード",
      text: [
        "メールアドレスの変更のご依頼を受け付けました。",
        "以下の確認コードを、変更画面に入力してください。",
        "",
        `確認コード：${code}`,
        "",
        "有効期限は15分です。",
        "このメールに心当たりがない場合は、何もせずに破棄してください（メールアドレスは変更されません）。",
      ].join("\n"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CognitoAuthError) {
      const message = error.code === "invalid_credentials" || error.code === "user_not_found" ? "現在のパスワードが正しくありません。" : AUTH_MESSAGES[error.code];
      return jsonError(message, error.code === "too_many_requests" ? 429 : error.code === "unknown" ? 500 : 400);
    }
    console.error("email change request failed:", error);
    return jsonError("確認メールの送信に失敗しました。時間をおいて再度お試しください。", 500);
  }
}
