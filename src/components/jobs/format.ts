import type { JobCard, RecruitCard } from "@/lib/jobs";

const MONTHLY_CONTRACT_ID = 11;

export function formatSalary(job: Pick<JobCard, "salary" | "contractId">): string | null {
  if (!job.salary) return null;
  const amount = job.salary.toLocaleString("ja-JP");
  return job.contractId === MONTHLY_CONTRACT_ID ? `月給 ${amount} 円〜` : `時給 ${amount} 円`;
}

// 人材紹介の案件は月給（next-app の RecruitProjectCard と同じ表記）
export function formatRecruitSalary(r: Pick<RecruitCard, "salaryMin" | "salaryMax">): string | null {
  const { salaryMin: min, salaryMax: max } = r;
  const fmt = (n: number) => n.toLocaleString("ja-JP");
  if (min != null && max != null) return `月給 ${fmt(min)}円 〜 ${fmt(max)}円`;
  if (min != null) return `月給 ${fmt(min)}円 〜`;
  if (max != null) return `月給 〜 ${fmt(max)}円`;
  return null;
}
