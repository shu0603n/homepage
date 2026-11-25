import { prisma } from "@/lib/prisma";
import { ensureAdminTables, listAdmins } from "@/lib/admin/store";
import { addDays, holidayName, isWeekend, todayJst } from "@/lib/jp-holidays";
import { assignRoles, type MemberStat, type Roles } from "@/lib/morning-rotation";

// 朝礼（管理画面の「朝礼」。いまは特級の管理者だけ）。
//   ・朝礼のある日＝平日（土日・祝日・会社の休みを除く）。会社の休みはこの画面で登録する
//   ・日ごとに司会・発表者・コメントの人を決めて記録する（決め方は lib/morning-rotation.ts）。
//     ページを開いていない日があっても、今日までの朝礼のある日を順に決めて記録する（当番の流れがとぎれないように）
//   ・「今日はいない」人は外して決め直す。5人未満なら「朝礼なし」にできる（なしの日は回数に数えず、当番は次の日へ持ち越す）
//   ・発表は発表者本人だけ、コメントはコメントの人本人だけが書ける
//   ・参加する人＝管理画面のアカウントを持つ人全員（当番から外す人は、この画面で外せる）

export type MorningDay = {
  day: string;
  status: "held" | "skipped";
  mc_id: number | null;
  presenter_id: number | null;
  commenter_id: number | null;
  absent_ids: number[];
  presentation: string | null;
  presentation_at: Date | null;
  presentation_by: number | null; // 書いた人（本人か、代筆した特級の管理者）
  comment: string | null;
  comment_at: Date | null;
  comment_by: number | null;
};

export class MorningError extends Error {}

async function companyHolidays(): Promise<Map<string, string>> {
  const rows = await prisma.$queryRaw<{ day: string; name: string | null }[]>`SELECT to_char(day, 'YYYY-MM-DD') AS day, name FROM hp_morning_holiday`;
  return new Map(rows.map((r) => [r.day, r.name ?? "会社の休み"]));
}

// 朝礼のない日なら、その理由（土日・祝日の名前・会社の休み）。朝礼のある日なら null
export function offReason(day: string, company: Map<string, string>): string | null {
  if (isWeekend(day)) return "土日";
  return holidayName(day) ?? company.get(day) ?? null;
}

// 当番に入る人（管理画面のアカウントのうち、この画面で外していない人）
async function rotationMembers(): Promise<number[]> {
  const [admins, off] = await Promise.all([
    listAdmins(),
    prisma.$queryRaw<{ admin_id: number }[]>`SELECT admin_id FROM hp_morning_member WHERE active = false`,
  ]);
  const out = new Set(off.map((r) => r.admin_id));
  return admins.map((a) => a.id).filter((id) => !out.has(id));
}

const DAY_COLS = `to_char(day, 'YYYY-MM-DD') AS day, status, mc_id, presenter_id, commenter_id, absent_ids, presentation, presentation_at, presentation_by, comment, comment_at, comment_by`;
type Tx = Pick<typeof prisma, "$queryRawUnsafe" | "$executeRaw" | "$queryRaw">;
const readDays = (tx: Tx, where = "", ...params: unknown[]) =>
  tx.$queryRawUnsafe<MorningDay[]>(`SELECT ${DAY_COLS} FROM hp_morning_day ${where} ORDER BY day`, ...params);

// 回数と最後に担当した日（朝礼のあった日だけ数える。before より前）
function statsOf(days: MorningDay[], before: string): Map<number, MemberStat> {
  const m = new Map<number, MemberStat>();
  for (const d of days) {
    if (d.status !== "held" || d.day >= before) continue;
    for (const id of [d.mc_id, d.presenter_id, d.commenter_id]) {
      if (id == null) continue;
      const s = m.get(id) ?? { count: 0, last: null };
      m.set(id, { count: s.count + 1, last: s.last && s.last > d.day ? s.last : d.day });
    }
  }
  return m;
}
const prevHeld = (days: MorningDay[], before: string): Roles | null => {
  const p = [...days].reverse().find((d) => d.status === "held" && d.day < before);
  return p ? { mc: p.mc_id, presenter: p.presenter_id, commenter: p.commenter_id } : null;
};

