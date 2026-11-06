import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplyForm } from "@/components/jobs/ApplyForm";
import { formatSalary } from "@/components/jobs/format";
import { PageShell } from "@/components/site/PageShell";
import { getSession } from "@/lib/auth/session";
import { findStaffById } from "@/lib/auth/staff";
import { getJobDetail } from "@/lib/jobs";
import { buildMetadata } from "@/lib/metadata";


function Info({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="job-info__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { ...buildMetadata(`jobs/${id}/`, { title: "案件詳細" }), robots: { index: false, follow: false } };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login/?next=/jobs/${encodeURIComponent(id)}/`);

  const jobId = Number(id);
  const job = Number.isInteger(jobId) && jobId > 0 ? await getJobDetail(jobId) : null;
  if (!job) notFound();

  const staff = session.staffId === null ? null : await findStaffById(session.staffId).catch(() => null);
  const meta = {
    title: job.title ?? "案件詳細",
    hero: { en: "Job", ja: "案件詳細", img: "hero-staffing.jpg", crumbs: [["jobs/", "案件一覧"]] },
  } as const;
  const hours = job.startTime || job.endTime ? `${job.startTime ?? ""}〜${job.endTime ?? ""}` : null;

  return (
    <PageShell route={`jobs/${id}/`} meta={meta}>
      <section className="section">
        <div className="container container--narrow">
          {job.image && (
            <figure className="page-figure">
              <img src={job.image} alt="" />
            </figure>
          )}
          <p className="job-card__tags">
            {job.contractName && <span className="tag tag--main">{job.contractName}</span>}
            {job.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </p>
          <h2 className="h2-line">{job.title}</h2>
          {formatSalary(job) && <p className="job-card__salary">💴 {formatSalary(job)}</p>}
          {job.description && <p className="job-text">{job.description}</p>}

          <dl className="job-info">
            <Info label="勤務エリア" value={job.location} />
            <Info label="勤務地" value={[job.workPostalCode, job.workAddress].filter(Boolean).join(" ")} />
            <Info label="勤務時間" value={hours} />
            <Info label="休日" value={job.holiday} />
            <Info label="勤務曜日" value={job.workingDays.join("・")} />
            <Info label="期間" value={job.periodName} />
            <Info label="契約期間" value={job.contractPeriod} />
            <Info label="交通費" value={job.transportation} />
            <Info label="備考" value={job.remarks} />
            <Info label="お仕事の注意点" value={job.workNotes} />
            <Info label="福利厚生" value={job.welfare} />
            <Info label="職場環境" value={job.environment} />
            <Info label="服装" value={job.dressCode} />
            <Info label="求める人材" value={job.hrRequirements} />
            <Info label="研修" value={job.trainingMemo} />
            <Info label="特記事項" value={job.specialNotes} />
          </dl>

          <ApplyForm target={{ kind: "project", id: job.id }} applicantName={staff?.name ?? null} />
          <ul className="auth-links">
            <li>
              <Link href="/jobs/">案件一覧に戻る</Link>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
