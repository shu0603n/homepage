import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/auth/staff";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "マイページ",
  description: "株式会社エモリスリンクのスタッフ向けマイページです。",
  section: "contact",
  hero: { en: "My Page", ja: "マイページ", img: "hero-contact.jpg" },
} as const;

export const metadata: Metadata = { ...buildMetadata("mypage/", meta), robots: { index: false, follow: false } };

// ログインが必要なページ。セッションがなければログイン画面へ移動する（ログイン後はここへ戻る）
export default async function MyPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login/?next=/mypage/");

  const staff = session.staffId === null ? null : await findStaffById(session.staffId).catch(() => null);
  const justRegistered = (await searchParams).registered === "1";

  return (
    <PageShell route="mypage/" meta={meta}>
      <section className="section">
        <div className="container container--narrow">
          {justRegistered && <p className="form__status is-ok">ご登録ありがとうございます。担当者よりご連絡いたします。</p>}
          <div className="lead-block fade mb-48">
            <p className="lead">{staff?.name ? `${staff.name} 様、ようこそ。` : "ようこそ。"}</p>
            <p>ログイン中のメールアドレス：{session.email ?? "（LINE でログイン中）"}</p>
          </div>
          <p className="lead-block">
            <Link className="btn" href="/jobs/">
              案件一覧を見る
            </Link>
          </p>
          <p className="lead-block">
            <LogoutButton />
          </p>
        </div>
      </section>
    </PageShell>
  );
}
