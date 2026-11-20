import { answerText, isInputType } from "@/lib/forms-def";
import { FORM_NOTIFY_TO } from "@/lib/form-notify-to";
import { listSubmissions, type FormDetail } from "@/lib/admin/forms";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

// フォームに回答があったら、recruit_hr@emorislink.co.jp にメールで知らせる（フォームの設定「回答の通知」がオンのときだけ）。
// 本文：フォーム名・回答日時・回答者・すべての質問と答え（通らなかったページの質問は出さない）・管理画面の回答ページへのリンク
const jst = (d: Date) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);

export async function notifySubmission(form: FormDetail, submissionId: number): Promise<void> {
  if (!form.notify || !isMailConfigured()) return;
  const [s] = await listSubmissions(form, { id: submissionId });
  if (!s) return;
  const lines = [
    `フォーム「${form.title}」に回答がありました。`,
    "",
    `回答日時：${jst(s.submitted_at)}`,
    `回答者：${s.who}`,
    ...(s.line_name ? [`LINE の表示名：${s.line_name}`] : []),
    ...(s.staff_id !== null ? [`スタッフ ID：${s.staff_id}`] : []),
    "",
    "―― 回答の内容 ――",
  ];
  for (const f of form.fields) {
    if (!isInputType(f.type) || f.deleted) continue;
    const files = s.files.filter((x) => x.field_id === f.id).map((x) => x.file_name);
    const a = s.answers.get(f.id);
    if (!a && files.length === 0) continue; // 答えていない質問（通らなかったページなど）は出さない
    const value = files.length > 0 ? `（添付ファイル）${files.join("、")}` : answerText(f.type, a!.text, a!.json);
    lines.push(`■ ${f.label}`, value, "");
  }
  lines.push("―――――――――", `回答を管理画面で見る：${SITE.siteUrl}/admin/forms/${form.id}/answers/${s.id}/`, "", "※ このメールは、ホームページのフォーム管理から自動で送っています。");
  await sendMail({ to: FORM_NOTIFY_TO, subject: `【フォーム回答】${form.title}（${s.who}）`, text: lines.join("\n") });
}
