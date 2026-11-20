import { getForm, listSubmissions } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";
import { answerText, isInputType } from "@/lib/forms-def";

// 回答の CSV（Excel で開けるよう、先頭に BOM を付けた UTF-8）
const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const jst = (d: Date) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession().catch(() => null))) return new Response("ログインが必要です。", { status: 401 });
  const form = await getForm(Number((await params).id) || 0);
  if (!form) return new Response("フォームが見つかりません。", { status: 404 });
  const subs = await listSubmissions(form);
  const fields = form.fields.filter((f) => isInputType(f.type) && (!f.deleted || subs.some((s) => s.answers.has(f.id) || s.files.some((x) => x.field_id === f.id))));
  const head = ["回答日時", "回答者", "LINE ユーザーID", "スタッフID", ...fields.map((f) => (f.deleted ? `${f.label}（削除した質問）` : f.label))];
  const rows = subs.map((s) => [
    jst(s.submitted_at),
    s.who,
    s.line_user_id ?? "",
    s.staff_id === null ? "" : String(s.staff_id),
    ...fields.map((f) => (f.type === "FILE" ? s.files.filter((x) => x.field_id === f.id).map((x) => x.file_name).join("、") : answerText(f.type, s.answers.get(f.id)?.text ?? null, s.answers.get(f.id)?.json ?? null))),
  ]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const name = `${form.slug}_回答_${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "no-store" },
  });
}
