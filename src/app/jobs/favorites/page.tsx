import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesList } from "@/components/jobs/FavoritesList";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/auth/staff";
import { getJobsData } from "@/lib/jobs";
import { listFavorites } from "@/lib/jobs-activity";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "気になる案件",
  description: "「気になる」に入れた案件の一覧です（ログインが必要です）。",
  section: "contact",
  hero: { en: "Favorites", ja: "気になる案件", img: "hero-staffing.jpg", crumbs: [["jobs/", "案件一覧"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("jobs/favorites/", meta), robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ログイン中のスタッフが「気になる」に入れた案件（新しく入れた順）。掲載が終わった案件は件数だけ伝える
export default async function FavoritesPage() {
  const session = await getSession();
  if (!session) redirect("/login/?next=/jobs/favorites/");

  const staff = session.staffId === null ? null : await findStaffById(session.staffId).catch(() => null);
  const [data, favorites] = await Promise.all([getJobsData(), staff?.mail ? listFavorites(staff.id, staff.mail).catch(() => []) : []]);
  const posted = new Map([...data.jobs, ...data.recruits].map((i) => [`${i.kind}-${i.id}`, i]));
  const items = favorites.map((f) => posted.get(`${f.kind}-${f.id}`)).filter((i) => i !== undefined);

  return (
    <PageShell route="jobs/favorites/" meta={meta}>
      <section className="section">
        <div className="container">
          <FavoritesList items={items} ended={favorites.length - items.length} />
        </div>
      </section>
    </PageShell>
  );
}
