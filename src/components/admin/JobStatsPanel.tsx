import Link from 'next/link';
import { jobStats, type FavoriteUser, type JobStatRow } from '@/lib/jobs-activity';

// 管理ページ「案件の反応」：ホームページの案件一覧で、どの案件がどれだけ見られ、押され、「気になる」に入れられ、応募されたか

const PERIODS = [
  ['7', '7日間'],
  ['30', '30日間'],
  ['90', '90日間'],
  ['all', '全期間']
] as const;

const fmt = (n: number) => n.toLocaleString('ja-JP');
const rate = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');
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

// 「気になる」に入れた人の一覧（押すと開く）
function FavoriteUsers({ count, users }: { count: number; users: FavoriteUser[] }) {
  if (count === 0) return <span className="adm-jobs__zero">0</span>;
  return (
    <details className="adm-favusers">
      <summary>
        <i className="bi bi-heart-fill" aria-hidden="true" />
        {fmt(count)}人
      </summary>
      <ul>
        {users.map((u) => (
          <li key={`${u.staffId}-${u.createdAt.getTime()}`}>
            <strong>{u.name ?? '（お名前未登録）'}</strong>
            <span>
              {u.tel && <a href={`tel:${u.tel.replace(/[^\d+]/g, '')}`}>{u.tel}</a>}
              {u.mail && <a href={`mailto:${u.mail}`}>{u.mail}</a>}
            </span>
            <small>{dateTime(u.createdAt)} に追加</small>
          </li>
        ))}
        {users.length < count && <li className="adm-favusers__more">ほか {count - users.length} 人（スタッフ情報が削除・変更された方）</li>}
      </ul>
    </details>
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
          案件が一覧に<strong>{fmt(total.list)}回</strong>表示され、<strong>{fmt(total.clicks)}回</strong>押されて詳細が見られました。
          「気になる」には<strong>{fmt(total.favNew)}件</strong>入れられ、応募は<strong>{fmt(total.apps)}件</strong>でした。
        </p>
        <p className="adm-summary__update">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>
            更新のタイミング：スタッフが案件一覧を見たり押したりするたびに、すぐ数に加わります（同じ画面を開いている間は、案件ごとに1回だけ数えます）。記録は2026年11月19日から始めています。
          </span>
        </p>
      </section>

      <div className="adm-kpis">
        <Kpi icon="bi-list-ul" label="一覧での表示" value={fmt(total.list)} unit="回" help="案件一覧の画面に、案件が表示された回数です。" />
        <Kpi
          icon="bi-hand-index"
          label="クリック"
          value={fmt(total.clicks)}
          unit="回"
          help="一覧で案件が押された回数です。表示のうち押された割合が「クリック率」です。"
        />
        <Kpi
          icon="bi-eye"
          label="詳細の閲覧"
          value={fmt(total.detail)}
          unit="回"
          help="案件の詳細ページが開かれた回数です（一覧から以外も含みます）。"
        />
        <Kpi
          icon="bi-heart"
          label="気になる（いま）"
          value={fmt(total.fav)}
          unit="件"
          help="いま「気になる」に入っている数です（期間に関係なく、外されたものは除きます）。"
        />
        <Kpi icon="bi-send-check" label="応募" value={fmt(total.apps)} unit="件" help="この期間にホームページから応募された数です。" />
      </div>

      <section className="adm-card adm-card--wide">
        <p className="adm-card__en">By Job</p>
        <h2 className="adm-card__title">
          案件ごとの反応<small>{rows.length}件</small>
        </h2>
        <p className="adm-card__help">
          「気になる」の人数を押すと、入れた人のお名前・連絡先が出ます。案件名を押すと、ホームページの案件ページが新しいタブで開きます。
        </p>
        {rows.length === 0 ? (
          <p className="adm-empty">まだ記録がありません。スタッフが案件一覧を見ると、ここに集まります。</p>
        ) : (
          <div className="adm-tablewrap">
            <table className="adm-table adm-jobs">
              <thead>
                <tr>
                  <th>案件</th>
                  <th>一覧での表示</th>
                  <th>クリック</th>
                  <th>クリック率</th>
                  <th>詳細の閲覧</th>
                  <th>気になる</th>
                  <th>応募</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className={r.posted ? '' : 'is-ended'}>
                    <td>
                      <div className="adm-jobs__name">
                        <span className={`adm-pill adm-pill--${r.kind === 'project' ? 'employers' : 'seekers'}`}>
                          {r.kind === 'project' ? '派遣など' : '人材紹介'}
                        </span>
                        {r.posted ? (
                          <a
                            className="adm-jobs__title"
                            href={r.kind === 'project' ? `/jobs/${r.id}/` : `/jobs/recruit/${r.id}/`}
                            target="_blank"
                            rel="noopener"
                          >
                            {r.title}
                          </a>
                        ) : (
                          <span className="adm-jobs__title">{r.title}</span>
                        )}
                        {!r.posted && <em className="adm-jobs__ended">掲載終了</em>}
                      </div>
                    </td>
                    <td>{fmt(r.listViews)}</td>
                    <td>{fmt(r.clicks)}</td>
                    <td>{rate(r.clicks, r.listViews)}</td>
                    <td>{fmt(r.detailViews)}</td>
                    <td>
                      <FavoriteUsers count={r.favorites} users={usersOf(r)} />
                    </td>
                    <td>{fmt(r.applications)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
