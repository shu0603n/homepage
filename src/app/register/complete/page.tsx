import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LineFriendStep } from "@/components/auth/LineFriendStep";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/auth/staff";
import { lineFriendUrl } from "@/lib/line-friend";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "スタッフ登録完了",
  description: "株式会社エモリスリンクのスタッフ登録が完了しました。LINE 公式アカウントを友だち追加してください。",
  section: "contact",
  hero: { en: "Thank You", ja: "スタッフ登録完了", img: "hero-contact.jpg", crumbs: [["job-seekers/", "お仕事をお探しの方"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("register/complete/", meta), robots: { index: false, follow: false } };

// スタッフ登録の完了ページ。登録 → LINE 友だち追加 → 担当者からの連絡、の流れを案内する（next-app の staff-register と同じ流れ）
export default async function RegisterCompletePage() {
  const session = await getSession();
  if (!session || session.staffId === null) redirect("/login/?next=/register/complete/");

  const staff = await findStaffById(session.staffId).catch(() => null);
  const linked = Boolean(staff?.line_user_id);

  return (
    <PageShell route="register/complete/" meta={meta}>
      <section className="section">
        <div className="container container--narrow">
          <ol className="register-steps" aria-label="ご登録の流れ">
            <li className="is-done">
              <span>1</span>スタッフ登録
            </li>
            <li className={linked ? "is-done" : "is-current"}>
              <span>2</span>LINE 友だち追加
            </li>
            <li>
              <span>3</span>担当者からご連絡
            </li>
          </ol>

          <div className="lead-block fade mb-48">
            <p className="lead">{staff?.name ? `${staff.name} 様、` : ""}ご登録ありがとうございます。</p>
            <p>スタッフ登録が完了しました。マイページにもログインした状態です。</p>
          </div>

          <LineFriendStep href={lineFriendUrl(session.staffId)} linked={linked} />

          <p className="lead-block mypage-section">
            <Link className="text-arrow" href="/mypage/">
              マイページへ進む
            </Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
