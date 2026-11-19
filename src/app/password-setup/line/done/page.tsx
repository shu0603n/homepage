import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

// パスワード設定・LINE 連携の完了画面。メールのリンクは LINE の外のブラウザで開かれることが多いので、LINE に戻る案内を出す
const meta = {
  title: "LINE 連携の完了",
  description: "パスワードの設定と LINE の連携が完了しました。",
  section: "contact",
  hero: { en: "Complete", ja: "LINE 連携の完了", img: "hero-register.jpg", crumbs: [["login/", "ログイン"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("password-setup/line/done/", meta), robots: { index: false, follow: false } };

export default function PasswordSetupLineDonePage() {
  return (
    <PageShell route="password-setup/line/done/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="form form--auth register-sent">
            <p className="register-sent__icon">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
            </p>
            <h2 className="register-sent__title">パスワードを設定し、LINE と連携しました</h2>
            <ol className="register-sent__steps">
              <li>LINE アプリに戻ってください。</li>
              <li>エモリスリンクの LINE のメニューから開くと、自動でログインされます。</li>
            </ol>
            <div className="form__actions">
              <Link className="btn" href="/mypage/">
                このままマイページを見る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
