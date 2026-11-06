import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JobsExplorer } from "@/components/jobs/JobsExplorer";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { getJobsData } from "@/lib/jobs";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "案件一覧",
  description: "株式会社エモリスリンクの募集中の案件一覧です（ログインが必要です）。",
  section: "contact",
  hero: { en: "Jobs", ja: "案件一覧", img: "hero-staffing.jpg" },
} as const;

export const metadata: Metadata = { ...buildMetadata("jobs/", meta), robots: { index: false, follow: false } };

// ログインしている人だけが見られる。LINE アプリ内ブラウザで開いたときも、ログイン済みならそのまま一覧が表示される
export default async function JobsPage() {
  if (!(await getSession())) redirect("/login/?next=/jobs/");
  const data = await getJobsData();

  return (
    <PageShell route="jobs/" meta={meta}>
      <section className="section">
        <div className="container">
          <JobsExplorer data={data} />
        </div>
      </section>
    </PageShell>
  );
}
