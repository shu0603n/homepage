import Link from "next/link";
import type { ReactNode } from "react";
import { InquiryHandledToggle } from "@/components/admin/InquiryHandledToggle";
import { getGa4, getGtm, getSearchConsole, SEARCH_CONSOLE_SITE, type Section } from "@/lib/admin/google";
import type { InquiryRow } from "@/lib/admin/store";
import { COMPANY, RECRUIT, SERVICES, SITE } from "@/lib/site";

// 管理ページの各タブ。数字には、はじめて見る人にも分かる説明を必ず添える

// ---------- 表示の道具 ----------

const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const dateTime = (d: Date | number) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}月${Number(ymd.slice(8, 10))}日`;

// 前の期間と比べた増減（lowerIsBetter：掲載順位のように、小さいほど良いもの）
function Change({ now, before, lowerIsBetter = false }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before) return <span className="admin-change">前の期間のデータなし</span>;
  const diff = (now - before) / before;
  if (Math.abs(diff) < 0.005) return <span className="admin-change">前の期間と同じくらい</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className={`admin-change ${good ? "is-up" : "is-down"}`}>
      {diff > 0 ? "▲" : "▼"} 前の期間より {Math.abs(diff * 100).toFixed(0)}% {diff > 0 ? "増" : "減"}
    </span>
  );
}

function Kpi({ label, value, help, change }: { label: string; value: string; help: string; change?: ReactNode }) {
  return (
    <div className="admin-kpi">
      <p className="admin-kpi__label">{label}</p>
      <p className="admin-kpi__value">{value}</p>
      {change}
      <p className="admin-kpi__help">{help}</p>
    </div>
  );
}

function Bars({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="admin-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="admin-bars__label">{r.label}</span>
          <span className="admin-bars__track">
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="admin-bars__value">
            {fmt(r.value)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

// 日ごとの棒グラフ（28日分）
function Daily({ rows }: { rows: { date: string; users: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.users));
  return (
    <div className="admin-daily" role="img" aria-label="日ごとの訪問者数のグラフ">
      {rows.map((r, i) => (
        <div key={r.date} className="admin-daily__col" title={`${r.date}：${fmt(r.users)}人`}>
          <span className="admin-daily__bar" style={{ height: `${Math.max(2, (r.users / max) * 100)}%` }} />
          {(i % 7 === 0 || i === rows.length - 1) && <span className="admin-daily__date">{r.date}</span>}
        </div>
      ))}
    </div>
  );
}

function Card({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <section className="admin-card">
      <h2 className="admin-h2">{title}</h2>
      {help && <p className="admin-help">{help}</p>}
      {children}
    </section>
  );
}

// ページの URL を、日本語のページ名にする
const PAGE_NAMES: Record<string, string> = {
  "/": "トップページ",
  "/register/": "スタッフ登録",
  "/register/complete/": "スタッフ登録 完了",
  "/register/password/": "スタッフ登録 パスワード設定",
  "/register/visit/": "来社登録",
  "/job-seekers/": "お仕事をお探しの方",
  "/for-employers/": "企業担当者様",
  "/contact/": "お問い合わせ",
  "/jobs/": "求人一覧",
  "/login/": "ログイン",
  "/mypage/": "マイページ",
  "/company/": "企業情報",
  "/service/": "事業内容",
  "/recruit/": "採用情報",
  "/news/": "お知らせ",
  ...Object.fromEntries(COMPANY.map(([s, ja]) => [`/company/${s}/`, ja])),
  ...Object.fromEntries(SERVICES.map(([s, ja]) => [`/service/${s}/`, ja])),
  ...Object.fromEntries(RECRUIT.map(([s, ja]) => [`/${s}/`, `採用：${ja}`])),
};
function pageName(path: string): string {
  const p = path.replace(/^https?:\/\/[^/]+/, "").split("?")[0] || "/";
  const withSlash = p.endsWith("/") ? p : `${p}/`;
  if (PAGE_NAMES[withSlash]) return PAGE_NAMES[withSlash];
  if (/^\/jobs\/recruit\/\d+\/$/.test(withSlash)) return "求人の詳細（正社員）";
  if (/^\/jobs\/\d+\/$/.test(withSlash)) return "求人の詳細";
  return p;
}

const CHANNELS: Record<string, string> = {
  "Organic Search": "検索エンジン（Google・Yahoo! など）から",
  Direct: "直接（ブックマーク・URL 入力・LINE など）",
  Referral: "ほかのサイトのリンクから",
  "Organic Social": "SNS（Instagram・X など）から",
  "Paid Search": "検索広告から",
  "Paid Social": "SNS 広告から",
  Display: "ディスプレイ広告から",
  Email: "メールのリンクから",
  "Organic Video": "動画サイトから",
  Unassigned: "分類できないもの",
};
const DEVICES: Record<string, string> = { mobile: "スマホ", desktop: "パソコン", tablet: "タブレット", "smart tv": "テレビ" };

// ---------- Google と未接続・権限なしのとき ----------

function SetupGuide({ section, service }: { section: Section<unknown>; service: "ga4" | "sc" | "gtm" }) {
  if (section.ok) return null;
  if (section.reason === "error") {
    return (
      <div className="admin-alert is-ng">
        データを取得できませんでした。時間をおいて開き直してください。続く場合は管理担当者にお知らせください。
        <br />
        <small>（{section.message}）</small>
      </div>
    );
  }
  const where = {
    ga4: "GA4 の「管理」→「プロパティのアクセス管理」で、サービス アカウントのメールアドレスを「閲覧者」として追加",
    sc: `Search Console の「設定」→「ユーザーと権限」で、サービス アカウントのメールアドレスを「制限付き」として追加（対象：${SEARCH_CONSOLE_SITE}）`,
    gtm: `タグ マネージャーの「管理」→「ユーザー管理」（コンテナ ${SITE.gtmContainerId}）で、サービス アカウントのメールアドレスに「読み取り」の権限を追加`,
  }[service];
  return (
    <div className="admin-alert is-warn">
      <strong>{section.reason === "not_configured" ? "Google との接続がまだ設定されていません。" : "Google のデータを見る権限がまだありません。"}</strong>
      <br />
      {section.reason === "not_configured" ? "Google Cloud でサービス アカウントを作り、Amplify の環境変数（GOOGLE_SA_EMAIL・GOOGLE_SA_KEY・GA4_PROPERTY_ID）に設定すると表示されます。" : `${where}してください。`}
    </div>
  );
}

const fetched = (at: number) => <p className="admin-fetched">データ取得：{dateTime(at)}（10分ごとに更新）</p>;

// ---------- アクセス状況（GA4） ----------

export async function Ga4Panel() {
  const ga = await getGa4();
  if (!ga.ok) return <SetupGuide section={ga} service="ga4" />;
  const d = ga.data;
  const diff = d.previous.users ? (d.totals.users - d.previous.users) / d.previous.users : 0;
  return (
    <div className="admin-stack">
      <section className="admin-summary">
        <p className="admin-summary__period">
          {md(d.period.start)}〜{md(d.period.end)}（直近28日間）
        </p>
        <p className="admin-summary__text">
          この28日間で、<strong>{fmt(d.totals.users)}人</strong>がホームページを訪れました
          {d.previous.users > 0 && (
            <>
              （前の28日間より<strong>{Math.abs(diff * 100).toFixed(0)}%{diff >= 0 ? "増" : "減"}</strong>）
            </>
          )}
          。スタッフ登録の完了は<strong>{fmt(d.registrations.current)}件</strong>でした。
        </p>
        <p className="admin-summary__live">
          <span className="admin-live" aria-hidden="true" />
          いま見ている人：<strong>{fmt(d.realtimeUsers)}人</strong>（直近30分）
        </p>
      </section>

      <div className="admin-kpis">
        <Kpi label="訪れた人の数" value={`${fmt(d.totals.users)}人`} help="同じ人が何回来ても1人と数えます（ユーザー数）。" change={<Change now={d.totals.users} before={d.previous.users} />} />
        <Kpi label="はじめて来た人" value={`${fmt(d.totals.newUsers)}人`} help="この期間にはじめてサイトを訪れた人です（新規ユーザー数）。" change={<Change now={d.totals.newUsers} before={d.previous.newUsers} />} />
        <Kpi label="訪問の回数" value={`${fmt(d.totals.sessions)}回`} help="サイトに来てから離れるまでを1回と数えます（セッション数）。" change={<Change now={d.totals.sessions} before={d.previous.sessions} />} />
        <Kpi label="見られたページの数" value={`${fmt(d.totals.views)}ページ`} help="ページが表示された合計の回数です（表示回数）。" change={<Change now={d.totals.views} before={d.previous.views} />} />
        <Kpi label="スタッフ登録の完了" value={`${fmt(d.registrations.current)}件`} help="登録完了ページが表示された回数です（パスワード設定まで終えた人）。" change={<Change now={d.registrations.current} before={d.registrations.previous} />} />
      </div>

      <Card title="日ごとの訪れた人の数" help="棒が高い日ほど、多くの人が来ています。棒にマウスを乗せると人数が出ます。">
        <Daily rows={d.daily} />
      </Card>

      <div className="admin-grid2">
        <Card title="よく見られたページ（上位10）" help="どのページがよく読まれているかが分かります。">
          <Bars rows={d.pages.map((p) => ({ label: pageName(p.path), value: p.views }))} unit="回" />
        </Card>
        <Card title="どこから来たか" help="訪問のきっかけです。「検索エンジンから」が多いほど、検索で見つけてもらえています。">
          <Bars rows={d.channels.map((c) => ({ label: CHANNELS[c.name] ?? c.name, value: c.sessions }))} unit="回" />
        </Card>
      </div>

      <Card title="使っている端末" help="スマホから見ている人が多い場合は、スマホでの見やすさが特に大切です。">
        <Bars rows={d.devices.map((v) => ({ label: DEVICES[v.name] ?? v.name, value: v.users }))} unit="人" />
      </Card>
      {fetched(ga.fetchedAt)}
    </div>
  );
}

// ---------- 検索での見え方（Search Console） ----------

export async function ScPanel() {
  const sc = await getSearchConsole();
  if (!sc.ok) return <SetupGuide section={sc} service="sc" />;
  const d = sc.data;
  return (
    <div className="admin-stack">
      <section className="admin-summary">
        <p className="admin-summary__period">
          {md(d.period.start)}〜{md(d.period.end)}（Google 検索のデータは2〜3日遅れで届きます）
        </p>
        <p className="admin-summary__text">
          Google の検索結果に<strong>{fmt(d.totals.impressions)}回</strong>表示され、そこから<strong>{fmt(d.totals.clicks)}回</strong>クリックされてサイトに来ました。
        </p>
      </section>
      <div className="admin-kpis">
        <Kpi label="検索結果に出た回数" value={`${fmt(d.totals.impressions)}回`} help="Google の検索結果に、このサイトが表示された回数です（表示回数）。" change={<Change now={d.totals.impressions} before={d.previous.impressions} />} />
        <Kpi label="検索結果から来た回数" value={`${fmt(d.totals.clicks)}回`} help="検索結果でクリックされて、サイトに来た回数です（クリック数）。" change={<Change now={d.totals.clicks} before={d.previous.clicks} />} />
        <Kpi label="クリックされた割合" value={pct(d.totals.ctr)} help="検索結果に出たうち、クリックされた割合です（CTR）。高いほど、魅力的に見えています。" change={<Change now={d.totals.ctr} before={d.previous.ctr} />} />
        <Kpi
          label="検索結果での平均の順位"
          value={d.totals.position ? `${d.totals.position.toFixed(1)}位` : "—"}
          help="検索結果の上から何番目に出たかの平均です。数字が小さいほど上の方に出ています（1ページ目は10位まで）。"
          change={<Change now={d.totals.position} before={d.previous.position} lowerIsBetter />}
        />
      </div>
      <div className="admin-grid2">
        <Card title="どんな言葉で検索されたか（上位10）" help="この言葉で検索した人が、サイトを見つけています。">
          {d.queries.length ? (
            <table className="admin-table">
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
          ) : (
            <p className="admin-empty">まだデータがありません。サイトを公開してから数日〜数週間で集まります。</p>
          )}
        </Card>
        <Card title="検索から来たページ（上位10）" help="検索結果から、どのページに来ているかです。">
          <Bars rows={d.pages.map((p) => ({ label: pageName(p.page), value: p.clicks }))} unit="回" />
        </Card>
      </div>
      {fetched(sc.fetchedAt)}
    </div>
  );
}

// ---------- 計測タグ（タグ マネージャー） ----------

const TAG_TYPES: Record<string, string> = {
  googtag: "Google タグ（GA4 のアクセス計測）",
  gaawe: "GA4 のイベント計測",
  awct: "Google 広告の成果計測",
  sp: "Google 広告のリマーケティング",
  gclidw: "Google 広告のクリック情報の保存",
  html: "カスタム HTML（自由に書いたタグ）",
  img: "カスタム画像タグ",
};

export async function GtmPanel() {
  const gtm = await getGtm();
  if (!gtm.ok) return <SetupGuide section={gtm} service="gtm" />;
  const d = gtm.data;
  return (
    <div className="admin-stack">
      <section className="admin-summary">
        <p className="admin-summary__text">
          タグ マネージャーは、アクセス計測や広告の「タグ」（計測用の小さなプログラム）をまとめて配る仕組みです。
          ここで<strong>公開中のタグ</strong>が、サイトの全ページで動いています。アクセス数などの数字は「アクセス状況」タブで見られます。
        </p>
      </section>
      <div className="admin-kpis">
        <Kpi label="コンテナ" value={d.containerId} help="サイトに埋め込んでいるタグ マネージャーの ID です。" />
        <Kpi label="公開中のバージョン" value={d.versionName || `バージョン ${d.versionId}`} help="いまサイトで動いている設定の名前です。" />
        <Kpi label="最後に公開した日時" value={d.publishedAt ? dateTime(d.publishedAt) : "—"} help="タグ マネージャーで最後に「公開」を押した日時です。" />
        <Kpi label="動いているタグの数" value={`${d.tags.filter((t) => !t.paused).length}個`} help="一時停止しているタグは数えていません。" />
      </div>
      <Card title="公開中のタグ" help="身に覚えのないタグがあれば、管理担当者に確認してください。">
        <table className="admin-table">
          <thead>
            <tr>
              <th>タグの名前</th>
              <th>種類</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {d.tags.map((t) => (
              <tr key={t.name}>
                <td>{t.name}</td>
                <td>{TAG_TYPES[t.type] ?? t.type}</td>
                <td>{t.paused ? "一時停止中" : "動作中"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {fetched(gtm.fetchedAt)}
    </div>
  );
}

// ---------- お問い合わせ ----------

const FORM_NAMES = { employers: "企業担当者様", seekers: "お仕事をお探しの方" } as const;
const FILTERS = [
  ["", "すべて"],
  ["open", "未対応"],
  ["employers", "企業担当者様"],
  ["seekers", "お仕事をお探しの方"],
] as const;

export function InquiriesPanel({ inquiries, filter }: { inquiries: InquiryRow[] | null; filter?: string }) {
  if (!inquiries) return <div className="admin-alert is-ng">お問い合わせを読み込めませんでした。時間をおいて開き直してください。</div>;
  const shown = inquiries.filter((i) => (filter === "open" ? !i.handled : filter === "employers" || filter === "seekers" ? i.form === filter : true));
  return (
    <div className="admin-stack">
      <section className="admin-summary">
        <p className="admin-summary__text">
          ホームページのお問い合わせフォームから届いた内容です（担当者宛てのメールと同じ内容）。対応が終わったら「対応済み」にチェックを入れてください。
        </p>
      </section>
      <nav className="admin-filters" aria-label="絞り込み">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={`/admin/?tab=inquiries${key ? `&filter=${key}` : ""}`} className={`admin-filter${(filter ?? "") === key ? " is-active" : ""}`}>
            {label}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="admin-empty">表示するお問い合わせはありません。</p>
      ) : (
        <ul className="admin-inquiries">
          {shown.map((i) => (
            <li key={i.id} className={`admin-inquiry${i.handled ? " is-handled" : ""}`}>
              <details>
                <summary>
                  <span className="admin-inquiry__date">{dateTime(i.created_at)}</span>
                  <span className={`admin-tag admin-tag--${i.form}`}>{FORM_NAMES[i.form] ?? i.form}</span>
                  <span className="admin-inquiry__who">
                    {i.company ? `${i.company}　` : ""}
                    {i.name} 様
                  </span>
                  <span className="admin-inquiry__excerpt">{(i.message ?? "").slice(0, 60)}</span>
                </summary>
                <dl className="admin-inquiry__body">
                  {(
                    [
                      ["会社名", i.company],
                      ["お名前", i.name],
                      ["ふりがな", i.kana],
                      ["メール", i.email],
                      ["電話番号", i.tel],
                      ["所在地", i.address],
                      ["お問い合わせ内容", i.inquiry_type],
                      ["性別", i.gender],
                      ["希望職種", i.job],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{k === "メール" ? <a href={`mailto:${v}`}>{v}</a> : k === "電話番号" ? <a href={`tel:${String(v).replace(/[^\d+]/g, "")}`}>{v}</a> : v}</dd>
                      </div>
                    ))}
                  <div className="admin-inquiry__message">
                    <dt>本文</dt>
                    <dd>{i.message}</dd>
                  </div>
                </dl>
              </details>
              <InquiryHandledToggle id={i.id} handled={i.handled} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
