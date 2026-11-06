import { prisma } from "@/lib/prisma";

// 案件一覧・詳細のデータ取得（next-app の project/select・project/detail・recruit-project/select と同じ条件）

const HP_DEPARTMENT_ID = 1;

export type JobStatus = "募集中" | "終了間近";

export type JobCard = {
  kind: "project";
  id: number;
  title: string | null;
  location: string | null; // fertilizer_type（勤務エリア）
  description: string | null;
  tags: string[];
  salary: number | null;
  contractId: number | null;
  contractName: string | null;
  periodName: string | null;
  transportation: string | null;
  image: string | null;
  status: JobStatus;
  isNew: boolean;
  priority: boolean;
};

export type RecruitCard = {
  kind: "recruit";
  id: number;
  title: string;
  description: string | null;
  tags: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  image: string | null;
  clientName: string | null;
  priority: boolean;
};

export type JobsData = { jobs: JobCard[]; recruits: RecruitCard[]; periods: string[] };

const DAY = 24 * 60 * 60 * 1000;

// 掲載中の案件だけを返す（終了済み・掲載待ち・非掲載は除く）
function postingStatus(startDate: Date | null, endDate: Date | null, now: Date): JobStatus | null {
  if (endDate && now > endDate) return null;
  if (startDate && now < startDate) return null;
  if (endDate && now.getTime() > endDate.getTime() - 7 * DAY) return "終了間近";
  return "募集中";
}

function isWithinOneWeekAhead(startDate: Date | null, now: Date): boolean {
  if (!startDate) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  return start >= today && start <= today + 7 * DAY;
}

// 職種別給与テーブルから時給を計算する（案件に job_type_salary が紐づく場合）
function salaryFromTable(t: { min_hourly_wage: number | null; regional_adjustment_index: { toString(): string }; retirement_rate: { toString(): string }; commuting_allowance: number }): number {
  const region = Number(t.regional_adjustment_index.toString());
  const retirement = Number(t.retirement_rate.toString());
  return Math.ceil(Math.ceil((t.min_hourly_wage ?? 0) * region) * retirement) + t.commuting_allowance;
}

export async function getJobsData(): Promise<JobsData> {
  const now = new Date();
  const [projects, recruits, periods] = await Promise.all([
    prisma.project.findMany({
      where: { hp_posting_flag: true, client: { is: { department_id: HP_DEPARTMENT_ID } } },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        priority_flag: true,
        project_title: true,
        description: true,
        fertilizer_type: true,
        tags: true,
        payment_price: true,
        avatar: true,
        contract: { select: { id: true, name: true } },
        period: { select: { name: true } },
        transportation: { select: { name: true } },
        job_type_salary: { select: { min_hourly_wage: true, regional_adjustment_index: true, retirement_rate: true, commuting_allowance: true } },
      },
      orderBy: { id: "desc" },
    }),
    prisma.recruit_project.findMany({
      where: { is_recruiting: true },
      select: {
        id: true,
        title: true,
        tags: true,
        description: true,
        salary_min: true,
        salary_max: true,
        image: true,
        client_name: true,
        priority_flag: true,
      },
      orderBy: { id: "desc" },
    }),
    prisma.period.findMany({ select: { name: true }, orderBy: { id: "asc" } }),
  ]);

  const jobs: JobCard[] = [];
  for (const p of projects) {
    const status = postingStatus(p.start_date, p.end_date, now);
    if (!status) continue;
    jobs.push({
      kind: "project",
      id: p.id,
      title: p.project_title,
      location: p.fertilizer_type,
      description: p.description,
      tags: p.tags,
      salary: p.job_type_salary ? salaryFromTable(p.job_type_salary) : p.payment_price,
      contractId: p.contract?.id ?? null,
      contractName: p.contract?.name?.trim() ?? null,
      periodName: p.period?.name ?? null,
      transportation: p.transportation?.name ?? null,
      image: p.avatar,
      status,
      isNew: isWithinOneWeekAhead(p.start_date, now),
      priority: p.priority_flag,
    });
  }

  return {
    jobs,
    recruits: recruits.map((r) => ({
      kind: "recruit",
      id: r.id,
      title: r.title,
      description: r.description,
      tags: r.tags,
      salaryMin: r.salary_min,
      salaryMax: r.salary_max,
      image: r.image,
      clientName: r.client_name,
      priority: r.priority_flag,
    })),
    periods: periods.map((p) => p.name),
  };
}

