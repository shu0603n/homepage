import { NextResponse } from "next/server";
import { formatPhoneJP } from "@/lib/phone";
import { syncSubmissions } from "@/lib/admin/sheets";
import { getFormBySlug, isDuplicateOrFlood, publicFields, saveSubmission, type UploadedFile } from "@/lib/admin/forms";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { isLineLoginEnabled, verifyLineIdToken } from "@/lib/auth/line";
import { getSession } from "@/lib/auth/session";
import { recordLineIdentity } from "@/lib/line-identity";
import { checkAnswer, FILE_MAX, FILE_TYPES, FILES_TOTAL_MAX, isInputType, splitSections, visitedSections, type AnswerValue } from "@/lib/forms-def";

// フォームの回答を受け付ける（回答ページ /jobs/forms/<slug>/ から送る。仕組みは lib/admin/forms.ts）。
// 送る形：multipart/form-data。payload＝JSON { answers: { 質問ID: 値 }, idToken?: LIFF の ID トークン, website: 空（迷惑送信よけ） }、
//         添付ファイルは file_<質問ID> に入れる
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const slug = (await params).slug;
  const form = await getFormBySlug(slug).catch(() => null);
  if (!form || !form.is_published) return jsonError("このフォームは現在受け付けていません。", 404);

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return jsonError("送信内容を読み取れませんでした。添付ファイルが大きすぎないかご確認ください。", 400);
  }
  let payload: { answers?: Record<string, unknown>; idToken?: unknown; website?: unknown };
  try {
    payload = JSON.parse(String(data.get("payload") ?? ""));
  } catch {
    return jsonError("送信内容を読み取れませんでした。", 400);
  }
  // 迷惑送信よけ（人には見えない欄に何か入っていたら、受け付けたふりをして保存しない）
  if (typeof payload.website === "string" && payload.website !== "") return NextResponse.json({ ok: true });

  // 回答者を確かめる
  let lineUserId: string | null = null;
  let lineName: string | null = null;
  if (form.auth_mode === "line") {
    if (!isLineLoginEnabled()) return jsonError("現在、LINE ログインはご利用いただけません。", 501);
    const line = typeof payload.idToken === "string" && payload.idToken ? await verifyLineIdToken(payload.idToken).catch(() => null) : null;
    if (!line) return jsonError("LINE のログインを確認できませんでした。ページを開き直して、もう一度お試しください。", 401);
    lineUserId = line.userId;
    lineName = line.name;
    await recordLineIdentity({ userId: line.userId, name: line.name, picture: line.picture, via: "form" });
  }
  const staff = await getSession().catch(() => null);
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

  // 回答を確かめる
  const fields = publicFields(form);
  const raw = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  const answers = new Map<number, AnswerValue>();
  const errors: Record<number, string> = {};
  const files: UploadedFile[] = [];
  let total = 0;
  // 分岐：回答の内容から、通ったページ（セクション）を出し直す。通っていないページの質問は、必須でも確かめず、回答も保存しない
  const asValue = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined);
  const sections = splitSections(fields, form.logic);
  const given = Object.fromEntries(fields.map((f) => [f.id, asValue(raw[String(f.id)])]));
  const onPath = new Set(visitedSections(sections, given).flatMap((i) => sections[i].fields.map((f) => f.id)));
  for (const f of fields) {
    if (!isInputType(f.type) || !onPath.has(f.id)) continue;
    if (f.type === "FILE") {
      const file = data.get(`file_${f.id}`);
      if (!(file instanceof File) || file.size === 0) {
        if (f.required) errors[f.id] = "ファイルを添付してください";
        continue;
      }
      if (!FILE_TYPES.includes(file.type)) errors[f.id] = "PDF・JPEG・PNG・WebP のファイルを添付してください";
      else if (file.size > FILE_MAX) errors[f.id] = "ファイルは 4MB 以下にしてください";
      else {
        total += file.size;
        files.push({ fieldId: f.id, name: file.name || "file", type: file.type, data: Buffer.from(await file.arrayBuffer()) });
      }
      continue;
    }
    const value = asValue(raw[String(f.id)]);
    const message = checkAnswer(f, value);
    if (message) errors[f.id] = message;
    else if (value !== undefined) answers.set(f.id, f.type === "PHONE" && typeof value === "string" ? (formatPhoneJP(value) ?? value) : value);
  }
  if (total > FILES_TOTAL_MAX) return jsonError("添付ファイルの合計は 4.5MB 以下にしてください。", 400);
  if (Object.keys(errors).length > 0) return NextResponse.json({ ok: false, message: "入力内容をご確認ください。", errors }, { status: 400 });

  try {
    const guard = await isDuplicateOrFlood(form.id, lineUserId, form.auth_mode === "open" ? ip : null);
    if (guard === "dup") return NextResponse.json({ ok: true, done: form.done_message });
    if (guard === "flood") return jsonError("短い時間に送信が続いたため、受け付けを止めています。時間をおいてお試しください。", 429);
    const submissionId = await saveSubmission(form, answers, files, {
      lineUserId,
      lineName,
      staffId: staff?.staffId ?? null,
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });
    // スプレッドシート連携があれば書き込む（失敗しても回答は受け付ける。管理画面の「未送信の回答を書き込む」で書き直せる）
    await syncSubmissions(form.id, { submissionId }).catch((error) => console.error("sheet sync failed:", error));
    return NextResponse.json({ ok: true, done: form.done_message });
  } catch (error) {
    console.error("form submission failed:", error);
    return jsonError("送信できませんでした。時間をおいて再度お試しください。", 500);
  }
}

