import { prisma } from "@/lib/prisma";

// 内勤向け管理ページで使う表（next-app と共用のデータベースに置く）。
// 既存の表には一切触れない：
//   - 名前は hp_ で始める（ホームページ専用。既存の表と名前がぶつからない）
//   - 「無ければ作る」だけ（CREATE TABLE / INDEX IF NOT EXISTS）。既存の表の変更・削除はしない
//   - 既存の表への関連付け（外部キー）を持たない
// 表は、このサイトが最初に使うときに作る（next-app の migration を手で流さなくても動くように）。
// next-app 側の prisma/schema.prisma にも同じ定義（hp_admin_user / hp_inquiry）を入れておくこと
// （入れないと、next-app で prisma db push をしたときに、この表が「余計な表」として消されるおそれがある）

export const ADMIN_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS hp_admin_user (
    id SERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    name VARCHAR(100),
    password_hash TEXT NOT NULL,
    password_changed_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failed_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ(6),
    last_login_at TIMESTAMPTZ(6),
    created_by INTEGER,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS hp_inquiry (
    id SERIAL PRIMARY KEY,
    form VARCHAR(20) NOT NULL,
    company VARCHAR(200),
    name VARCHAR(200),
    kana VARCHAR(200),
    email VARCHAR(254),
    tel VARCHAR(200),
    address VARCHAR(200),
    gender VARCHAR(200),
    job VARCHAR(200),
    inquiry_type VARCHAR(200),
    message TEXT,
    ip VARCHAR(64),
    user_agent VARCHAR(500),
    handled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS hp_inquiry_created_at_idx ON hp_inquiry (created_at DESC)`,
  // 権限（2026-11-18 追加）：super＝特級（計測タグの閲覧・権限の変更ができる）、staff＝一般。この表（hp_ で始まる管理ページ専用の表）にだけ列を足す
  `ALTER TABLE hp_admin_user ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'staff'`,
  // 特級が1人もいなければ、最初の管理者（環境変数から作った人＝追加者がいない人）を特級にする
  `UPDATE hp_admin_user SET role = 'super' WHERE created_by IS NULL AND NOT EXISTS (SELECT 1 FROM hp_admin_user WHERE role = 'super')`,
];

export type AdminRole = "super" | "staff";
export const ROLE_NAMES: Record<AdminRole, string> = { super: "特級", staff: "一般" };

let ready: Promise<void> | null = null;

// 表が無ければ作る（サーバーの起動ごとに 1 回だけ）。同時に作ろうとしてぶつかった場合に備えて、1 回だけやり直す
export function ensureAdminTables(): Promise<void> {
  ready ??= (async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        for (const sql of ADMIN_TABLES_SQL) await prisma.$executeRawUnsafe(sql);
        return;
      } catch (error) {
        if (attempt >= 2) throw error;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  })().catch((error) => {
    ready = null; // 失敗したら次回また試す
    throw error;
  });
  return ready;
}

// ---------- 管理者 ----------

export type AdminRow = {
  id: number;
  email: string;
  name: string | null;
  password_hash: string;
  pwd_version: number; // パスワードを最後に変えた日時（マイクロ秒の数値。ログイン状態・ご案内リンクの照合に使う）
  failed_count: number;
  locked_until: Date | null;
  role: AdminRole;
};

export async function findAdminByEmail(email: string): Promise<AdminRow | null> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<AdminRow[]>`
    SELECT id, email, name, password_hash, (extract(epoch from password_changed_at) * 1000000)::float8 AS pwd_version, failed_count, locked_until, role
    FROM hp_admin_user WHERE lower(email) = lower(${email}) LIMIT 1`;
  return rows[0] ?? null;
}

export async function findAdminById(id: number): Promise<AdminRow | null> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<AdminRow[]>`
    SELECT id, email, name, password_hash, (extract(epoch from password_changed_at) * 1000000)::float8 AS pwd_version, failed_count, locked_until, role
    FROM hp_admin_user WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function countAdmins(): Promise<number> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_admin_user`;
  return rows[0]?.n ?? 0;
}

// 最初の管理者を作る（表が空のときだけ。メールアドレスが既にあれば何もしない）
export async function insertFirstAdmin(email: string, passwordHash: string, name: string | null): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_admin_user (email, name, password_hash, role)
    SELECT ${email}, ${name}, ${passwordHash}, 'super'
    WHERE NOT EXISTS (SELECT 1 FROM hp_admin_user)
    ON CONFLICT (email) DO NOTHING`;
}

export async function recordLoginFailure(id: number, maxFailures: number, lockMinutes: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE hp_admin_user SET
      failed_count = failed_count + 1,
      locked_until = CASE WHEN failed_count + 1 >= ${maxFailures} THEN now() + make_interval(mins => ${lockMinutes}) ELSE locked_until END
    WHERE id = ${id}`;
}

export async function recordLoginSuccess(id: number): Promise<void> {
  await prisma.$executeRaw`UPDATE hp_admin_user SET failed_count = 0, locked_until = NULL, last_login_at = now() WHERE id = ${id}`;
}

export async function updateAdminPassword(id: number, passwordHash: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ pwd_version: number }[]>`
    UPDATE hp_admin_user SET password_hash = ${passwordHash}, password_changed_at = now(), failed_count = 0, locked_until = NULL
    WHERE id = ${id} RETURNING (extract(epoch from password_changed_at) * 1000000)::float8 AS pwd_version`;
  return rows[0].pwd_version;
}

// パスワードがまだ無い（招待メールのリンクから設定する前の）管理者に入れておく値。scrypt$ で始まらないので、どのパスワードでも一致しない
export const NO_PASSWORD = "!unset";

export type AdminListRow = { id: number; email: string; name: string | null; role: AdminRole; has_password: boolean; last_login_at: Date | null; created_at: Date };

export async function listAdmins(): Promise<AdminListRow[]> {
  await ensureAdminTables();
  return prisma.$queryRaw<AdminListRow[]>`
    SELECT id, email, name, role, (password_hash <> ${NO_PASSWORD}) AS has_password, last_login_at, created_at
    FROM hp_admin_user ORDER BY id`;
}

// 管理者を追加する（パスワードは本人が招待メールのリンクから決める）。同じメールアドレスが既にいれば null
export async function insertAdmin(email: string, name: string, createdBy: number): Promise<AdminRow | null> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<AdminRow[]>`
    INSERT INTO hp_admin_user (email, name, password_hash, created_by)
    VALUES (${email}, ${name}, ${NO_PASSWORD}, ${createdBy})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, name, password_hash, (extract(epoch from password_changed_at) * 1000000)::float8 AS pwd_version, failed_count, locked_until, role`;
  return rows[0] ?? null;
}

export async function setAdminRole(id: number, role: AdminRole): Promise<boolean> {
  await ensureAdminTables();
  const n = await prisma.$executeRaw`UPDATE hp_admin_user SET role = ${role} WHERE id = ${id}`;
  return n > 0;
}

export async function deleteAdmin(id: number): Promise<boolean> {
  await ensureAdminTables();
  const n = await prisma.$executeRaw`DELETE FROM hp_admin_user WHERE id = ${id}`;
  return n > 0;
}

// ---------- 問い合わせ ----------

export type InquiryInput = {
  form: "employers" | "seekers";
  company: string | null;
  name: string | null;
  kana: string | null;
  email: string | null;
  tel: string | null;
  address: string | null;
  gender: string | null;
  job: string | null;
  inquiry_type: string | null;
  message: string | null;
  ip: string | null;
  user_agent: string | null;
};

export type InquiryRow = InquiryInput & { id: number; handled: boolean; created_at: Date };

export async function insertInquiry(i: InquiryInput): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_inquiry (form, company, name, kana, email, tel, address, gender, job, inquiry_type, message, ip, user_agent)
    VALUES (${i.form}, ${i.company}, ${i.name}, ${i.kana}, ${i.email}, ${i.tel}, ${i.address}, ${i.gender}, ${i.job}, ${i.inquiry_type}, ${i.message}, ${i.ip}, ${i.user_agent})`;
}

export async function listInquiries(limit = 300): Promise<InquiryRow[]> {
  await ensureAdminTables();
  return prisma.$queryRaw<InquiryRow[]>`
    SELECT id, form, company, name, kana, email, tel, address, gender, job, inquiry_type, message, ip, user_agent, handled, created_at
    FROM hp_inquiry ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function countUnhandledInquiries(): Promise<number> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM hp_inquiry WHERE handled = false`;
  return rows[0]?.n ?? 0;
}

export async function setInquiryHandled(id: number, handled: boolean): Promise<boolean> {
  await ensureAdminTables();
  const n = await prisma.$executeRaw`UPDATE hp_inquiry SET handled = ${handled} WHERE id = ${id}`;
  return n > 0;
}
