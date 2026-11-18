import { ensureAdminTables } from "@/lib/admin/store";
import { findStaffById } from "@/lib/auth/staff";
import { prisma } from "@/lib/prisma";

// 案件の「気になる」と、案件ごとの反応（一覧での表示・クリック・詳細の閲覧）の記録と集計。
// 表は管理ページと同じく hp_ で始まる専用の表（lib/admin/store.ts の ensureAdminTables で「無ければ作る」）

export type JobKind = "project" | "recruit";
export type JobKey = { kind: JobKind; id: number };
export const jobKey = (k: JobKey) => `${k.kind}-${k.id}`;

export function parseJobKey(value: unknown): JobKey | null {
  const v = value as { kind?: unknown; id?: unknown } | null;
  if (!v || (v.kind !== "project" && v.kind !== "recruit") || !Number.isInteger(v.id) || (v.id as number) <= 0) return null;
  return { kind: v.kind, id: v.id as number };
}

// ---------- 気になる（スタッフ側） ----------
// スタッフ ID は削除後に別の人へ使い回されるため、メールアドレスも合わせて本人の分だけを扱う

export type Favorite = JobKey & { createdAt: Date };

export async function listFavorites(staffId: number, mail: string): Promise<Favorite[]> {
  await ensureAdminTables();
  const rows = await prisma.$queryRaw<{ job_kind: JobKind; job_id: number; created_at: Date }[]>`
    SELECT job_kind, job_id, created_at FROM hp_job_favorite
    WHERE staff_id = ${staffId} AND lower(staff_mail) = lower(${mail})
    ORDER BY created_at DESC`;
  return rows.map((r) => ({ kind: r.job_kind, id: r.job_id, createdAt: r.created_at }));
}

// ログイン中のスタッフが「気になる」に入れている案件（kind-id の一覧）。読めなくても画面は出せるよう、失敗したら空にする
export async function myFavoriteKeys(staffId: number | null): Promise<string[]> {
  if (staffId === null) return [];
  const staff = await findStaffById(staffId).catch(() => null);
  if (!staff?.mail) return [];
  return (await listFavorites(staff.id, staff.mail).catch(() => [])).map(jobKey);
}

export async function addFavorite(staffId: number, mail: string, job: JobKey): Promise<void> {
  await ensureAdminTables();
  // 同じスタッフ ID で別のメールアドレス（＝前に同じ ID を使っていた別の人）の「気になる」が残っていれば消す
  await prisma.$executeRaw`DELETE FROM hp_job_favorite WHERE staff_id = ${staffId} AND lower(staff_mail) <> lower(${mail})`;
  await prisma.$executeRaw`
    INSERT INTO hp_job_favorite (staff_id, staff_mail, job_kind, job_id) VALUES (${staffId}, ${mail}, ${job.kind}, ${job.id})
    ON CONFLICT (staff_id, job_kind, job_id) DO NOTHING`;
}

export async function removeFavorite(staffId: number, mail: string, job: JobKey): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`
    DELETE FROM hp_job_favorite WHERE staff_id = ${staffId} AND lower(staff_mail) = lower(${mail}) AND job_kind = ${job.kind} AND job_id = ${job.id}`;
}

// ---------- 反応の記録 ----------

// apply はホームページの応募ボタンから応募が完了したとき（サーバー側の応募処理から記録する。画面からは送れない）
export type JobEvent = "list" | "click" | "detail" | "apply";
const COLUMN: Record<JobEvent, string> = { list: "list_views", click: "clicks", detail: "detail_views", apply: "applications" };

// 案件ごとに、今日（日本時間）の回数を1つ増やす。まとめて1回の問い合わせで書く
export async function recordJobEvent(event: JobEvent, jobs: JobKey[]): Promise<void> {
  const unique = [...new Map(jobs.map((j) => [jobKey(j), j])).values()];
  if (unique.length === 0) return;
  await ensureAdminTables();
  const col = COLUMN[event]; // 列名は上の決まった3つだけ（外から来た文字は入らない）
  await prisma.$executeRawUnsafe(
    `INSERT INTO hp_job_stat_daily (job_kind, job_id, day, ${col})
     SELECT k, i, (now() AT TIME ZONE 'Asia/Tokyo')::date, 1 FROM unnest($1::varchar[], $2::int[]) AS t(k, i)
     ON CONFLICT (job_kind, job_id, day) DO UPDATE SET ${col} = hp_job_stat_daily.${col} + 1`,
    unique.map((j) => j.kind),
    unique.map((j) => j.id),
  );
}

// ---------- 管理ページの集計 ----------