// 今日までの朝礼のある日を、まだ記録していなければ順に決めて記録する（同時に開いても二重に決めないよう、順番待ちをする）
export async function ensureThroughToday(): Promise<void> {
  await ensureAdminTables();
  const today = todayJst();
  const [members, company] = await Promise.all([rotationMembers(), companyHolidays()]);
  await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('hp_morning'))::text`;
      const days = await readDays(tx);
      const last = days[days.length - 1]?.day ?? null;
      if (last && last >= today) return;
      // 初めて使うときは今日から。間が空いていたら、最後に記録した日の次の日から（長く空いていても、さかのぼるのは 60 日まで）
      let day = last ? addDays(last, 1) : today;
      if (day < addDays(today, -60)) day = addDays(today, -60);
      for (; day <= today; day = addDays(day, 1)) {
        if (offReason(day, company)) continue;
        const roles = assignRoles({ prev: prevHeld(days, day), members, absent: [], stats: statsOf(days, day) });
        await tx.$executeRaw`
          INSERT INTO hp_morning_day (day, status, mc_id, presenter_id, commenter_id) VALUES (${day}::date, 'held', ${roles.mc}, ${roles.presenter}, ${roles.commenter})
          ON CONFLICT (day) DO NOTHING`;
        days.push({ day, status: "held", mc_id: roles.mc, presenter_id: roles.presenter, commenter_id: roles.commenter, absent_ids: [], presentation: null, presentation_at: null, presentation_by: null, comment: null, comment_at: null, comment_by: null });
      }
    },
    { timeout: 30_000, maxWait: 15_000 },
  );
}

// 今日の「いない人」・「朝礼なし」を変えて、当番を決め直す（今日だけ。発表かコメントが書かれたあとは変えられない）
export async function updateToday(change: { absent?: { adminId: number; absent: boolean }; skip?: boolean }): Promise<void> {
  await ensureThroughToday();
  const today = todayJst();
  const members = await rotationMembers();
  await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('hp_morning'))::text`;
      const days = await readDays(tx);
      const cur = days.find((d) => d.day === today);
      if (!cur) throw new MorningError("今日は朝礼のない日です。");
      if (cur.presentation || cur.comment) throw new MorningError("発表かコメントがもう書かれているため、今日の当番は変えられません。");
      let absent = cur.absent_ids ?? [];
      if (change.absent) absent = change.absent.absent ? [...new Set([...absent, change.absent.adminId])] : absent.filter((x) => x !== change.absent!.adminId);
      const status = change.skip === undefined ? cur.status : change.skip ? "skipped" : "held";
      const roles = assignRoles({ prev: prevHeld(days, today), members, absent, stats: statsOf(days, today) });
      await tx.$executeRaw`
        UPDATE hp_morning_day SET status = ${status}, absent_ids = ${absent}::int[], mc_id = ${roles.mc}, presenter_id = ${roles.presenter},
          commenter_id = ${roles.commenter}, updated_at = now()
        WHERE day = ${today}::date`;
    },
    { timeout: 30_000, maxWait: 15_000 },
  );
}

// 管理画面のアカウントの人か（過去の日は、いまは当番から外している人も選べる）
async function assertAdmins(ids: number[]): Promise<void> {
  const admins = new Set((await listAdmins()).map((a) => a.id));
  if (ids.some((id) => !admins.has(id))) throw new MorningError("管理画面のアカウントにない人が選ばれています。");
}

