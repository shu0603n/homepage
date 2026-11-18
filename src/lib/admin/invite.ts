import { jwtVerify, SignJWT } from "jose";
import { siteUrl } from "@/lib/auth/http";
import { findAdminById, type AdminRow } from "@/lib/admin/store";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

// 管理者の「パスワード設定のご案内」メール（新しく追加したとき・パスワードを忘れたとき）。
// リンクには管理者 ID と「パスワードを最後に変えた日時」を署名して入れる。パスワードを設定すると日時が変わるので、
// 同じリンクは二度と使えない。有効期限は 72 時間
export const SETUP_HOURS = 72;
const AUDIENCE = "emoris-admin-setup";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export async function createAdminSetupLink(request: Request, admin: Pick<AdminRow, "id" | "pwd_version">): Promise<string> {
  const token = await new SignJWT({ pwd: admin.pwd_version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SETUP_HOURS}h`)
    .sign(secretKey());
  const url = siteUrl("/admin/setup/", request);
  url.searchParams.set("token", token);
  return url.toString();
}

// リンクが有効なら、その管理者を返す（期限切れ・使用済み・削除済みなら null）
export async function readAdminSetupToken(token: string | undefined): Promise<AdminRow | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: AUDIENCE });
    const admin = await findAdminById(Number(payload.sub));
    if (!admin || typeof payload.pwd !== "number" || admin.pwd_version !== payload.pwd) return null;
    return admin;
  } catch {
    return null;
  }
}

export async function sendAdminSetupMail(to: string, name: string | null, url: string, kind: "invite" | "reset", from: string): Promise<void> {
  const invite = kind === "invite";
  await sendMail({
    to,
    subject: invite ? "【株式会社エモリスリンク】管理ページ パスワード設定のご案内" : "【株式会社エモリスリンク】管理ページ パスワード再設定のご案内",
    text: [
      `${name ? `${name} さん` : "ご担当者さま"}`,
      "",
      invite
        ? `${from} さんが、あなたをホームページの管理ページ（内勤用）に追加しました。`
        : `${from} さんが、ホームページの管理ページ（内勤用）のパスワード再設定のご案内を送りました。`,
      "下のリンクを開いて、ログイン用のパスワードを決めてください。",
      "",
      url,
      "",
      `※ リンクの有効期限は${SETUP_HOURS}時間です。一度パスワードを設定すると、このリンクは使えなくなります。`,
      "※ 期限が切れた場合は、管理ページを使っているほかの方に、ご案内メールの再送を頼んでください。",
      invite ? "" : "※ 心当たりがない場合は、このメールを破棄してください（今のパスワードはそのまま使えます）。",
      "",
      `ログイン画面：${new URL("/admin/login/", url).toString()}`,
      `株式会社エモリスリンク（${SITE.tel}）`,
    ]
      .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
      .join("\n"),
  });
}
