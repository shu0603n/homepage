import type { StaffRegisterInput, WorkHistory } from "@/lib/auth/staff";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function isAcceptablePassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= PASSWORD_MIN_LENGTH && value.length <= 256;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function date(value: unknown): string | null {
  return typeof value === "string" && DATE_PATTERN.test(value) ? value : null;
}

function parseHistories(value: unknown): WorkHistory[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((h) => {
    const row = (typeof h === "object" && h !== null ? h : {}) as Record<string, unknown>;
    return {
      company: text(row.company, 255) ?? "",
      employment_type: text(row.employment_type, 100) ?? "",
      period: text(row.period, 100) ?? "",
      job_type: text(row.job_type, 100) ?? "",
      content: text(row.content, 2000) ?? "",
    };
  });
}

export type ParsedRegistration = { ok: true; input: StaffRegisterInput; password: string } | { ok: false; message: string };

// スタッフ登録フォームの入力を検証し、DB に入れる形に整える
export function parseRegistration(body: unknown): ParsedRegistration {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const mail = normalizeEmail(b.mail);
  const name = text(b.name, 255);
  const phone = text(b.phone_number, 100);

  if (!isEmail(mail)) return { ok: false, message: "正しいメールアドレスを入力してください。" };
  if (!name) return { ok: false, message: "お名前を入力してください。" };
  if (!phone) return { ok: false, message: "電話番号を入力してください。" };
  if (!isAcceptablePassword(b.password)) return { ok: false, message: `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。` };
  if (b.consent1 !== true || b.consent2 !== true) return { ok: false, message: "個人情報の取り扱いと秘密保持への同意が必要です。" };

  const wage = Number(b.min_hourly_wage);

  return {
    ok: true,
    password: b.password,
    input: {
      mail,
      name,
      name_k: text(b.name_k, 255),
      gender: text(b.gender, 20),
      birthday: date(b.birthday),
      phone_number: phone,
      postal_code: text(b.postal_code, 20),
      prefecture: text(b.prefecture, 10),
      address: text(b.address, 500),
      referrer: text(b.referrer, 100),
      min_hourly_wage: Number.isFinite(wage) && wage > 0 ? Math.round(wage) : null,
      time_slot: text(b.time_slot, 255),
      weekly_preference: text(b.weekly_preference, 255),
      weekend_holiday: text(b.weekend_holiday, 255),
      period: text(b.period, 255),
      desired_start_date: date(b.desired_start_date),
      desired_job_type: text(b.desired_job_type, 255),
      work_histories: parseHistories(b.work_histories),
      accept_fulltime_job: b.accept_fulltime_job === true,
    },
  };
}
