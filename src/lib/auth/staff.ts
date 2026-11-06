import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProfileInput } from "@/lib/auth/validation";

export type WorkHistory = {
  company: string;
  employment_type: string;
  period: string;
  job_type: string;
  content: string;
  // 旧形式で保存されていた職歴の原文。編集されなければ、この原文のまま保存し直す（形式を変えて内容を壊さないため）
  raw?: string;
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

const STAFF_SUMMARY = { id: true, name: true, mail: true, line_user_id: true, staff_status: true } as const;

// ステータスが NG / BL のスタッフはログインさせない
export function isLoginBlocked(staff: { staff_status: string | null } | null): boolean {
  const status = staff?.staff_status?.trim().toUpperCase();
  return status === "NG" || status === "BL";
}

export function findStaffByMail(mail: string) {
  // 同じメールのスタッフが複数いる場合は、いちばん新しい登録（id が大きい方）をログインに紐づける
  return prisma.staff.findFirst({ where: { mail: { equals: mail, mode: "insensitive" } }, select: STAFF_SUMMARY, orderBy: { id: "desc" } });
}

export function findStaffById(id: number) {
  return prisma.staff.findUnique({ where: { id }, select: STAFF_SUMMARY });
}

export function findStaffByLineUserId(lineUserId: string) {
  return prisma.staff.findFirst({ where: { line_user_id: lineUserId }, select: STAFF_SUMMARY });
}

function historyToText(h: WorkHistory): string {
  const untouched = h.raw !== undefined && !h.company && !h.employment_type && !h.period && !h.job_type && h.content === h.raw;
  if (untouched) return h.raw as string;
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

// 登録解除。データは消さず、ステータスだけ「配信停止」にする
export async function unsubscribeStaff(id: number): Promise<void> {
  await prisma.staff.update({ where: { id }, data: { staff_status: "配信停止", updated_at: new Date() } });
}

// 配信停止中のスタッフがログインしたら、ステータスを「新規」に戻す（それ以外のステータスは触らない）
export async function reactivateIfUnsubscribed(id: number): Promise<void> {
  await prisma.staff.updateMany({ where: { id, staff_status: "配信停止" }, data: { staff_status: "新規", updated_at: new Date() } });
}

// ---------- マイページでの登録情報の編集 ----------

const PROFILE_SELECT = {
  id: true,
  name: true,
  name_k: true,
  mail: true,
  gender: true,
  birthday: true,
  phone_number: true,
  postal_code: true,
  prefecture: true,
  address: true,
  min_hourly_wage: true,
  time_slot: true,
  weekly_preference: true,
  weekend_holiday: true,
  period: true,
  desired_start_date: true,
  desired_job_type: true,
  accept_fulltime_job: true,
  work_histories: true,
} as const;

export type StaffProfile = {
  mail: string | null;
  name: string;
  name_k: string;
  gender: string;
  birthday: string; // yyyy-MM-dd または ""
  phone_number: string;
  postal_code: string;
  prefecture: string;
  address: string;
  min_hourly_wage: string;
  time_slot: string;
  weekly_preference: string;
  weekend_days: string[];
  period: string;
  desired_start_date: string;
  desired_job_type: string;
  accept_fulltime_job: boolean;
  work_histories: WorkHistory[];
};

const HISTORY_PATTERN = /^【会社名】([\s\S]*?)　【雇用形態】([\s\S]*?)　【就業期間】([\s\S]*?)　【職種】([\s\S]*?)　【業務内容】([\s\S]*)$/;

// 保存されている文字列から職歴の各項目を取り出す。形式が違う古いデータは「業務内容」にそのまま入れて失われないようにする
function textToHistory(value: string): WorkHistory {
  const m = HISTORY_PATTERN.exec(value);
  if (!m) return { company: "", employment_type: "", period: "", job_type: "", content: value, raw: value };
  return { company: m[1], employment_type: m[2], period: m[3], job_type: m[4], content: m[5] };
}

const dateText = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function getStaffProfile(id: number): Promise<StaffProfile | null> {
  const s = await prisma.staff.findUnique({ where: { id }, select: PROFILE_SELECT });
  if (!s) return null;
  return {
    mail: s.mail,
    name: s.name ?? "",
    name_k: s.name_k ?? "",
    gender: s.gender ?? "",
    birthday: dateText(s.birthday),
    phone_number: s.phone_number ?? "",
    postal_code: s.postal_code ?? "",
    prefecture: s.prefecture ?? "",
    address: s.address ?? "",
    min_hourly_wage: s.min_hourly_wage ? String(s.min_hourly_wage) : "",
    time_slot: s.time_slot ?? "",
    weekly_preference: s.weekly_preference ?? "",
    weekend_days: (s.weekend_holiday ?? "").split(",").filter(Boolean),
    period: s.period ?? "",
    desired_start_date: dateText(s.desired_start_date),
    desired_job_type: s.desired_job_type ?? "",
    accept_fulltime_job: s.accept_fulltime_job ?? false,
    work_histories: s.work_histories.map(textToHistory),
  };
}

// 登録情報を更新する。メールアドレス（ログイン ID）・ステータス・登録経路などは変更しない
export async function updateStaffProfile(id: number, input: ProfileInput): Promise<void> {
  const histories = input.work_histories.filter((h) => h.company.trim() || h.period.trim() || h.content.trim()).map(historyToText);
  await prisma.staff.update({
    where: { id },
    data: {
      name: input.name,
      name_k: input.name_k,
      birthday: input.birthday ? new Date(input.birthday) : null,
      gender: input.gender,
      phone_number: input.phone_number,
      postal_code: input.postal_code,
      prefecture: input.prefecture,
      address: input.address,
      time_slot: input.time_slot,
      weekly_preference: input.weekly_preference,
      weekend_holiday: input.weekend_holiday,
      min_hourly_wage: input.min_hourly_wage,
      period: input.period,
      desired_start_date: input.desired_start_date ? new Date(input.desired_start_date) : null,
      desired_job_type: input.desired_job_type,
      accept_fulltime_job: input.accept_fulltime_job,
      work_histories: histories,
      updated_at: new Date(),
    },
  });
}

// メールアドレスを変更する（確認コードによる本人確認のあとに呼ぶ）
export async function updateStaffMail(id: number, mail: string): Promise<void> {
  await prisma.staff.update({ where: { id }, data: { mail, updated_at: new Date() } });
}
