import { NextResponse } from "next/server";
import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { createPasswordLink, sendPasswordLinkMail } from "@/lib/auth/password-link";
import { createStaff, deleteStaff, DuplicateStaffMailError, findStaffByMail } from "@/lib/auth/staff";
import { parseRegistration } from "@/lib/auth/validation";
import { reserveSend } from "@/lib/auth/verify-code";
import { isMailConfigured } from "@/lib/mail";

// スタッフ登録の共通処理（ホームページの登録フォーム /register/ と、来社登録 /register/visit/）。
// 入力内容を DB の staff に保存し、入力されたメールアドレス宛に「パスワード設定リンク」を送る。
// ログイン用アカウントは、リンクを開いてパスワードを決めたときに作る（api/auth/register/password/route.ts）。
// メールアドレスが本人のものと確認できるまで、ログインはできない

const DUPLICATE_MESSAGE =
  "既にご登録いただいているメールアドレスです。ログイン画面からログインしてください（パスワードをまだ設定していない方は「はじめてログインする方」、お忘れの方は「パスワードをお忘れの方」からお手続きいただけます）。";

// エラーの種類を表す短い記号（Prisma の P2028、PostgreSQL の 40001、ネットワークの ETIMEDOUT など）。
// 個人情報や接続先は含まないものだけを画面に出す。種類が分からないときはエラーの名前（TypeError など）
function errorCode(error: unknown): string {
  const e = error as { code?: unknown; name?: unknown; meta?: { code?: unknown; driverAdapterError?: { cause?: { kind?: unknown; originalCode?: unknown } } } } | null;
  const parts = [e?.code, e?.meta?.code, e?.meta?.driverAdapterError?.cause?.kind, e?.meta?.driverAdapterError?.cause?.originalCode]
    .filter((v): v is string => typeof v === "string" && /^[A-Za-z0-9_]{2,40}$/.test(v));
  if (parts.length === 0 && typeof e?.name === "string" && /^[A-Za-z]{2,40}$/.test(e.name)) parts.push(e.name);
  return parts.length ? `:${[...new Set(parts)].join("/")}` : "";
}

export async function handleStaffRegistration(
  request: Request,
  method: "フォーム" | "来社",
  onCreated?: (staffId: number, mail: string) => Record<string, unknown> | Promise<Record<string, unknown>>,
): Promise<NextResponse> {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);

  const parsed = parseRegistration(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.message, 400);
  const { input } = parsed;
  if (!isMailConfigured()) return jsonError("ただいま登録を受け付けられません。お手数ですが、お電話にてお問い合わせください。", 500);

  let createdStaffId: number | null = null;
  // どこで失敗したか（サーバーのログが見られないときでも、画面のメッセージから原因を絞れるように、末尾に短い記号を出す）
  let stage = "C"; // C：登録済みかの確認／S：スタッフ情報の保存／M：案内メールの送信
  try {
    // 同じメールアドレスのスタッフが既にいれば登録しない（重複登録を防ぐ）。
    // 社内システムやホームページで登録済みの方、パスワードをまだ設定していない方も含む
    if (await findStaffByMail(input.mail)) return jsonError(DUPLICATE_MESSAGE, 409);
    const limited = reserveSend(input.mail);
    if (limited) return jsonError(limited, 429);

    stage = "S";
    const staffId = await createStaff(input, method);
    createdStaffId = staffId;
    stage = "M";
    await sendPasswordLinkMail(input.mail, input.name ?? null, await createPasswordLink(request, "set-password", staffId, input.mail));
    return NextResponse.json({ ok: true, ...(onCreated ? await onCreated(staffId, input.mail) : {}) });
  } catch (error) {
    // 案内メールを送れなかったときは、今回作ったスタッフ情報も取り消す（登録をやり直せるように）
    if (createdStaffId !== null) await deleteStaff(createdStaffId).catch((e) => console.error("rollback failed:", e));
    if (error instanceof DuplicateStaffMailError) return jsonError(DUPLICATE_MESSAGE, 409);
    console.error(`register failed (${stage}):`, error);
    return jsonError(`登録に失敗しました。メールアドレスをご確認のうえ、時間をおいて再度お試しください。（R-${stage}${errorCode(error)}）`, 500);
  }
}
