import nodemailer from "nodemailer";

// 応募通知メール。送信設定は .env の SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
// 通知の失敗で応募自体を失敗させないよう、呼び出し側ではエラーをログに残すだけにする

export const APPLICATION_NOTIFY_TO = process.env.APPLICATION_NOTIFY_TO || "recruit_hr@emorislink.co.jp";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(message: { to: string; subject: string; text: string }): Promise<void> {
  const port = Number(process.env.SMTP_PORT) || 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...message });
}
