import type { Metadata } from "next";
import Link from "next/link";
import { PasswordSetForm } from "@/components/auth/PasswordSetForm";
import { PageShell } from "@/components/site/PageShell";
import { readPasswordToken } from "@/lib/auth/password-link";
import { buildMetadata } from "@/lib/metadata";

// 「マイページ ご利用開始（パスワード設定）のご案内」メールに記載したリンクの行き先。
// パスワードを決めると、そのままログイン状態でマイページへ移る
const meta = {
  title: "パスワードの設定",
  description: "株式会社エモリスリンクのマイページにログインするためのパスワードを設定します。",
  section: "contact",
  hero: { en: "Password", ja: "パスワードの設定", img: "hero-register.jpg", crumbs: [["password-setup/", "パスワード設定のご案内"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("password-setup/set/", meta), robots: { index: false, follow: false } };

export default async function PasswordSetupSetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const link = await readPasswordToken(token, "activate");

  return (
    <PageShell route="password-setup/set/" meta={meta}>
      <section className="section">
        <div className="container">
          {link && token ? (
            <>
              <div className="lead-block fade mb-48">
                <p className="lead">ログイン用のパスワードを決めてください。</p>
                <p>パスワードを設定すると、マイページをご利用いただけます。</p>
              </div>
              <PasswordSetForm token={token} email={link.mail} endpoint="/api/auth/register/password/" next="/mypage/" submitLabel="パスワードを設定する" />
            </>
          ) : (
            <div className="form form--auth">
              <p className="form__status is-ng" role="alert">
                このリンクは有効期限が切れているか、正しくありません。
              </p>
              <p className="form__note">お手数ですが、「パスワード設定のご案内」から、もう一度お手続きください。</p>
              <div className="form__actions">
                <Link className="btn" href="/password-setup/">
                  もう一度お手続きする
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