export type JobStatRow = {
  kind: JobKind;
  id: number;
  title: string;
  posted: boolean; // いまも掲載中か
  listViews: number;
  clicks: number;
  detailViews: number;
  favorites: number; // いま「気になる」に入れている人数（期間に関係なく）
  favoritesInPeriod: number; // 期間中に「気になる」に入れた人数
  applications: number; // 期間中に、ホームページの応募ボタンから応募された数
};

export type FavoriteUser = { kind: JobKind; jobId: number; staffId: number; name: string | null; mail: string | null; tel: string | null; createdAt: Date };

// days：直近何日か（null なら全期間）
export async function jobStats(days: number | null): Promise<{ rows: JobStatRow[]; users: FavoriteUser[] }> {
  await ensureAdminTables();
  const since = days ? new Date(Date.now() - days * 86_400_000) : new Date(0);
  const sinceDay = new Date(since.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

  const [stats, favs, users] = await Promise.all([
    prisma.$queryRaw<{ job_kind: JobKind; job_id: number; list_views: number; clicks: number; detail_views: number; applications: number }[]>`
      SELECT job_kind, job_id, sum(list_views)::int AS list_views, sum(clicks)::int AS clicks, sum(detail_views)::int AS detail_views,
        sum(applications)::int AS applications
      FROM hp_job_stat_daily WHERE day >= ${sinceDay}::date GROUP BY job_kind, job_id`,
    prisma.$queryRaw<{ job_kind: JobKind; job_id: number; total: number; recent: number }[]>`
      SELECT job_kind, job_id, count(*)::int AS total, count(*) FILTER (WHERE created_at >= ${since})::int AS recent
      FROM hp_job_favorite GROUP BY job_kind, job_id`,
    // 「気になる」に入れた人（スタッフ ID が使い回された場合に別人を出さないよう、メールアドレスも一致するものだけ）
    prisma.$queryRaw<{ job_kind: JobKind; job_id: number; staff_id: number; name: string | null; mail: string | null; tel: string | null; created_at: Date }[]>`
      SELECT f.job_kind, f.job_id, f.staff_id, s.name, s.mail, s.phone_number AS tel, f.created_at
      FROM hp_job_favorite f JOIN staff s ON s.id = f.staff_id AND lower(s.mail) = lower(f.staff_mail)
      ORDER BY f.created_at DESC`,
  ]);

  const rows = new Map<string, JobStatRow>();
  const row = (kind: JobKind, id: number) => {
    const key = `${kind}-${id}`;
    let r = rows.get(key);
    if (!r) {
      r = { kind, id, title: "", posted: false, listViews: 0, clicks: 0, detailViews: 0, favorites: 0, favoritesInPeriod: 0, applications: 0 };
      rows.set(key, r);
    }
    return r;
  };
  for (const s of stats) Object.assign(row(s.job_kind, s.job_id), { listViews: s.list_views, clicks: s.clicks, detailViews: s.detail_views, applications: s.applications });
  for (const f of favs) Object.assign(row(f.job_kind, f.job_id), { favorites: f.total, favoritesInPeriod: f.recent });

  // 案件名と、いまも掲載中か
  const projectIds = [...rows.values()].filter((r) => r.kind === "project").map((r) => r.id);
  const recruitIds = [...rows.values()].filter((r) => r.kind === "recruit").map((r) => r.id);
  const now = new Date();
  const [projects, recruits] = await Promise.all([
    projectIds.length
      ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, project_title: true, hp_posting_flag: true, start_date: true, end_date: true } })
      : [],
    recruitIds.length ? prisma.recruit_project.findMany({ where: { id: { in: recruitIds } }, select: { id: true, title: true, is_recruiting: true } }) : [],
  ]);
  for (const p of projects) {
    const r = rows.get(`project-${p.id}`)!;
    r.title = p.project_title ?? `案件 #${p.id}`;
    r.posted = Boolean(p.hp_posting_flag) && (!p.start_date || p.start_date <= now) && (!p.end_date || p.end_date >= now);
  }
  for (const p of recruits) {
    const r = rows.get(`recruit-${p.id}`)!;
    r.title = p.title;
    r.posted = p.is_recruiting;
  }
  for (const r of rows.values()) if (!r.title) r.title = `${r.kind === "project" ? "案件" : "求人"} #${r.id}（削除済み）`;

  const list = [...rows.values()].sort((a, b) => b.listViews - a.listViews || b.clicks - a.clicks || b.favorites - a.favorites);
  return {
    rows: list,
    users: users.map((u) => ({ kind: u.job_kind, jobId: u.job_id, staffId: u.staff_id, name: u.name, mail: u.mail, tel: u.tel, createdAt: u.created_at })),
  };
}
