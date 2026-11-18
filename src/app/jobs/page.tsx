import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LineAutoLogin } from "@/components/auth/LineAutoLogin";
import { JobsExplorer } from "@/components/jobs/JobsExplorer";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { getJobsData } from "@/lib/jobs";
import { myFavoriteKeys } from "@/lib/jobs-activity";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "案件一覧",
  description: "株式会社エモリスリンクの募集中の案件一覧です（ログインが必要です）。",
  section: "contact",
  hero: { en: "Jobs", ja: "案件一覧", img: "hero-staffing.jpg" },
} as const;

export const metadata: Metadata = { ...buildMetadata("jobs/", meta), robots: { index: false, follow: false } };

// ログインしている人だけが見られる。LINE アプリ内ブラウザで開いたときも、ログイン済みならそのまま一覧が表示される。
// 未ログインで LINE アプリ内（リッチメニュー「求人検索」の LIFF）から開かれたときは、ここで LINE の自動ログインを試す
export default async function JobsPage() {
  const session = await getSession();
  if (!session) {
    const inLineApp = / Line\//.test((await headers()).get("user-agent") ?? "");
    if (!inLineApp || !process.env.LIFF_ID) redirect("/login/?next=/jobs/");
    return (
      <PageShell route="jobs/" meta={meta}>
        <section className="section">
          <div className="container">
            <p className="line-auto-login" role="status">
              <span className="line-auto-login__spinner" aria-hidden="true" />
              LINE でログインしています…
            </p>
            <LineAutoLogin next="/jobs/" fallback="/login/?next=/jobs/" />
          </div>
        </section>
      </PageShell>
    );
  }
  // 案件と、このスタッフが「気になる」に入れている案件を同時に読む
  const [data, favorites] = await Promise.all([getJobsData(), myFavoriteKeys(session.staffId)]);

  return (
    <PageShell route="jobs/" meta={meta}>
      <section className="section">
        <div className="container">
          <JobsExplorer data={data} favorites={favorites} />
        </div>
      </section>
    </PageShell>
  );
}
