import type { Metadata } from "next";
import { PasswordSetForm } from "@/components/auth/PasswordSetForm";
import { PageShell } from "@/components/site/PageShell";
import { readPasswordToken } from "@/lib/auth/password-link";
import { buildMetadata } from "@/lib/metadata";

// 「パスワード設定・LINE 連携のご案内」メール（LINE から来て未連携の方向け）に記載したリンクの行き先。
// パスワードを決めると、リンクに入っている LINE と連携し、ログイン状態で完了画面へ移る（api/auth/line-setup/finish）。
// どの LINE と連携するかを、LINE の表示名で本人に見せる（他人が自分の LINE で手続きしたリンクを、うっかり使わないように）
const meta = {
  title: "パスワードの設定・LINE 連携",
  description: "株式会社エモリスリンクのマイページのパスワードを設定し、LINE と連携します。",
  section: "contact",
  hero: { en: "Password", ja: "パスワードの設定", img: "hero-register.jpg", crumbs: [["login/", "ログイン"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("password-setup/line/", meta), robots: { index: false, follow: false } };

export default async function PasswordSetupLinePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const link = await readPasswordToken(token, "line-setup");

  return (
    <PageShell route="password-setup/line/" meta={meta}>
      <section className="section">
        <div className="container">
          {link?.line && token ? (
            <>
              <div className="lead-block fade mb-48">
                <p className="lead">ログイン用のパスワードを決めてください。</p>
                <p>パスワードを設定すると LINE と連携され、次回から LINE のメニューを開くだけで自動でログインできます。</p>
              </div>
              <p className="form__status is-ok line-login__error line-setup__target">
                <i className="bi bi-line" aria-hidden="true" /> 連携する LINE：<strong>{link.line.lineName ? `「${link.line.lineName}」` : "お手続きに使った LINE"}</strong>
                <br />
                <small>ご自身の LINE でない場合は、パスワードを設定せずにこの画面を閉じてください。</small>
              </p>
              <PasswordSetForm token={token} email={link.mail} endpoint="/api/auth/line-setup/finish/" next="/password-setup/line/done/" submitLabel="設定して連携する" />
            </>
          ) : (
            <div className="form form--auth">
              <p className="form__status is-ng" role="alert">
                このリンクは有効期限が切れているか、正しくありません。
              </p>
              <p className="form__note">お手数ですが、LINE のメニューからもう一度開き、お手続きください。</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