export type JobDetail = JobCard & {
  workPostalCode: string | null;
  workAddress: string | null;
  startTime: string | null;
  endTime: string | null;
  holiday: string | null;
  workingDays: string[];
  contractPeriod: string | null;
  remarks: string | null;
  workNotes: string | null;
  welfare: string | null;
  environment: string | null;
  dressCode: string | null;
  hrRequirements: string | null;
  specialNotes: string | null;
  trainingMemo: string | null;
  isMonthly: boolean;
};

const MONTHLY_CONTRACT_ID = 11; // 月給の契約種別（next-app と同じ判定）

function text(value: string | null): string | null {
  return value && value.trim() ? value : null;
}

export async function getJobDetail(id: number): Promise<JobDetail | null> {
  const now = new Date();
  const p = await prisma.project.findFirst({
    where: { id, hp_posting_flag: true, client: { is: { department_id: HP_DEPARTMENT_ID } } },
    select: {
      id: true,
      start_date: true,
      end_date: true,
      priority_flag: true,
      project_title: true,
      description: true,
      fertilizer_type: true,
      tags: true,
      payment_price: true,
      avatar: true,
      contract: { select: { id: true, name: true } },
      period: { select: { name: true } },
      transportation: { select: { name: true } },
      job_type_salary: { select: { min_hourly_wage: true, regional_adjustment_index: true, retirement_rate: true, commuting_allowance: true } },
      working_postal_code: true,
      working_address: true,
      working_address2: true,
      working_start_time: true,
      working_end_time: true,
      holiday: true,
      working_days: true,
      contract_period: true,
      remarks: true,
      work_notes: true,
      welfare_programs: true,
      work_environment_description: true,
      dress_code: true,
      hr_requirements: true,
      special_notes: true,
      training_memo: true,
    },
  });
  if (!p) return null;
  const status = postingStatus(p.start_date, p.end_date, now);
  if (!status) return null;

  const address = [p.working_address, p.working_address2].filter(Boolean).join(" ");
  return {
    kind: "project",
    id: p.id,
    title: p.project_title,
    location: p.fertilizer_type,
    description: p.description,
    tags: p.tags,
    salary: p.job_type_salary ? salaryFromTable(p.job_type_salary) : p.payment_price,
    contractId: p.contract?.id ?? null,
    contractName: p.contract?.name?.trim() ?? null,
    periodName: p.period?.name ?? null,
    transportation: p.transportation?.name ?? null,
    image: p.avatar,
    status,
    isNew: isWithinOneWeekAhead(p.start_date, now),
    priority: p.priority_flag,
    workPostalCode: p.working_postal_code,
    workAddress: address || null,
    startTime: p.working_start_time,
    endTime: p.working_end_time,
    holiday: text(p.holiday),
    workingDays: p.working_days,
    contractPeriod: p.contract_period,
    remarks: text(p.remarks),
    workNotes: text(p.work_notes),
    welfare: text(p.welfare_programs),
    environment: text(p.work_environment_description),
    dressCode: text(p.dress_code),
    hrRequirements: text(p.hr_requirements),
    specialNotes: text(p.special_notes),
    trainingMemo: text(p.training_memo),
    isMonthly: p.contract?.id === MONTHLY_CONTRACT_ID,
  };
}

export async function getRecruitDetail(id: number): Promise<RecruitCard | null> {
  const r = await prisma.recruit_project.findFirst({
    where: { id, is_recruiting: true },
    select: { id: true, title: true, tags: true, description: true, salary_min: true, salary_max: true, image: true, client_name: true, priority_flag: true },
  });
  if (!r) return null;
  return {
    kind: "recruit",
    id: r.id,
    title: r.title,
    description: r.description,
    tags: r.tags,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    image: r.image,
    clientName: r.client_name,
    priority: r.priority_flag,
  };
}
