import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplyForm } from "@/components/jobs/ApplyForm";
import { formatRecruitSalary } from "@/components/jobs/format";
import { FavoriteButton, JobDetailView } from "@/components/jobs/JobActivity";
import { myFavoriteKeys } from "@/lib/jobs-activity";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/auth/staff";
import { getRecruitDetail } from "@/lib/jobs";
import { buildMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { ...buildMetadata(`jobs/recruit/${id}/`, { title: "案件詳細" }), robots: { index: false, follow: false } };
}

// 人材紹介（正社員）の案件詳細
export default async function RecruitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login/?next=/jobs/recruit/${encodeURIComponent(id)}/`);

  const recruitId = Number(id);
  const job = Number.isInteger(recruitId) && recruitId > 0 ? await getRecruitDetail(recruitId) : null;
  if (!job) notFound();

  const [staff, favorites] = await Promise.all([session.staffId === null ? null : findStaffById(session.staffId).catch(() => null), myFavoriteKeys(session.staffId)]);
  const meta = {
    title: job.title,
    hero: { en: "Job", ja: "案件詳細", img: "hero-recruit.jpg", crumbs: [["jobs/", "案件一覧"]] },
  } as const;
  const salary = formatRecruitSalary(job);

  return (
    <PageShell route={`jobs/recruit/${id}/`} meta={meta}>
      <section className="section">
        <div className="container container--narrow">
          {job.image && (
            <figure className="page-figure">
              <img src={job.image} alt="" />
            </figure>
          )}
          <p className="job-card__tags">
            <span className="tag tag--main">人材紹介</span>
            {job.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </p>
          <JobDetailView job={{ kind: "recruit", id: job.id }} />
          <h2 className="h2-line">{job.title}</h2>
          <FavoriteButton job={{ kind: "recruit", id: job.id }} initial={favorites.includes(`recruit-${job.id}`)} variant="full" />
          {job.clientName && <p className="job-card__meta">🏢 {job.clientName}</p>}
          {salary && <p className="job-card__salary">💴 {salary}</p>}
          {job.description && <p className="job-text">{job.description}</p>}

          <ApplyForm target={{ kind: "recruit", id: job.id }} applicantName={staff?.name ?? null} />
          <ul className="auth-links">
            <li>
              <Link href="/jobs/">案件一覧に戻る</Link>
            </li>
            <li>
              <Link href="/jobs/favorites/">気になる一覧を見る</Link>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
