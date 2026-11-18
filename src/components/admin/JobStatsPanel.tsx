import Link from 'next/link';
import { JobStatsTable } from '@/components/admin/JobStatsTable';
import { jobStats, type JobStatRow } from '@/lib/jobs-activity';

// 管理ページ「案件の反応」：ホームページの案件一覧で、どの案件がどれだけ見られ、押され、「気になる」に入れられ、応募されたか

const PERIODS = [
  ['7', '7日間'],
  ['30', '30日間'],
  ['90', '90日間'],
  ['all', '全期間']
] as const;

const fmt = (n: number) => n.toLocaleString('ja-JP');
const dateTime = (d: Date) =>
  new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    d
  );

function Kpi({ icon, label, value, unit, help }: { icon: string; label: string; value: string; unit?: string; help: string }) {
  return (
    <div className="adm-kpi">
      <div className="adm-kpi__top">
        <span className="adm-kpi__icon" aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
        <p className="adm-kpi__label">{label}</p>
      </div>
      <p className="adm-kpi__value">
        {value}
        {unit && <small>{unit}</small>}
      </p>
      <p className="adm-kpi__help">{help}</p>
    </div>
  );
}

export async function JobStatsPanel({ days: daysParam }: { days?: string }) {
  const key = PERIODS.some(([k]) => k === daysParam) ? (daysParam as (typeof PERIODS)[number][0]) : '30';
  const days = key === 'all' ? null : Number(key);
  let data: Awaited<ReturnType<typeof jobStats>>;
  try {
    data = await jobStats(days);
  } catch (error) {
    console.error('job stats failed:', error);
    return (
      <div className="adm-alert is-ng">
        <i className="bi bi-exclamation-octagon" aria-hidden="true" />
        <span>集計を読み込めませんでした。時間をおいて開き直してください。</span>
      </div>
    );
  }
  const { rows, users } = data;
  const sum = (f: (r: JobStatRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const total = {
    list: sum((r) => r.listViews),
    clicks: sum((r) => r.clicks),
    detail: sum((r) => r.detailViews),
    fav: sum((r) => r.favorites),
    favNew: sum((r) => r.favoritesInPeriod),
    apps: sum((r) => r.applications)
  };
  const periodLabel = PERIODS.find(([k]) => k === key)![1];
  const usersOf = (r: JobStatRow) => users.filter((u) => u.kind === r.kind && u.jobId === r.id);

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <nav className="adm-filters" aria-label="期間">
          {PERIODS.map(([k, label]) => (
            <Link key={k} href={`/admin/?tab=jobs&days=${k}`} className={`adm-filter${key === k ? ' is-active' : ''}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="adm-summary">
        <p className="adm-summary__period">
          <i className="bi bi-calendar3" aria-hidden="true" />
          {key === 'all' ? '記録を始めてからの合計' : `直近${periodLabel}`}
        </p>
        <p className="adm-summary__text">
          ホームページの案件一覧で、案件が<strong>{fmt(total.list)}回</strong>表示され、<strong>{fmt(total.clicks)}回</strong>
          押されて詳細が見られました。 「気になる」には<strong>{fmt(total.favNew)}件</strong>入れられ、ホームページからの応募は
          <strong>{fmt(total.apps)}件</strong>でした。
        </p>
        <p className="adm-summary__update">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>
            数えているもの：すべてホームページ上の動きだけです（社内システムなど、ほかの経路での閲覧・応募は含みません）。スタッフが見たり押したりするたびに、すぐ数に加わります（同じ画面を開いている間は、案件ごとに1回だけ数えます）。記録は2026年11月19日から始めています。
          </span>
        </p>
      </section>

      <div className="adm-kpis">
        <Kpi
          icon="bi-list-ul"
          label="一覧での表示"
          value={fmt(total.list)}
          unit="回"
          help="ホームページの案件一覧の画面に、案件が表示された回数です。"
        />
        <Kpi
          icon="bi-hand-index"
          label="クリック"
          value={fmt(total.clicks)}
          unit="回"
          help="ホームページの案件一覧で、案件が押された回数です。表示のうち押された割合が「クリック率」です。"
        />
        <Kpi
          icon="bi-eye"
          label="詳細の閲覧"
          value={fmt(total.detail)}
          unit="回"
          help="ホームページの案件の詳細ページが開かれた回数です（一覧から以外も含みます）。"
        />
        <Kpi
          icon="bi-heart"
          label="気になる（いま）"
          value={fmt(total.fav)}
          unit="件"
          help="いま「気になる」に入っている数です（期間に関係なく、外されたものは除きます）。"
        />
        <Kpi
          icon="bi-send-check"
          label="ホームページからの応募"
          value={fmt(total.apps)}
          unit="件"
          help="ホームページの応募ボタンから応募された数です（社内システムなど、ほかの経路からの応募は含みません）。"
        />
      </div>

      <section className="adm-card adm-card--wide">
        <p className="adm-card__en">By Job</p>
        <h2 className="adm-card__title">
          案件ごとの反応<small>{rows.length}件</small>
        </h2>
        <p className="adm-card__help">
          「気になる」の人数を押すと、その行の下に、入れた人のお名前・連絡先の一覧が開きます。案件名を押すと、ホームページの案件ページが新しいタブで開きます。
        </p>
        {rows.length === 0 ? (
          <p className="adm-empty">まだ記録がありません。スタッフが案件一覧を見ると、ここに集まります。</p>
        ) : (
          <JobStatsTable
            rows={rows.map((r) => ({
              key: `${r.kind}-${r.id}`,
              kind: r.kind,
              title: r.title,
              href: r.posted ? (r.kind === 'project' ? `/jobs/${r.id}/` : `/jobs/recruit/${r.id}/`) : null,
              listViews: r.listViews,
              clicks: r.clicks,
              detailViews: r.detailViews,
              favorites: r.favorites,
              applications: r.applications,
              users: usersOf(r).map((u) => ({
                key: `${u.staffId}-${u.createdAt.getTime()}`,
                name: u.name,
                tel: u.tel,
                mail: u.mail,
                addedAt: dateTime(u.createdAt)
              }))
            }))}
          />
        )}
      </section>
    </div>
  );
}
