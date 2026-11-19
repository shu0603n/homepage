import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminAvatar } from '@/components/admin/AdminAvatar';
import { InquiryHandledToggle } from '@/components/admin/InquiryHandledToggle';
import { InquiryWork } from '@/components/admin/InquiryWork';
import { getGa4, getGtm, getSearchConsole, SEARCH_CONSOLE_SITE, type Section } from '@/lib/admin/google';
import type { InquiryRow } from '@/lib/admin/store';
import { COMPANY, RECRUIT, SERVICES, SITE } from '@/lib/site';

// 管理ページの各タブの中身。数字には、はじめて見る人にも分かる説明を必ず添える

// ---------- 表示の道具 ----------

const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const dateTime = (d: Date | number) =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}月${Number(ymd.slice(8, 10))}日`;

// 前の期間と比べた増減（lowerIsBetter：掲載順位のように、小さいほど良いもの）
function Change({ now, before, lowerIsBetter = false }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before) return <span className="adm-change">前の期間のデータなし</span>;
  const diff = (now - before) / before;
  if (Math.abs(diff) < 0.005) return <span className="adm-change">前の期間と同じくらい</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className={`adm-change ${good ? 'is-up' : 'is-down'}`}>
      <i className={`bi ${diff > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} aria-hidden="true" />
      前の期間より {Math.abs(diff * 100).toFixed(0)}% {diff > 0 ? '増' : '減'}
    </span>
  );
}

function Kpi({
  icon,
  label,
  value,
  unit,
  help,
  change
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  help: string;
  change?: ReactNode;
}) {
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
      {change}
      <p className="adm-kpi__help">{help}</p>
    </div>
  );
}