// 当番を手で決める（特級の管理者。今日か過去の朝礼のある日）。実際の朝礼の当番に合わせるときや、過去の日を登録するときに使う。
// 記録のない過去の日は、ここで新しく登録する。今日を変えたら、次の朝礼の日からはこの当番から順に回る。
// 発表・コメントがもう書かれていたら、その文は新しい担当の人のものになる
export async function assignDay(day: string, roles: { mc: number; presenter: number; commenter: number }): Promise<void> {
  await ensureThroughToday();
  const today = todayJst();
  if (day > today) throw new MorningError("これからの日の当番は決められません。");
  if (offReason(day, await companyHolidays())) throw new MorningError("この日は朝礼のない日（土日・祝日・会社の休み）です。");
  const ids = [roles.mc, roles.presenter, roles.commenter];
  if (new Set(ids).size !== 3) throw new MorningError("司会・発表・コメントは、別々の人にしてください。");
  await assertAdmins(ids);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('hp_morning'))::text`;
    await tx.$executeRaw`
      INSERT INTO hp_morning_day (day, status, mc_id, presenter_id, commenter_id) VALUES (${day}::date, 'held', ${roles.mc}, ${roles.presenter}, ${roles.commenter})
      ON CONFLICT (day) DO UPDATE SET status = 'held', mc_id = EXCLUDED.mc_id, presenter_id = EXCLUDED.presenter_id, commenter_id = EXCLUDED.commenter_id,
        absent_ids = (SELECT COALESCE(array_agg(a), '{}') FROM unnest(hp_morning_day.absent_ids) a WHERE a <> ALL(${ids}::int[])), updated_at = now()`;
  });
}

// 過去の日を「朝礼なし」にする・戻す（特級の管理者。今日は「今日の朝礼」の欄で変える）。発表・コメントが書かれた日はなしにできない
export async function setPastSkipped(day: string, skip: boolean): Promise<void> {
  await ensureAdminTables();
  if (day >= todayJst()) throw new MorningError("今日の朝礼なしは、「今日の朝礼」の欄で変えてください。");
  const [d] = await readDays(prisma, "WHERE day = $1::date", day);
  if (!d) {
    // 記録のない過去の日は、当番を決めずに「朝礼なし」として登録する
    if (!skip) throw new MorningError("この日は朝礼の記録がありません。");
    if (offReason(day, await companyHolidays())) throw new MorningError("この日は朝礼のない日（土日・祝日・会社の休み）です。");
    await prisma.$executeRaw`INSERT INTO hp_morning_day (day, status) VALUES (${day}::date, 'skipped') ON CONFLICT (day) DO NOTHING`;
    return;
  }
  // 当番を決めずに朝礼なしで登録した日を戻すときは、記録のない日に戻す（当番を選んで登録し直せる）
  if (!skip && d.mc_id === null && d.presenter_id === null && d.commenter_id === null) {
    await prisma.$executeRaw`DELETE FROM hp_morning_day WHERE day = ${day}::date AND status = 'skipped'`;
    return;
  }
  if (skip && (d.presentation || d.comment)) throw new MorningError("発表かコメントが書かれているため、朝礼なしにはできません（先に削除してください）。");
  await prisma.$executeRaw`UPDATE hp_morning_day SET status = ${skip ? "skipped" : "held"}, updated_at = now() WHERE day = ${day}::date`;
}

// 発表・コメントを書く（その日の発表者・コメントの人本人だけ。空にすると消す）。過去の日も含め、担当の本人と、その文を書いた人（代筆した人）は書き直せる。
// 特級の管理者は代筆できる：as に担当の人を選ぶと、その人がその日の担当として保存される。*_by には実際に書いた人を残す（画面には出さない。書き直せる人の判定に使う）
export async function writeEntry(day: string, kind: "presentation" | "comment", text: string, adminId: number, as: number | null = null): Promise<void> {
  await ensureAdminTables();
  const [d] = await readDays(prisma, "WHERE day = $1::date", day);
  if (!d || d.status !== "held") throw new MorningError("この日は朝礼の記録がありません。");
  let owner = kind === "presentation" ? d.presenter_id : d.commenter_id;
  const writer = kind === "presentation" ? (d.presentation ? d.presentation_by : null) : d.comment ? d.comment_by : null;
  if (as !== null) {
    await assertAdmins([as]);
    const others: [number | null, string][] = kind === "presentation" ? [[d.mc_id, "司会"], [d.commenter_id, "コメント"]] : [[d.mc_id, "司会"], [d.presenter_id, "発表"]];
    const clash = others.find(([id]) => id === as);
    if (clash) throw new MorningError(`選んだ人は、この日の${clash[1]}の担当です。先に当番を変えてください。`);
    owner = as;
  } else if (owner !== adminId && writer !== adminId) throw new MorningError(kind === "presentation" ? "発表は、この日の発表者本人（と書いた人）だけが書けます。" : "コメントは、この日のコメントの人本人（と書いた人）だけが書けます。");
  const value = text.trim() ? text.trim().slice(0, 5000) : null;
  const by = value ? adminId : null;
  if (kind === "presentation") await prisma.$executeRaw`UPDATE hp_morning_day SET presenter_id = ${owner}, presentation = ${value}, presentation_at = ${value ? new Date() : null}, presentation_by = ${by}, updated_at = now() WHERE day = ${day}::date`;
  else await prisma.$executeRaw`UPDATE hp_morning_day SET commenter_id = ${owner}, comment = ${value}, comment_at = ${value ? new Date() : null}, comment_by = ${by}, updated_at = now() WHERE day = ${day}::date`;
}

// 発表・コメントを消す（特級の管理者）。その日の当番は、両方とも消えればまた変えられる
export async function eraseEntry(day: string, kind: "presentation" | "comment"): Promise<void> {
  await ensureAdminTables();
  if (kind === "presentation") await prisma.$executeRaw`UPDATE hp_morning_day SET presentation = NULL, presentation_at = NULL, presentation_by = NULL, updated_at = now() WHERE day = ${day}::date`;
  else await prisma.$executeRaw`UPDATE hp_morning_day SET comment = NULL, comment_at = NULL, comment_by = NULL, updated_at = now() WHERE day = ${day}::date`;
}

// 当番に入れる・外す
export async function setMemberActive(adminId: number, active: boolean): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_morning_member (admin_id, active) VALUES (${adminId}, ${active})
    ON CONFLICT (admin_id) DO UPDATE SET active = EXCLUDED.active, updated_at = now()`;
}

