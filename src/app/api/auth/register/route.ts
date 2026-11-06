import { NextResponse } from "next/server";
import { CognitoAuthError, createUser, userExists } from "@/lib/auth/cognito";
import { AUTH_MESSAGES, isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { createSession } from "@/lib/auth/session";
import { createStaff, deleteStaff, findStaffByMail } from "@/lib/auth/staff";
import { parseRegistration } from "@/lib/auth/validation";

// スタッフ登録：DB の staff に登録し、Cognito にログイン用アカウントを作る。登録後はそのままログイン状態にする
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const parsed = parseRegistration(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.message, 400);
  const { input, password } = parsed;

  let createdStaffId: number | null = null;
  try {
    if (await userExists(input.mail)) return jsonError(AUTH_MESSAGES.user_exists, 409);

    // 社内システム側に同じメールのスタッフが既にいる場合は、新規作成せずそのスタッフとログインを紐づける
    const existing = await findStaffByMail(input.mail);
    let staffId = existing?.id ?? null;
    if (staffId === null) {
      staffId = await createStaff(input);
      createdStaffId = staffId;
    }

    await createUser(input.mail, password);
    await createSession({ sub: input.mail, email: input.mail, staffId, via: "cognito" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // ログイン用アカウントを作れなかったときは、今回作ったスタッフ情報も取り消す
    if (createdStaffId !== null) await deleteStaff(createdStaffId).catch((e) => console.error("rollback failed:", e));
    if (error instanceof CognitoAuthError) {
      return jsonError(AUTH_MESSAGES[error.code], error.code === "user_exists" ? 409 : error.code === "invalid_password" ? 400 : 500);
    }
    console.error("register failed:", error);
    return jsonError("登録に失敗しました。お手数ですが、時間をおいて再度お試しください。", 500);
  }
}
