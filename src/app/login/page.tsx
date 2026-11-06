import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LineAutoLogin } from "@/components/auth/LineAutoLogin";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "ログイン",
  description: "株式会社エモリスリンクのスタッフ向けログインページです。",
  section: "contact",
  hero: { en: "Login", ja: "ログイン", img: "hero-contact.jpg", crumbs: [["job-seekers/", "お仕事をお探しの方"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("login/", meta), robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <PageShell route="login/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">登録済みのメールアドレスとパスワードでログインしてください。</p>
          </div>
          <LoginForm next={next} />
          <LineAutoLogin next={next} />
        </div>
      </section>
    </PageShell>
  );
}
