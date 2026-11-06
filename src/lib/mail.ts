import nodemailer from "nodemailer";

// 応募通知メール。Amazon SES の SMTP で送る（.env の SES_SMTP_HOST / SES_SMTP_USER / SES_SMTP_PASS）。
// 送信元は SES で検証済みのドメイン・アドレスにする必要がある（既定は tribe-group.jp。MAIL_FROM で変更可）。
// 通知の失敗で応募自体を失敗させないよう、呼び出し側ではエラーをログに残すだけにする

export const APPLICATION_NOTIFY_TO = process.env.APPLICATION_NOTIFY_TO || "recruit_hr@emorislink.co.jp";
const DEFAULT_FROM = "株式会社エモリスリンク <noreply@tribe-group.jp>";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SES_SMTP_HOST && process.env.SES_SMTP_USER && process.env.SES_SMTP_PASS);
}

export async function sendMail(message: { to: string; subject: string; text: string }): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: process.env.SES_SMTP_USER, pass: process.env.SES_SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.MAIL_FROM || DEFAULT_FROM, ...message });
}
