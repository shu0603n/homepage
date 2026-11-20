import { answerText, isInputType } from "@/lib/forms-def";
import { FORM_NOTIFY_TO } from "@/lib/form-notify-to";
import { listSubmissions, type FormDetail } from "@/lib/admin/forms";
import { getSheetLink } from "@/lib/admin/sheets";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

// フォームに回答があったら、recruit_hr@emorislink.co.jp にメールで知らせる（フォームの設定「回答の通知」がオンのときだけ）。
// いちばん上に、書き込み先のスプレッドシート（連携しているとき）と、管理画面の回答ページへのボタン。
// 本文：フォーム名・回答日時・回答者・すべての質問と答え（通らなかったページの質問は出さない）。
// HTML のメールで送り、HTML を表示できないメールソフト向けに同じ内容の文字だけの本文も付ける
const jst = (d: Date) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function notifySubmission(form: FormDetail, submissionId: number): Promise<void> {
  if (!form.notify || !isMailConfigured()) return;
  const [[s], link] = await Promise.all([listSubmissions(form, { id: submissionId }), getSheetLink(form.id).catch(() => null)]);
  if (!s) return;
  const sheetUrl = link ? `https://docs.google.com/spreadsheets/d/${link.spreadsheet_id}/edit` : null;
  const adminUrl = `${SITE.siteUrl}/admin/forms/${form.id}/answers/${s.id}/`;
  const info: [string, string][] = [
    ["回答日時", jst(s.submitted_at)],
    ["回答者", s.who],
    ...(s.line_name ? ([["LINE の表示名", s.line_name]] as [string, string][]) : []),
    ...(s.staff_id !== null ? ([["スタッフ ID", String(s.staff_id)]] as [string, string][]) : []),
  ];
  const qa: [string, string][] = [];
  for (const f of form.fields) {
    if (!isInputType(f.type) || f.deleted) continue;
    const files = s.files.filter((x) => x.field_id === f.id).map((x) => x.file_name);
    const a = s.answers.get(f.id);
    if (!a && files.length === 0) continue; // 答えていない質問（通らなかったページなど）は出さない
    qa.push([f.label, files.length > 0 ? `（添付ファイル）${files.join("、")}` : answerText(f.type, a!.text, a!.json)]);
  }

  const text = [
    `フォーム「${form.title}」に回答がありました。`,
    "",
    ...(sheetUrl ? [`スプレッドシートを開く：${sheetUrl}`] : []),
    `回答を管理画面で見る：${adminUrl}`,
    "",
    ...info.map(([k, v]) => `${k}：${v}`),
    "",
    "―― 回答の内容 ――",
    ...qa.flatMap(([q, a]) => [`■ ${q}`, a, ""]),
    "※ このメールは、ホームページのフォーム管理から自動で送っています。",
  ].join("\n");

  const button = (href: string, label: string, color: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;border-radius:999px;background:${color};color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none">${esc(label)}</a>`;
  const row = (k: string, v: string) =>
    `<tr><th style="padding:8px 12px;border-bottom:1px solid #e2e9ed;text-align:left;vertical-align:top;white-space:nowrap;color:#5a6a73;font-size:13px">${esc(k)}</th><td style="padding:8px 12px;border-bottom:1px solid #e2e9ed;font-size:14px;color:#0b2a3c;white-space:pre-wrap">${esc(v)}</td></tr>`;
  const html = `<!doctype html><html lang="ja"><body style="margin:0;padding:24px;background:#f3f8f9;font-family:'Hiragino Sans','Meiryo',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:28px;border-radius:16px;background:#ffffff">
<p style="margin:0 0 6px;font-size:12px;color:#5a6a73">フォーム回答のお知らせ</p>
<h1 style="margin:0 0 18px;font-size:20px;color:#0b2a3c">${esc(form.title)}</h1>
<div style="margin:0 0 18px">${sheetUrl ? button(sheetUrl, "スプレッドシートを開く", "#188038") : ""}${button(adminUrl, "管理画面で回答を見る", "#003651")}</div>
<table style="width:100%;border-collapse:collapse;margin:0 0 20px">${info.map(([k, v]) => row(k, v)).join("")}</table>
<p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#0b2a3c">回答の内容</p>
<table style="width:100%;border-collapse:collapse">${qa.map(([q, a]) => row(q, a)).join("")}</table>
<p style="margin:20px 0 0;font-size:12px;color:#8a9aa3">このメールは、ホームページのフォーム管理から自動で送っています。</p>
</div></body></html>`;

  await sendMail({ to: FORM_NOTIFY_TO, subject: `【フォーム回答】${form.title}（${s.who}）`, text, html });
}
