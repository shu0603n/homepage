import { jwtVerify, SignJWT } from "jose";
import { siteUrl } from "@/lib/auth/http";
import { userLastModified } from "@/lib/auth/cognito";
import { findStaffByMail, isLoginBlocked } from "@/lib/auth/staff";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

// メールで送る「パスワード設定リンク」（確認コードは使わない。50代の方も多いため、リンクを押すだけで済むようにする）。
//   - set-password  ：スタッフ登録のあと、初めてパスワードを決める（ログイン用アカウントを作る）
//   - reset-password：パスワードを忘れたときに、新しいパスワードを決める
//   - activate      ：社内システムで登録済みのスタッフが、ホームページのマイページを使い始めるためにパスワードを決める
//   - line-setup    ：LINE から来て、まだ LINE と連携していないスタッフがパスワードを決める（決めると、その LINE と連携する）。
//                     リンクには LINE が本人確認した LINE の userId と表示名も署名して入れる
// リンクには「用途・スタッフ ID・メールアドレス・発行日時・有効期限」を署名して入れる（改ざんすると無効。サーバー側に状態は持たない）。
// 一度パスワードを設定すると、ログイン用アカウントの最終更新日時がリンクの発行日時より新しくなるので、同じリンクはもう使えない

export type LinkPurpose = "set-password" | "reset-password" | "activate" | "line-setup";

const LINK: Record<LinkPurpose, { path: string; hours: number }> = {
  "set-password": { path: "/register/password/", hours: 48 }, // すぐに開けなくても間に合うよう長め
  "reset-password": { path: "/reset-password/", hours: 24 },
  activate: { path: "/password-setup/set/", hours: 72 }, // 案内を見てから手続きするまで日が空くこともあるため長め
  "line-setup": { path: "/password-setup/line/", hours: 24 },
};

export const LINK_HOURS = LINK["set-password"].hours;

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

type LineClaim = { lineUserId: string; lineName: string | null };

