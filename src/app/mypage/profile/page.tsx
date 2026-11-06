import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailChangeForm } from "@/components/auth/EmailChangeForm";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { getStaffProfile } from "@/lib/auth/staff";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "登録情報の編集",
  description: "株式会社エモリスリンクのスタッフ向け、登録情報の編集ページです。",
  section: "contact",
  hero: { en: "Profile", ja: "登録情報の編集", img: "hero-contact.jpg", crumbs: [["mypage/", "マイページ"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("mypage/profile/", meta), robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login/?next=/mypage/profile/");

  const profile = session.staffId === null ? null : await getStaffProfile(session.staffId).catch(() => null);

  return (
    <PageShell route="mypage/profile/" meta={meta}>
      <section className="section">
        <div className="container">
          {profile ? <ProfileForm profile={profile} /> : <p>スタッフ情報が見つかりません。お手数ですが、お電話にてお問い合わせください。</p>}
          {profile && <EmailChangeForm currentEmail={profile.mail} canChange={session.via === "cognito" && Boolean(session.email)} />}
          <ul className="auth-links">
            <li>
              <Link href="/mypage/">マイページに戻る</Link>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
