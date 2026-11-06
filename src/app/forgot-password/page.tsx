import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "パスワードの再設定",
  description: "株式会社エモリスリンクのスタッフ向けログインのパスワードを再設定します。",
  section: "contact",
  hero: { en: "Password", ja: "パスワードの再設定", img: "hero-contact.jpg", crumbs: [["login/", "ログイン"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("forgot-password/", meta), robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <PageShell route="forgot-password/" meta={meta}>
      <section className="section">
        <div className="container">
          <ForgotPasswordForm />
        </div>
      </section>
    </PageShell>
  );
}
