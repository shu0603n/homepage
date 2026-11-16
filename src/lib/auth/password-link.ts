import { jwtVerify, SignJWT } from "jose";
import { siteUrl } from "@/lib/auth/http";
import { userExists } from "@/lib/auth/cognito";
import { findStaffByMail, isLoginBlocked } from "@/lib/auth/staff";
import { reserveSend } from "@/lib/auth/verify-code";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

// スタッフ登録の「パスワード設定リンク」。
// 登録フォームを送ると、入力されたメールアドレス宛にこのリンクを送る。リンクを開いてパスワードを決めると、
// ログイン用アカウントが作られて登録完了になる（メールアドレスが本人のものであることの確認を兼ねる）。
// リンクには「スタッフ ID・メールアドレス・有効期限」を署名して入れる（改ざんすると無効。サーバー側に状態は持たない）

export const LINK_HOURS = 48; // 50代の方も多いため、すぐに開けなくても間に合うよう長め

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export async function createPasswordLink(request: Request, staffId: number, mail: string): Promise<string> {
  const token = await new SignJWT({ purpose: "set-password", staffId, mail })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINK_HOURS}h`)
    .sign(secretKey());
  const url = siteUrl("/register/password/", request);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function readPasswordToken(token: string | undefined): Promise<{ staffId: number; mail: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "set-password" || typeof payload.staffId !== "number" || typeof payload.mail !== "string") return null;
    return { staffId: payload.staffId, mail: payload.mail };
  } catch {
    return null;
  }
}

export async function sendPasswordLinkMail(to: string, name: string | null, url: string): Promise<void> {
  await sendMail({
    to,
    subject: "【株式会社エモリスリンク】スタッフ登録 パスワード設定のご案内",
    text: [
      `${name ? `${name} 様` : "ご登録者様"}`,
      "",
      "株式会社エモリスリンクのスタッフ登録をお申し込みいただき、ありがとうございます。",
      "",
      "下のリンクを開いて、ログイン用のパスワードを設定してください。",
      "パスワードを設定すると、登録が完了します。",
      "",
      url,
      "",
      `※ リンクの有効期限は${LINK_HOURS}時間です。`,
      "※ 期限が切れた場合は、ログイン画面の「パスワードをお忘れの方」から、もう一度このメールをお送りできます。",
      "※ このメールに心当たりがない場合は、何もせずに破棄してください。",
      "",
      "ご不明な点は、お電話にてお気軽にお問い合わせください。",
      `株式会社エモリスリンク　TEL ${SITE.tel}（受付 9:00〜18:00 土日祝除く）`,
    ].join("\n"),
  });
}

export type ResendResult = "sent" | "not_pending" | { limited: string };

// パスワードがまだ設定されていない登録（スタッフ情報はあるが、ログイン用アカウントがない）なら、設定リンクを送り直す
export async function resendPasswordLinkIfPending(request: Request, mail: string): Promise<ResendResult> {
  const staff = await findStaffByMail(mail);
  if (!staff || isLoginBlocked(staff) || (await userExists(mail))) return "not_pending";
  const limited = reserveSend(mail);
  if (limited) return { limited };
  await sendPasswordLinkMail(mail, staff.name ?? null, await createPasswordLink(request, staff.id, mail));
  return "sent";
}