// 会社の休みを足す・消す。足した日がもう記録されていて、まだ何も書かれていなければ、その日の記録を消す
export async function addCompanyHoliday(day: string, name: string | null, adminId: number): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`
    INSERT INTO hp_morning_holiday (day, name, created_by) VALUES (${day}::date, ${name}, ${adminId})
    ON CONFLICT (day) DO UPDATE SET name = EXCLUDED.name`;
  await prisma.$executeRaw`DELETE FROM hp_morning_day WHERE day = ${day}::date AND presentation IS NULL AND comment IS NULL`;
}
export async function removeCompanyHoliday(day: string): Promise<void> {
  await ensureAdminTables();
  await prisma.$executeRaw`DELETE FROM hp_morning_holiday WHERE day = ${day}::date`;
}

// ---------- 画面に出すもの ----------

export type MorningMember = { id: number; name: string; avatar: number | null; active: boolean; mc: number; presenter: number; commenter: number; total: number; last: string | null };
export type MorningSpot = { day: string; off: string | null; record: MorningDay | null };

export async function morningView(month: string) {
  await ensureThroughToday();
  const today = todayJst();
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const [admins, offRows, days, company, holidays] = await Promise.all([
    listAdmins(),
    prisma.$queryRaw<{ admin_id: number; active: boolean }[]>`SELECT admin_id, active FROM hp_morning_member`,
    readDays(prisma),
    companyHolidays(),
    prisma.$queryRaw<{ day: string; name: string | null }[]>`SELECT to_char(day, 'YYYY-MM-DD') AS day, name FROM hp_morning_holiday WHERE day >= ${today}::date - 31 ORDER BY day`,
  ]);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const spots: MorningSpot[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const day = `${month}-${String(d).padStart(2, "0")}`;
    const off = offReason(day, company);
    if (off && !byDay.has(day)) {
      if (off !== "土日") spots.push({ day, off, record: null }); // 祝日・会社の休みは「お休み」として出す（土日は出さない）
      continue;
    }
    spots.push({ day, off: null, record: byDay.get(day) ?? null });
  }
  const active = new Map(offRows.map((r) => [r.admin_id, r.active]));
  const members: MorningMember[] = admins.map((a) => {
    const held = days.filter((d) => d.status === "held");
    const c = (k: "mc_id" | "presenter_id" | "commenter_id") => held.filter((d) => d[k] === a.id).length;
    const mine = held.filter((d) => d.mc_id === a.id || d.presenter_id === a.id || d.commenter_id === a.id);
    return {
      id: a.id,
      name: a.name ?? a.email,
      avatar: a.avatar_version,
      active: active.get(a.id) ?? true,
      mc: c("mc_id"),
      presenter: c("presenter_id"),
      commenter: c("commenter_id"),
      total: mine.length,
      last: mine.length ? mine[mine.length - 1].day : null,
    };
  });
  // 次の朝礼（見込み）：今日のあとの最初の朝礼のある日。今日の当番から決める（まだ記録はしない）
  let next = addDays(today, 1);
  for (let i = 0; i < 30 && offReason(next, company); i++) next = addDays(next, 1);
  const memberIds = members.filter((x) => x.active).map((x) => x.id);
  const nextRoles = assignRoles({ prev: prevHeld(days, next), members: memberIds, absent: [], stats: statsOf(days, next) });
  return { today, month, first, spots, members, todayRecord: byDay.get(today) ?? null, todayOff: offReason(today, company), next: { day: next, roles: nextRoles }, holidays };
}
