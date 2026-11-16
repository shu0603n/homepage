import type { Metadata } from "next";
import Link from "next/link";
import { PasswordSetForm } from "@/components/auth/PasswordSetForm";
import { PageShell } from "@/components/site/PageShell";
import { readPasswordToken } from "@/lib/auth/password-link";
import { buildMetadata } from "@/lib/metadata";

// 「パスワード再設定のご案内」メールに記載したリンクの行き先。新しいパスワードを決めると、そのままログイン状態になる
const meta = {
  title: "パスワードの再設定",
  description: "株式会社エモリスリンクのスタッフ向けログインのパスワードを再設定します。",
  section: "contact",
  hero: { en: "Password", ja: "パスワードの再設定", img: "hero-contact.jpg", crumbs: [["login/", "ログイン"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("reset-password/", meta), robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const link = await readPasswordToken(token, "reset-password");

  return (
    <PageShell route="reset-password/" meta={meta}>
      <section className="section">
        <div className="container">
          {link && token ? (
            <>
              <div className="lead-block fade mb-48">
                <p className="lead">新しいパスワードを決めてください。</p>
              </div>
              <PasswordSetForm token={token} email={link.mail} endpoint="/api/auth/reset-password/" next="/mypage/" label="新しいパスワード" submitLabel="パスワードを変更する" />
            </>
          ) : (
            <div className="form form--auth">
              <p className="form__status is-ng" role="alert">
                このリンクは有効期限が切れているか、正しくありません。
              </p>
              <p className="form__note">お手数ですが、「パスワードをお忘れの方」から、もう一度お手続きください。</p>
              <div className="form__actions">
                <Link className="btn" href="/forgot-password/">
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
