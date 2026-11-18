import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/auth/http";
import { insertInquiry, type InquiryInput } from "@/lib/admin/store";

// お問い合わせフォームの控えを保存する（管理ページの一覧用）。
// メールの送信は今までどおり AWS Lambda（aws/contact/index.mjs）が行い、送信に成功したあとで画面がここへ同じ内容を送る。
// 誰でも送れる窓口なので：このサイトの画面からのみ受け付け、同じ接続元からは 1 分に 3 件まで、項目と長さは Lambda と同じに制限する
const FIELDS: Record<"employers" | "seekers", (keyof InquiryInput)[]> = {
  employers: ["company", "name", "kana", "email", "tel", "address", "inquiry_type", "message"],
  seekers: ["name", "kana", "email", "tel", "gender", "job", "message"],
};
const recent = new Map<string, number[]>();

function clean(value: FormDataEntryValue | null, max: number, multiline = false): string | null {
  if (typeof value !== "string") return null;
  let v = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!multiline) v = v.replace(/\n/g, " ");
  return v ? [...v].slice(0, max).join("") : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request) || !request.headers.get("origin")) return jsonError("不正なリクエストです。", 403);

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const now = Date.now();
  const hits = (recent.get(ip ?? "") ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 3) return jsonError("短時間に続けて送信されました。", 429);
  recent.set(ip ?? "", [...hits, now]);
  if (recent.size > 5000) recent.clear();

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return jsonError("無効なリクエストです。", 400);
  }
  if (String(fd.get("_gotcha") ?? "").trim()) return NextResponse.json({ ok: true }); // スパム対策の見えない欄
  const form = fd.get("_form");
  if (form !== "employers" && form !== "seekers") return jsonError("無効なリクエストです。", 400);

  const pick = (key: keyof InquiryInput, field: string) => (FIELDS[form].includes(key) ? clean(fd.get(field), key === "message" ? 5000 : 200, key === "message") : null);
  const input: InquiryInput = {
    form,
    company: pick("company", "company"),
    name: pick("name", "name"),
    kana: pick("kana", "kana"),
    email: pick("email", "email"),
    tel: pick("tel", "tel"),
    address: pick("address", "address"),
    gender: pick("gender", "gender"),
    job: pick("job", "job"),
    inquiry_type: pick("inquiry_type", "type"),
    message: pick("message", "message"),
    ip,
    user_agent: clean(request.headers.get("user-agent"), 500),
  };
  if (!input.name || !input.email || !input.message) return jsonError("入力内容が不足しています。", 400);

  try {
    await insertInquiry(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("inquiry save failed:", error);
    return jsonError("保存に失敗しました。", 500);
  }
}
