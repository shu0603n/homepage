import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

// 既に登録済みのスタッフ（社内システムや以前の登録フォームで登録した方）向け：マイページのパスワード設定のご案内。
// このページの URL（/password-setup/）を、LINE やメールでスタッフにお知らせして使う
const meta = {
  title: "パスワード設定のご案内",
  description: "株式会社エモリスリンクに登録済みのスタッフの方が、マイページにログインするためのパスワードを設定するページです。",
  section: "contact",
  hero: { en: "Password", ja: "パスワード設定のご案内", img: "hero-register.jpg", crumbs: [["login/", "ログイン"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("password-setup/", meta), robots: { index: false, follow: false } };

export default function PasswordSetupPage() {
  return (
    <PageShell route="password-setup/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">既にスタッフ登録がお済みの方へ</p>
            <p>
              ホームページのマイページでは、登録情報の確認・変更や、お仕事の検索・応募ができます。
              <br className="pc-only" />
              ご利用には、ログイン用のパスワードの設定が必要です。
            </p>
          </div>
          <ForgotPasswordForm variant="setup" />
        </div>
      </section>
    </PageShell>
  );
}
