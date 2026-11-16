import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Privacy } from "@/components/partials/Privacy";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

// 来社登録フォーム：来社されたスタッフに、その場で入力してもらう項目の少ない登録フォーム（next-app の staff-register-visit の置き換え）。
// サイト内のどこからもリンクしない・検索にも出さない。社内で URL（/register/visit/）を直接開いて使う
const meta = {
  title: "来社登録フォーム",
  description: "株式会社エモリスリンクの来社登録フォームです。",
  section: "contact",
  hero: { en: "Register", ja: "来社登録フォーム", img: "hero-register.jpg" },
} as const;

export const metadata: Metadata = { ...buildMetadata("register/visit/", meta), robots: { index: false, follow: false } };

export default function RegisterVisitPage() {
  return (
    <PageShell route="register/visit/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">ご来社いただき、ありがとうございます。</p>
            <p>以下の項目をご入力ください。ご入力のメールアドレスに、マイページのパスワード設定のご案内をお送りします。</p>
          </div>
          <RegisterForm privacy={<Privacy />} variant="visit" />
        </div>
      </section>
    </PageShell>
  );
}
