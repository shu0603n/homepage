import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WorkHistory = {
  company: string;
  employment_type: string;
  period: string;
  job_type: string;
  content: string;
};

// スタッフ登録フォームの入力（next-app の staff-register と同じ項目）
export type StaffRegisterInput = {
  mail: string;
  name: string;
  name_k: string | null;
  gender: string | null;
  birthday: string | null; // yyyy-MM-dd
  phone_number: string;
  postal_code: string | null;
  prefecture: string | null;
  address: string | null;
  referrer: string | null;
  min_hourly_wage: number | null;
  time_slot: string | null;
  weekly_preference: string | null;
  weekend_holiday: string | null;
  period: string | null;
  desired_start_date: string | null; // yyyy-MM-dd
  desired_job_type: string | null;
  work_histories: WorkHistory[];
  accept_fulltime_job: boolean;
};

const STAFF_SUMMARY = { id: true, name: true, mail: true, line_user_id: true } as const;

export function findStaffByMail(mail: string) {
  return prisma.staff.findFirst({ where: { mail: { equals: mail, mode: "insensitive" } }, select: STAFF_SUMMARY });
}

export function findStaffById(id: number) {
  return prisma.staff.findUnique({ where: { id }, select: STAFF_SUMMARY });
}

export function findStaffByLineUserId(lineUserId: string) {
  return prisma.staff.findFirst({ where: { line_user_id: lineUserId }, select: STAFF_SUMMARY });
}

function historyToText(h: WorkHistory): string {
  return `【会社名】${h.company}　【雇用形態】${h.employment_type}　【就業期間】${h.period}　【職種】${h.job_type}　【業務内容】${h.content}`;
}

// スタッフを新規登録する。id は next-app と同じく「現在の最大 id + 1」（競合を避けるため直列化トランザクション）
export async function createStaff(input: StaffRegisterInput): Promise<number> {
  const histories = input.work_histories.filter((h) => h.company.trim() || h.period.trim() || h.content.trim()).map(historyToText);

  return prisma.$transaction(
    async (tx) => {
      const { _max } = await tx.staff.aggregate({ _max: { id: true } });
      const id = (_max.id ?? 0) + 1;
      await tx.staff.create({
        data: {
          id,
          name: input.name,
          name_k: input.name_k,
          mail: input.mail,
          birthday: input.birthday ? new Date(input.birthday) : null,
          gender: input.gender,
          phone_number: input.phone_number,
          postal_code: input.postal_code,
          prefecture: input.prefecture,
          address: input.address,
          registration_medium: input.referrer ? `紹介（${input.referrer}）` : "フォーム",
          registration_method: "フォーム",
          time_slot: input.time_slot,
          weekly_preference: input.weekly_preference,
          weekend_holiday: input.weekend_holiday,
          min_hourly_wage: input.min_hourly_wage,
          period: input.period,
          desired_start_date: input.desired_start_date ? new Date(input.desired_start_date) : null,
          desired_job_type: input.desired_job_type,
          accept_fulltime_job: input.accept_fulltime_job,
          work_histories: histories,
          staff_status: "新規",
          registration_date: new Date(),
        },
      });
      return id;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function deleteStaff(id: number): Promise<void> {
  await prisma.staff.delete({ where: { id } });
}