export async function createPasswordLink(request: Request, purpose: LinkPurpose, staffId: number, mail: string, line?: LineClaim): Promise<string> {
  const token = await new SignJWT({ purpose, staffId, mail, ...(line ? { lineUserId: line.lineUserId, lineName: line.lineName } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINK[purpose].hours}h`)
    .sign(secretKey());
  const url = siteUrl(LINK[purpose].path, request);
  url.searchParams.set("token", token);
  return url.toString();
}

export type PasswordLink = { staffId: number; mail: string; issuedAt: number; line: LineClaim | null };

export async function readPasswordToken(token: string | undefined, purpose: LinkPurpose): Promise<PasswordLink | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== purpose || typeof payload.staffId !== "number" || typeof payload.mail !== "string" || !payload.iat) return null;
    const line = typeof payload.lineUserId === "string" && payload.lineUserId ? { lineUserId: payload.lineUserId, lineName: typeof payload.lineName === "string" ? payload.lineName : null } : null;
    if (purpose === "line-setup" && !line) return null;
    return { staffId: payload.staffId, mail: payload.mail, issuedAt: payload.iat * 1000, line };
  } catch {
    return null;
  }
}

// リンクの発行より後に、パスワードが設定されている（＝このリンクは使用済み）か
export async function isLinkUsed(link: PasswordLink): Promise<boolean> {
  const modified = await userLastModified(link.mail);
  return modified !== null && modified.getTime() > link.issuedAt;
}

const FOOTER = ["ご不明な点は、お電話にてお気軽にお問い合わせください。", `株式会社エモリスリンク　TEL ${SITE.tel}（受付 9:00〜18:00 土日祝除く）`];

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
      `※ リンクの有効期限は${LINK["set-password"].hours}時間です。`,
      "※ 期限が切れた場合は、ログイン画面の「パスワードをお忘れの方」から、もう一度このメールをお送りできます。",
      "※ このメールに心当たりがない場合は、何もせずに破棄してください。",
      "",
      ...FOOTER,
    ].join("\n"),
  });
}

async function sendResetLinkMail(to: string, name: string | null, url: string): Promise<void> {
  await sendMail({
    to,
    subject: "【株式会社エモリスリンク】パスワード再設定のご案内",
    text: [
      `${name ? `${name} 様` : "ご登録者様"}`,
      "",
      "パスワードの再設定のお手続きを受け付けました。",
      "",
      "下のリンクを開いて、新しいパスワードを設定してください。",
      "",
      url,
      "",
      `※ リンクの有効期限は${LINK["reset-password"].hours}時間です。一度パスワードを設定すると、このリンクは使えなくなります。`,
      "※ 期限が切れた場合は、ログイン画面の「パスワードをお忘れの方」から、もう一度お手続きください。",
      "※ このメールに心当たりがない場合は、何もせずに破棄してください（パスワードは変わりません）。",
      "",
      ...FOOTER,
    ].join("\n"),
  });
}

async function sendActivateLinkMail(to: string, name: string | null, url: string): Promise<void> {
  await sendMail({
    to,
    subject: "【株式会社エモリスリンク】マイページ ご利用開始（パスワード設定）のご案内",
    text: [
      `${name ? `${name} 様` : "ご登録者様"}`,
      "",
      "いつも株式会社エモリスリンクをご利用いただき、ありがとうございます。",
      "",
      "下のリンクを開いて、ホームページのマイページにログインするためのパスワードを設定してください。",
      "パスワードを設定すると、マイページで登録情報の確認・変更や、お仕事の検索・応募ができるようになります。",
      "",
      url,
      "",
      `※ リンクの有効期限は${LINK.activate.hours}時間です。一度パスワードを設定すると、このリンクは使えなくなります。`,
      "※ 期限が切れた場合は、ホームページの「パスワード設定のご案内」から、もう一度お手続きください。",
      "※ このメールに心当たりがない場合は、何もせずに破棄してください。",
      "",
      ...FOOTER,
    ].join("\n"),
  });
}

// 既に登録済みのスタッフ向け「パスワード設定のご案内」：まだパスワードがない方には設定リンクを、
// 既にパスワードがある方には再設定リンクを送る。登録がない・ログインできない状態のアドレスには何も送らない
export async function sendActivationLink(request: Request, mail: string): Promise<"activate" | "reset" | "none"> {
  const staff = await findStaffByMail(mail);
  if (!staff || isLoginBlocked(staff)) return "none";
  const name = staff.name ?? null;
  if ((await userLastModified(mail)) === null) {
    await sendActivateLinkMail(mail, name, await createPasswordLink(request, "activate", staff.id, mail));
    return "activate";
  }
  await sendResetLinkMail(mail, name, await createPasswordLink(request, "reset-password", staff.id, mail));
  return "reset";
}

// 「パスワードをお忘れの方」：登録状況に合わせて、パスワード設定リンク（未設定の方）か再設定リンクを送る。
// 登録がない・ログインできない状態のアドレスには何も送らない（呼び出し側は、登録の有無が分からない同じ応答を返す）
export async function sendForgotPasswordLink(request: Request, mail: string): Promise<"set" | "reset" | "none"> {
  const staff = await findStaffByMail(mail);
  if (!staff || isLoginBlocked(staff)) return "none";
  const name = staff.name ?? null;
  if ((await userLastModified(mail)) === null) {
    await sendPasswordLinkMail(mail, name, await createPasswordLink(request, "set-password", staff.id, mail));
    return "set";
  }
  await sendResetLinkMail(mail, name, await createPasswordLink(request, "reset-password", staff.id, mail));
  return "reset";
}

// LINE から来て未連携の方へ：パスワード設定リンク（設定すると、その LINE と連携される）。
// 登録がない・ログインできない状態のアドレスには何も送らない（呼び出し側は、登録の有無が分からない同じ応答を返す）
export async function sendLineSetupLink(request: Request, mail: string, line: LineClaim): Promise<"sent" | "none"> {
  const staff = await findStaffByMail(mail);
  if (!staff || isLoginBlocked(staff)) return "none";
  const url = await createPasswordLink(request, "line-setup", staff.id, mail, line);
  await sendMail({
    to: mail,
    subject: "【株式会社エモリスリンク】パスワード設定・LINE 連携のご案内",
    text: [
      `${staff.name ? `${staff.name} 様` : "ご登録者様"}`,
      "",
      "LINE からのお手続きを受け付けました。",
      "",
      "下のリンクを開いて、ログイン用のパスワードを設定してください。",
      `パスワードを設定すると、LINE（${line.lineName ? `表示名「${line.lineName}」` : "お手続きに使った LINE"}）と連携され、次回から LINE のメニューを開くだけで自動でログインできます。`,
      "",
      url,
      "",
      `※ リンクの有効期限は${LINK["line-setup"].hours}時間です。一度パスワードを設定すると、このリンクは使えなくなります。`,
      "※ このメールに心当たりがない場合は、リンクを開かずに破棄してください（パスワードも LINE の連携も変わりません）。",
      "",
      ...FOOTER,
    ].join("\n"),
  });
  return "sent";
}
