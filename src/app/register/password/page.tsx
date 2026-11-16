import type { Metadata } from "next";
import Link from "next/link";
import { PasswordSetForm } from "@/components/auth/PasswordSetForm";
import { PageShell } from "@/components/site/PageShell";
import { readPasswordToken } from "@/lib/auth/password-link";
import { buildMetadata } from "@/lib/metadata";

// スタッフ登録のメールに記載したリンクの行き先。パスワードを決めると登録完了（ログイン状態になる）
const meta = {
  title: "パスワードの設定",
  description: "株式会社エモリスリンクのスタッフ登録：ログイン用パスワードの設定ページです。",
  section: "contact",
  hero: { en: "Password", ja: "パスワードの設定", img: "hero-contact.jpg", crumbs: [["register/", "スタッフ登録"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("register/password/", meta), robots: { index: false, follow: false } };

export default async function RegisterPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const link = await readPasswordToken(token, "set-password");

  return (
    <PageShell route="register/password/" meta={meta}>
      <section className="section">
        <div className="container">
          {link && token ? (
            <>
              <div className="lead-block fade mb-48">
                <p className="lead">ログイン用のパスワードを決めてください。</p>
                <p>パスワードを設定すると、スタッフ登録が完了します。</p>
              </div>
              <PasswordSetForm token={token} email={link.mail} endpoint="/api/auth/register/password/" next="/register/complete/" submitLabel="パスワードを設定して登録を完了する" />
            </>
          ) : (
            <div className="form form--auth">
              <p className="form__status is-ng" role="alert">
                このリンクは有効期限が切れているか、正しくありません。
              </p>
              <p className="form__note">
                お手数ですが、ログイン画面の「パスワードをお忘れの方」にご登録のメールアドレスを入力して、もう一度ご案内メールをお送りください。
              </p>
              <div className="form__actions">
                <Link className="btn" href="/forgot-password/">
                  ご案内メールを送り直す
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
