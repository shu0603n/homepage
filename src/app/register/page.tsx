import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Privacy } from "@/components/partials/Privacy";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "スタッフ登録",
  description: "株式会社エモリスリンクのスタッフ登録フォームです。登録するとマイページにログインできます。",
  section: "contact",
  hero: { en: "Register", ja: "スタッフ登録", img: "hero-contact.jpg", crumbs: [["job-seekers/", "お仕事をお探しの方"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("register/", meta), robots: { index: false, follow: false } };

export default async function RegisterPage() {
  if (await getSession()) redirect("/mypage/");

  return (
    <PageShell route="register/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">お仕事をご紹介するための登録フォームです。</p>
            <p>ご入力いただいた内容で登録され、ログイン用のアカウント（メールアドレス＋パスワード）も同時に作成されます。</p>
          </div>
          <RegisterForm privacy={<Privacy />} />
        </div>
      </section>
    </PageShell>
  );
}
