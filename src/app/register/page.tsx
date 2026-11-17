import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Privacy } from "@/components/partials/Privacy";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "スタッフ登録",
  description: "札幌の株式会社エモリスリンクのスタッフ登録フォームです。Webから登録でき、マイページでお仕事の検索・応募や登録情報の変更ができます。",
  section: "contact",
  hero: { en: "Register", ja: "スタッフ登録", img: "hero-register.jpg", crumbs: [["job-seekers/", "お仕事をお探しの方"]] },
} as const;

// スタッフ登録への入口を増やすため、検索結果に載せる（来社登録 /register/visit/ は店頭用なので載せない）
export const metadata: Metadata = buildMetadata("register/", meta);

export default async function RegisterPage() {
  if (await getSession()) redirect("/mypage/");

  return (
    <PageShell route="register/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">お仕事をご紹介するための登録フォームです。</p>
            <p>ご入力のメールアドレスに「パスワード設定のご案内」メールをお送りします。メールのリンクからパスワードを設定すると、登録が完了します。</p>
          </div>
          <RegisterForm privacy={<Privacy />} />
        </div>
      </section>
    </PageShell>
  );
}