function Bars({
  rows,
  unit,
  empty = 'まだデータがありません。'
}: {
  rows: { label: string; value: number }[];
  unit: string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="adm-empty">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="adm-bars">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <span className="adm-bars__rank">{i + 1}</span>
          <span className="adm-bars__label">{r.label}</span>
          <span className="adm-bars__value">
            {fmt(r.value)}
            <small>{unit}</small>
          </span>
          <span className="adm-bars__track" aria-hidden="true">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

// 日ごとの棒グラフ（28日分）
function Daily({ rows }: { rows: { date: string; users: number }[] }) {
  if (rows.length === 0) return <p className="adm-empty">まだデータがありません。</p>;
  const max = Math.max(1, ...rows.map((r) => r.users));
  return (
    <div className="adm-daily" role="img" aria-label="日ごとの訪れた人の数のグラフ">
      <span className="adm-daily__max">最大 {fmt(max)}人</span>
      {rows.map((r, i) => (
        <div key={r.date} className="adm-daily__col">
          <span className="adm-daily__tip">
            {r.date}
            <strong>{fmt(r.users)}人</strong>
          </span>
          <span className="adm-daily__bar" style={{ height: `${Math.max(3, (r.users / max) * 100)}%` }} />
          {(i % 7 === 0 || i === rows.length - 1) && <span className="adm-daily__date">{r.date}</span>}
        </div>
      ))}
    </div>
  );
}

function Card({ en, title, help, children, wide }: { en: string; title: string; help?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`adm-card${wide ? ' adm-card--wide' : ''}`}>
      <p className="adm-card__en">{en}</p>
      <h2 className="adm-card__title">{title}</h2>
      {help && <p className="adm-card__help">{help}</p>}
      {children}
    </section>
  );
}

// update：データがいつ更新されるかの説明（まとめのカードの下に小さく出す）
function Summary({ period, children, live, update }: { period: string; children: ReactNode; live?: ReactNode; update?: ReactNode }) {
  return (
    <section className="adm-summary">
      <p className="adm-summary__period">
        <i className="bi bi-calendar3" aria-hidden="true" />
        {period}
      </p>
      <p className="adm-summary__text">{children}</p>
      {live}
      {update && (
        <p className="adm-summary__update">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>{update}</span>
        </p>
      )}
    </section>
  );
}

// ページの URL を、日本語のページ名にする
const PAGE_NAMES: Record<string, string> = {
  '/': 'トップページ',
  '/register/': 'スタッフ登録',
  '/register/complete/': 'スタッフ登録 完了',
  '/register/password/': 'スタッフ登録 パスワード設定',
  '/register/visit/': '来社登録',
  '/job-seekers/': 'お仕事をお探しの方',
  '/for-employers/': '企業担当者様',
  '/contact/': 'お問い合わせ',
  '/jobs/': '求人一覧',
  '/login/': 'ログイン',
  '/mypage/': 'マイページ',
  '/company/': '企業情報',
  '/service/': '事業内容',
  '/recruit/': '採用情報',
  '/news/': 'お知らせ',
  ...Object.fromEntries(COMPANY.map(([s, ja]) => [`/company/${s}/`, ja])),
  ...Object.fromEntries(SERVICES.map(([s, ja]) => [`/service/${s}/`, ja])),
  ...Object.fromEntries(RECRUIT.map(([s, ja]) => [`/${s}/`, `採用：${ja}`]))
};
function pageName(path: string): string {
  const p = path.replace(/^https?:\/\/[^/]+/, '').split('?')[0] || '/';
  const withSlash = p.endsWith('/') ? p : `${p}/`;
  if (PAGE_NAMES[withSlash]) return PAGE_NAMES[withSlash];
  if (/^\/jobs\/recruit\/\d+\/$/.test(withSlash)) return '求人の詳細（正社員）';
  if (/^\/jobs\/\d+\/$/.test(withSlash)) return '求人の詳細';
  return p;
}

const CHANNELS: Record<string, string> = {
  'Organic Search': '検索エンジン（Google・Yahoo! など）',
  Direct: '直接（ブックマーク・URL 入力・LINE など）',
  Referral: 'ほかのサイトのリンク',
  'Organic Social': 'SNS（Instagram・X など）',
  'Paid Search': '検索広告',
  'Paid Social': 'SNS 広告',
  Display: 'ディスプレイ広告',
  Email: 'メールのリンク',
  'Organic Video': '動画サイト',
  Unassigned: '分類できないもの'
};
const DEVICES: Record<string, [string, string]> = {
  mobile: ['スマホ', 'bi-phone'],
  desktop: ['パソコン', 'bi-laptop'],
  tablet: ['タブレット', 'bi-tablet'],
  'smart tv': ['テレビ', 'bi-tv']
};

// ---------- Google と未接続・権限なしのとき ----------

function SetupGuide({ section, service }: { section: Section<unknown>; service: 'ga4' | 'sc' | 'gtm' }) {
  if (section.ok) return null;
  if (section.reason === 'error') {
    return (
      <div className="adm-alert is-ng">
        <i className="bi bi-exclamation-octagon" aria-hidden="true" />
        <span>
          データを取得できませんでした。時間をおいて開き直してください。続く場合は管理担当者にお知らせください。
          <small>（{section.message}）</small>
        </span>
      </div>
    );
  }
  const where = {
    ga4: 'GA4 の「管理」→「プロパティのアクセス管理」で、サービス アカウントのメールアドレスを「閲覧者」として追加',
    sc: `Search Console の「設定」→「ユーザーと権限」で、サービス アカウントのメールアドレスを「制限付き」として追加（対象：${SEARCH_CONSOLE_SITE}）`,
    gtm: `タグ マネージャーの「管理」→「ユーザー管理」（コンテナ ${SITE.gtmContainerId}）で、サービス アカウントのメールアドレスに「読み取り」の権限を追加`
  }[service];
  return (
    <div className="adm-alert is-warn">
      <i className="bi bi-plug" aria-hidden="true" />
      <span>
        <strong>
          {section.reason === 'not_configured'
            ? 'Google との接続がまだ設定されていません。'
            : 'Google のデータを見る権限がまだありません。'}
        </strong>
        {section.reason === 'not_configured'
          ? 'Google Cloud でサービス アカウントを作り、Amplify の環境変数（GOOGLE_SA_EMAIL・GOOGLE_SA_KEY・GA4_PROPERTY_ID）に設定すると表示されます。'
          : `${where}してください。権限を付けた直後は、反映まで数分かかることがあります。`}
      </span>
    </div>
  );
}

const hm = (at: number) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(at);
const RELOAD = 'この画面は10分ごとに最新のデータを取りに行きます';

const fetched = (at: number) => (
  <p className="adm-fetched">
    <i className="bi bi-arrow-repeat" aria-hidden="true" />
    データ取得：{dateTime(at)}（10分ごとに更新）
  </p>
);

// ---------- アクセス状況（GA4） ----------

export async function Ga4Panel() {
  const ga = await getGa4();
  if (!ga.ok) return <SetupGuide section={ga} service="ga4" />;
  const d = ga.data;
  const diff = d.previous.users ? (d.totals.users - d.previous.users) / d.previous.users : 0;
  return (
    <div className="adm-stack">
      <Summary
        period={`${md(d.period.start)}〜${md(d.period.end)}（直近28日間）`}
        update={
          <>
            更新のタイミング：数字とグラフは「前日まで」の分を毎日更新します（今日の分は翌日に反映。集計に時間がかかるため、前日の数字は翌日にかけて少し増えることがあります）。「いま見ている人」はリアルタイムです。
            {RELOAD}（最終取得 {hm(ga.fetchedAt)}）。
          </>
        }
        live={
          <p className="adm-summary__live">
            <span className="adm-live" aria-hidden="true" />
            いま見ている人 <strong>{fmt(d.realtimeUsers)}</strong>人<small>（直近30分）</small>
          </p>
        }
      >
        この28日間で、<strong>{fmt(d.totals.users)}人</strong>がホームページを訪れました
        {d.previous.users > 0 && (
          <>
            （前の28日間より
            <strong>
              {Math.abs(diff * 100).toFixed(0)}%{diff >= 0 ? '増' : '減'}
            </strong>
            ）
          </>
        )}
        。スタッフ登録の完了は<strong>{fmt(d.registrations.current)}件</strong>でした。
      </Summary>

      <div className="adm-kpis">
        <Kpi
          icon="bi-people"
          label="訪れた人の数"
          value={fmt(d.totals.users)}
          unit="人"
          help="同じ人が何回来ても1人と数えます（ユーザー数）。"
          change={<Change now={d.totals.users} before={d.previous.users} />}
        />
        <Kpi
          icon="bi-person-plus"
          label="はじめて来た人"
          value={fmt(d.totals.newUsers)}
          unit="人"
          help="この期間にはじめてサイトを訪れた人です（新規ユーザー数）。"
          change={<Change now={d.totals.newUsers} before={d.previous.newUsers} />}
        />
        <Kpi
          icon="bi-door-open"
          label="訪問の回数"
          value={fmt(d.totals.sessions)}
          unit="回"
          help="サイトに来てから離れるまでを1回と数えます（セッション数）。"
          change={<Change now={d.totals.sessions} before={d.previous.sessions} />}
        />
        <Kpi
          icon="bi-file-earmark-text"
          label="見られたページの数"
          value={fmt(d.totals.views)}
          unit="ページ"
          help="ページが表示された合計の回数です（表示回数）。"
          change={<Change now={d.totals.views} before={d.previous.views} />}
        />
        <Kpi
          icon="bi-person-check"
          label="スタッフ登録の完了"
          value={fmt(d.registrations.current)}
          unit="件"
          help="登録完了ページが表示された回数です（パスワード設定まで終えた人）。"
          change={<Change now={d.registrations.current} before={d.registrations.previous} />}
        />
      </div>

      <Card
        en="Daily"
        title="日ごとの訪れた人の数"
        help="棒が高い日ほど、多くの人が来ています。棒にマウスを乗せると、その日の人数が出ます。"
        wide
      >
        <Daily rows={d.daily} />
      </Card>

      <div className="adm-grid2">
        <Card en="Pages" title="よく見られたページ" help="どのページがよく読まれているかが分かります（上位10）。">
          <Bars rows={d.pages.map((p) => ({ label: pageName(p.path), value: p.views }))} unit="回" />
        </Card>
        <Card en="Source" title="どこから来たか" help="訪問のきっかけです。「検索エンジン」が多いほど、検索で見つけてもらえています。">
          <Bars rows={d.channels.map((c) => ({ label: CHANNELS[c.name] ?? c.name, value: c.sessions }))} unit="回" />
        </Card>
      </div>

      <Card en="Devices" title="使っている端末" help="スマホから見ている人が多い場合は、スマホでの見やすさが特に大切です。" wide>
        <DeviceShare rows={d.devices} />
      </Card>
      {fetched(ga.fetchedAt)}
    </div>
  );
}

// 端末の割合（横に並べた帯グラフ＋内訳）
function DeviceShare({ rows }: { rows: { name: string; users: number }[] }) {
  const total = rows.reduce((s, r) => s + r.users, 0);
  if (!total) return <p className="adm-empty">まだデータがありません。</p>;
  return (
    <div className="adm-share">
      <div className="adm-share__bar" aria-hidden="true">
        {rows.map((r, i) => (
          <span key={r.name} className={`adm-share__seg is-${i}`} style={{ width: `${(r.users / total) * 100}%` }} />
        ))}
      </div>
      <ul className="adm-share__legend">
        {rows.map((r, i) => {
          const [label, icon] = DEVICES[r.name] ?? [r.name, 'bi-question-circle'];
          return (
            <li key={r.name}>
              <span className={`adm-share__dot is-${i}`} aria-hidden="true" />
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
              <strong>{((r.users / total) * 100).toFixed(0)}%</strong>
              <small>{fmt(r.users)}人</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- 検索での見え方（Search Console） ----------

export async function ScPanel() {
  const sc = await getSearchConsole();
  if (!sc.ok) return <SetupGuide section={sc} service="sc" />;
  const d = sc.data;
  return (
    <div className="adm-stack">
      <Summary
        period={`${md(d.period.start)}〜${md(d.period.end)}（直近28日間）`}
        update={
          <>
            更新のタイミング：Google 検索のデータは2〜3日遅れで届き、毎日更新されます（そのため期間は3日前までです）。{RELOAD}（最終取得{' '}
            {hm(sc.fetchedAt)}）。
          </>
        }
      >
        Google の検索結果に<strong>{fmt(d.totals.impressions)}回</strong>表示され、そこから<strong>{fmt(d.totals.clicks)}回</strong>
        クリックされてサイトに来ました。
      </Summary>
      <div className="adm-kpis">
        <Kpi
          icon="bi-eye"
          label="検索結果に出た回数"
          value={fmt(d.totals.impressions)}
          unit="回"
          help="Google の検索結果に、このサイトが表示された回数です（表示回数）。"
          change={<Change now={d.totals.impressions} before={d.previous.impressions} />}
        />
        <Kpi
          icon="bi-cursor"
          label="検索結果から来た回数"
          value={fmt(d.totals.clicks)}
          unit="回"
          help="検索結果でクリックされて、サイトに来た回数です（クリック数）。"
          change={<Change now={d.totals.clicks} before={d.previous.clicks} />}
        />
        <Kpi
          icon="bi-percent"
          label="クリックされた割合"
          value={pct(d.totals.ctr)}
          help="検索結果に出たうち、クリックされた割合です（CTR）。高いほど、魅力的に見えています。"
          change={<Change now={d.totals.ctr} before={d.previous.ctr} />}
        />
        <Kpi
          icon="bi-trophy"
          label="検索結果での平均の順位"
          value={d.totals.position ? d.totals.position.toFixed(1) : '—'}
          unit={d.totals.position ? '位' : undefined}
          help="検索結果の上から何番目に出たかの平均です。数字が小さいほど上の方に出ています（1ページ目は10位まで）。"
          change={<Change now={d.totals.position} before={d.previous.position} lowerIsBetter />}
        />
      </div>
      <div className="adm-grid2">
        <Card en="Keywords" title="どんな言葉で検索されたか" help="この言葉で検索した人が、サイトを見つけています（上位10）。">
          {d.queries.length ? (
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>検索された言葉</th>
                    <th>来た回数</th>
                    <th>出た回数</th>
                    <th>平均順位</th>
                  </tr>
                </thead>
                <tbody>
                  {d.queries.map((q) => (
                    <tr key={q.query}>
                      <td>{q.query}</td>
                      <td>{fmt(q.clicks)}</td>
                      <td>{fmt(q.impressions)}</td>
                      <td>{q.position.toFixed(1)}位</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-empty">まだデータがありません。サイトを公開してから数日〜数週間で集まります。</p>
          )}
        </Card>
        <Card en="Landing" title="検索から来たページ" help="検索結果から、どのページに来ているかです（上位10）。">
          <Bars
            rows={d.pages.map((p) => ({ label: pageName(p.page), value: p.clicks }))}
            unit="回"
            empty="まだデータがありません。サイトを公開してから数日〜数週間で集まります。"
          />
        </Card>
      </div>
      {fetched(sc.fetchedAt)}
    </div>
  );
}

// ---------- 計測タグ（タグ マネージャー） ----------

const TAG_TYPES: Record<string, string> = {
  googtag: 'Google タグ（GA4 のアクセス計測）',
  gaawe: 'GA4 のイベント計測',
  awct: 'Google 広告の成果計測',
  sp: 'Google 広告のリマーケティング',
  gclidw: 'Google 広告のクリック情報の保存',
  html: 'カスタム HTML（自由に書いたタグ）',
  img: 'カスタム画像タグ'
};

export async function GtmPanel() {
  const gtm = await getGtm();
  if (!gtm.ok) return <SetupGuide section={gtm} service="gtm" />;
  const d = gtm.data;
  return (
    <div className="adm-stack">
      <Summary
        period="タグ マネージャーとは"
        update={
          <>
            更新のタイミング：タグ マネージャーで「公開」を押すと、すぐサイトに反映されます。{RELOAD}（最終取得 {hm(gtm.fetchedAt)}）。
          </>
        }
      >
        アクセス計測や広告の「タグ」（計測用の小さなプログラム）を、まとめてサイトに配る仕組みです。
        <br />
        ここで<strong>公開中のタグ</strong>
        が全ページで動いています。アクセス数などの数字は「アクセス状況」で見られます。
      </Summary>
      <div className="adm-kpis">
        <Kpi icon="bi-box" label="コンテナ" value={d.containerId} help="サイトに埋め込んでいるタグ マネージャーの ID です。" />
        <Kpi
          icon="bi-layers"
          label="公開中のバージョン"
          value={d.versionName || `バージョン ${d.versionId}`}
          help="いまサイトで動いている設定の名前です。"
        />
        <Kpi
          icon="bi-clock-history"
          label="最後に公開した日時"
          value={d.publishedAt ? dateTime(d.publishedAt) : '—'}
          help="タグ マネージャーで最後に「公開」を押した日時です。"
        />
        <Kpi
          icon="bi-lightning-charge"
          label="動いているタグ"
          value={String(d.tags.filter((t) => !t.paused).length)}
          unit="個"
          help="一時停止しているタグは数えていません。"
        />
      </div>
      <Card en="Live Tags" title="公開中のタグ" help="身に覚えのないタグがあれば、管理担当者に確認してください。" wide>
        <ul className="adm-tags">
          {d.tags.map((t) => (
            <li key={t.name} className={t.paused ? 'is-paused' : ''}>
              <i className="bi bi-tag" aria-hidden="true" />
              <span>
                <strong>{t.name}</strong>
                <small>{TAG_TYPES[t.type] ?? t.type}</small>
              </span>
              <em>{t.paused ? '一時停止中' : '動作中'}</em>
            </li>
          ))}
        </ul>
      </Card>
      {fetched(gtm.fetchedAt)}
    </div>
  );
}

// ---------- お問い合わせ ----------

// 一覧に出す本文の冒頭（改行や空白はまとめ、50文字を超えたら「…」）。全文は開いたときに出す
const EXCERPT_CHARS = 50;
function excerpt(message: string | null): string {
  const text = (message ?? '').split(/[\s　]+/).filter(Boolean).join(' ');
  const chars = [...text];
  return chars.length > EXCERPT_CHARS ? `${chars.slice(0, EXCERPT_CHARS).join('')}…` : text;
}

const FORM_NAMES = { employers: '企業担当者様', seekers: 'お仕事をお探しの方' } as const;
const FILTERS = [
  ['', 'すべて'],
  ['open', '未対応'],
  ['done', '対応済み'],
  ['mine', '自分の担当'],
  ['employers', '企業担当者様'],
  ['seekers', 'お仕事をお探しの方']
] as const;

// admins：担当者のプルダウンに出す管理者。selfId：ログイン中の管理者（「自分の担当」の絞り込み用）
export function InquiriesPanel({
  inquiries,
  filter,
  admins,
  selfId
}: {
  inquiries: InquiryRow[] | null;
  filter?: string;
  admins: { id: number; label: string; email: string; avatar: string | null }[];
  selfId: number;
}) {
  const adminById = new Map(admins.map((a) => [a.id, a]));
  if (!inquiries)
    return (
      <div className="adm-alert is-ng">
        <i className="bi bi-exclamation-octagon" aria-hidden="true" />
        <span>お問い合わせを読み込めませんでした。時間をおいて開き直してください。</span>
      </div>
    );
  const shown = inquiries.filter((i) =>
    filter === 'open'
      ? !i.handled
      : filter === 'done'
        ? i.handled
        : filter === 'mine'
          ? i.assignee_id === selfId
          : filter === 'employers' || filter === 'seekers'
            ? i.form === filter
            : true
  );
  const open = inquiries.filter((i) => !i.handled).length;
  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <nav className="adm-filters" aria-label="絞り込み">
          {FILTERS.map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/?tab=inquiries${key ? `&filter=${key}` : ''}`}
              className={`adm-filter${(filter ?? '') === key ? ' is-active' : ''}`}
            >
              {label}
              {key === 'open' && open > 0 && <em>{open}</em>}
            </Link>
          ))}
        </nav>
        <p className="adm-toolbar__note">対応が終わったら「対応済み」にチェックを入れてください。</p>
      </div>
      {shown.length === 0 ? (
        <p className="adm-empty adm-empty--big">
          <i className="bi bi-inbox" aria-hidden="true" />
          表示するお問い合わせはありません。
        </p>
      ) : (
        <ul className="adm-inquiries">
          {shown.map((i) => (
            <li key={i.id} className={`adm-inquiry${i.handled ? ' is-handled' : ''}`}>
              <details>
                <summary>
                  <span className={`adm-pill adm-pill--${i.form}`}>{FORM_NAMES[i.form] ?? i.form}</span>
                  <span className="adm-inquiry__who">
                    {i.company && <small>{i.company}</small>}
                    {i.name} 様
                  </span>
                  <span className="adm-inquiry__date">{dateTime(i.created_at)}</span>
                  {i.assignee_id !== null &&
                    (() => {
                      // 担当者のアイコン（未登録なら名前の頭文字）。削除された管理者は人のマーク
                      const a = adminById.get(i.assignee_id);
                      return (
                        <span className="adm-inquiry__assignee">
                          {a ? (
                            <AdminAvatar name={a.label} email={a.email} url={a.avatar} className="adm-inquiry__avatar" />
                          ) : (
                            <i className="bi bi-person" aria-hidden="true" />
                          )}
                          担当：{a?.label ?? '（削除された管理者）'}
                        </span>
                      );
                    })()}
                  {i.memo && (
                    <span className="adm-inquiry__hasmemo">
                      <i className="bi bi-sticky" aria-hidden="true" />
                      メモあり
                    </span>
                  )}
                  <span className="adm-inquiry__excerpt">{excerpt(i.message)}</span>
                </summary>
                <dl className="adm-inquiry__body">
                  {(
                    [
                      ['会社名', i.company],
                      ['お名前', i.name],
                      ['ふりがな', i.kana],
                      ['メール', i.email],
                      ['電話番号', i.tel],
                      ['所在地', i.address],
                      ['お問い合わせ内容', i.inquiry_type],
                      ['性別', i.gender],
                      ['希望職種', i.job]
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>
                          {k === 'メール' ? (
                            <a href={`mailto:${v}`}>{v}</a>
                          ) : k === '電話番号' ? (
                            <a href={`tel:${String(v).replace(/[^\d+]/g, '')}`}>{v}</a>
                          ) : (
                            v
                          )}
                        </dd>
                      </div>
                    ))}
                  <div className="adm-inquiry__message">
                    <dt>本文</dt>
                    <dd>{i.message}</dd>
                  </div>
                </dl>
                <InquiryWork
                  id={i.id}
                  admins={admins}
                  assigneeId={i.assignee_id}
                  memo={i.memo ?? ''}
                  memoInfo={
                    i.memo_updated_at ? `${i.memo_updated_by_name ?? '（削除された管理者）'}・${dateTime(i.memo_updated_at)}` : null
                  }
                />
              </details>
              <InquiryHandledToggle id={i.id} handled={i.handled} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
