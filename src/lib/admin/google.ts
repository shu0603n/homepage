import { importPKCS8, SignJWT } from "jose";
import { SITE } from "@/lib/site";

// 管理ページに出す Google のデータ（GA4・Search Console・タグ マネージャー）。
// Google Cloud の「サービス アカウント」（ロボット用のアカウント）で読み取り専用で取得する。
// 環境変数（Amplify コンソールで設定）：
//   GOOGLE_SA_EMAIL  サービス アカウントのメールアドレス（JSON キーの client_email）
//   GOOGLE_SA_KEY    秘密鍵（JSON キーの private_key。"-----BEGIN PRIVATE KEY-----\n..." をそのまま 1 行で）
//   GA4_PROPERTY_ID  GA4 のプロパティ ID（数字。GA4 の「管理 > プロパティの詳細」に出る）
// サービス アカウントには、GA4（閲覧者）・Search Console（制限付き）・タグ マネージャー（読み取り）の権限を付けておく

export const SEARCH_CONSOLE_SITE = "sc-domain:emorislink.co.jp";
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/tagmanager.readonly",
].join(" ");
const CACHE_MS = 10 * 60_000;

export type Section<T> = { ok: true; data: T; fetchedAt: number } | { ok: false; reason: "not_configured" | "no_access" | "error"; message: string };

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_KEY);
}

class GoogleApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const email = process.env.GOOGLE_SA_EMAIL!;
  const key = await importPKCS8(process.env.GOOGLE_SA_KEY!.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) throw new GoogleApiError(res.status, `認証に失敗しました（${json.error_description ?? res.status}）`);
  token = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new GoogleApiError(res.status, json.error?.message ?? String(res.status));
  return json;
}

const cache = new Map<string, { at: number; value: Section<unknown> }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<Section<T>> {
  if (!googleConfigured()) return { ok: false, reason: "not_configured", message: "Google との接続がまだ設定されていません。" };
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as Section<T>;
  let value: Section<T>;
  try {
    value = { ok: true, data: await load(), fetchedAt: Date.now() };
  } catch (error) {
    console.error(`google ${key} failed:`, error);
    const status = error instanceof GoogleApiError ? error.status : 0;
    value =
      status === 403 || status === 404
        ? { ok: false, reason: "no_access", message: "Google のサービス アカウントに、閲覧の権限が付いていない可能性があります。" }
        : { ok: false, reason: "error", message: error instanceof Error ? error.message : "取得に失敗しました。" };
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ---------- 日付 ----------

const DAY = 86_400_000;
function ymd(d: Date): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10); // 日本時間の日付
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

// ---------- GA4 ----------

export type Ga4Data = {
  period: { start: string; end: string };
  totals: { users: number; newUsers: number; sessions: number; views: number };
  previous: { users: number; newUsers: number; sessions: number; views: number };
  daily: { date: string; users: number }[];
  pages: { path: string; views: number }[];
  channels: { name: string; sessions: number }[];
  devices: { name: string; users: number }[];
  registrations: { current: number; previous: number };
  realtimeUsers: number;
  traffic: Ga4Traffic | null; // 取得に失敗したら null（ほかの数字はそのまま出す）
};

// アクセス分析（どこから来て、いつ来て、登録につながったか）。「アクセス」は訪問の回数（セッション数）。
// 来た元は URL の utm_source / utm_medium / utm_campaign（広告や SNS のリンクに付けている印）で分ける。印のない訪問は GA4 が判断した値
// （google / organic など）になり、それも分からない訪問は「直接・不明」。
// 「登録」はスタッフ登録フォームの申し込み（送信後に /register/?sent=1 が表示された回数）。その訪問の来た元に結び付けて数える
export type TrafficRow = { name: string; sessions: number; signups: number };
export type Ga4Traffic = {
  sources: string[]; // 日別グラフの色分け（多い順。最後が「直接・不明」）
  daily: { date: string; values: number[] }[]; // values は sources と同じ順
  mediums: TrafficRow[];
  campaigns: TrafficRow[];
  referrers: { name: string; sessions: number }[];
  hours: number[]; // 0〜23時
  weekdays: number[]; // 日〜土
  signupsTotal: number;
};

export const NATURAL = "直接・不明"; // 来た元が分からない訪問（GA4 の (direct)・(none)・(not set)）
const SIGNUP_PATH = "/register/?sent=";

type ReportRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: ReportRow[] };

const num = (v: string | undefined) => Number(v ?? 0) || 0;

export function getGa4(): Promise<Section<Ga4Data>> {
  return cached("ga4", async () => {
    const property = process.env.GA4_PROPERTY_ID;
    if (!property) throw new Error("GA4 のプロパティ ID（GA4_PROPERTY_ID）が設定されていません。");
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${property}`;
    const current = { startDate: "28daysAgo", endDate: "yesterday", name: "current" };
    const previous = { startDate: "56daysAgo", endDate: "29daysAgo", name: "previous" };
    const desc = (metric: string) => [{ metric: { metricName: metric }, desc: true }];

    // 3つの問い合わせは同時に送る（順番に待つより速い）
    const [batch, reg, realtime, traffic] = await Promise.all([
      call<{ reports: Report[] }>(`${base}:batchRunReports`, {
      requests: [
        { dateRanges: [current, previous], metrics: [{ name: "activeUsers" }, { name: "newUsers" }, { name: "sessions" }, { name: "screenPageViews" }] },
        { dateRanges: [current], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
        { dateRanges: [current], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: desc("screenPageViews"), limit: 10 },
        { dateRanges: [current], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: desc("sessions") },
        { dateRanges: [current], dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }], orderBys: desc("activeUsers") },
      ],
      }),
      // スタッフ登録の完了（完了ページ /register/complete/ が表示された回数）
      call<Report>(`${base}:runReport`, {
        dateRanges: [current, previous],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/register/complete" } } },
      }),
      call<Report>(`${base}:runRealtimeReport`, { metrics: [{ name: "activeUsers" }] }),
      getTraffic(base, current).catch((error) => {
        console.error("ga4 traffic failed:", error);
        return null;
      }),
    ]);
    const [totalsR, dailyR, pagesR, channelsR, devicesR] = batch.reports;

    // 期間（dateRange）ごとの合計。ディメンションの最後に dateRange の名前が入る
    const byRange = (rows: ReportRow[] | undefined, name: string) => rows?.find((r) => r.dimensionValues?.some((d) => d.value === name));
    const totalsOf = (name: string) => {
      const m = byRange(totalsR.rows, name)?.metricValues;
      return { users: num(m?.[0]?.value), newUsers: num(m?.[1]?.value), sessions: num(m?.[2]?.value), views: num(m?.[3]?.value) };
    };
    const regOf = (name: string) =>
      (reg.rows ?? []).filter((r) => r.dimensionValues?.some((d) => d.value === name)).reduce((s, r) => s + num(r.metricValues?.[0]?.value), 0);

    return {
      period: { start: ymd(daysAgo(28)), end: ymd(daysAgo(1)) },
      totals: totalsOf("current"),
      previous: totalsOf("previous"),
      daily: (dailyR.rows ?? []).map((r) => {
        const d = r.dimensionValues?.[0]?.value ?? "";
        return { date: `${d.slice(4, 6)}/${d.slice(6, 8)}`, users: num(r.metricValues?.[0]?.value) };
      }),
      pages: (pagesR.rows ?? []).map((r) => ({ path: r.dimensionValues?.[0]?.value ?? "", views: num(r.metricValues?.[0]?.value) })),
      channels: (channelsR.rows ?? []).map((r) => ({ name: r.dimensionValues?.[0]?.value ?? "", sessions: num(r.metricValues?.[0]?.value) })),
      devices: (devicesR.rows ?? []).map((r) => ({ name: r.dimensionValues?.[0]?.value ?? "", users: num(r.metricValues?.[0]?.value) })),
      registrations: { current: regOf("current"), previous: regOf("previous") },
      realtimeUsers: num(realtime.rows?.[0]?.metricValues?.[0]?.value),
      traffic,
    };
  });
}

async function getTraffic(base: string, range: { startDate: string; endDate: string; name: string }): Promise<Ga4Traffic> {
  const dr = [{ startDate: range.startDate, endDate: range.endDate }];
  const sessions = [{ name: "sessions" }];
  const desc = [{ metric: { metricName: "sessions" }, desc: true }];
  const [a, b] = await Promise.all([
    call<{ reports: Report[] }>(`${base}:batchRunReports`, {
      requests: [
        { dateRanges: dr, dimensions: [{ name: "date" }, { name: "sessionManualSource" }], metrics: sessions, limit: 2000 },
        { dateRanges: dr, dimensions: [{ name: "sessionManualMedium" }], metrics: sessions, orderBys: desc, limit: 20 },
        { dateRanges: dr, dimensions: [{ name: "sessionManualCampaignName" }], metrics: sessions, orderBys: desc, limit: 20 },
        { dateRanges: dr, dimensions: [{ name: "sessionSource" }], metrics: sessions, orderBys: desc, limit: 10 },
        { dateRanges: dr, dimensions: [{ name: "hour" }], metrics: sessions },
      ],
    }),
    call<{ reports: Report[] }>(`${base}:batchRunReports`, {
      requests: [
        { dateRanges: dr, dimensions: [{ name: "dayOfWeek" }], metrics: sessions },
        {
          dateRanges: dr,
          dimensions: [{ name: "sessionManualMedium" }, { name: "sessionManualCampaignName" }],
          metrics: [{ name: "screenPageViews" }],
          dimensionFilter: { filter: { fieldName: "pagePathPlusQueryString", stringFilter: { matchType: "BEGINS_WITH", value: SIGNUP_PATH } } },
        },
      ],
    }),
  ]);
  const [dailyR, mediumR, campaignR, sourceR, hourR] = a.reports;
  const [weekR, signupR] = b.reports;
  const dim = (r: ReportRow, i = 0) => r.dimensionValues?.[i]?.value ?? "";
  const val = (r: ReportRow) => num(r.metricValues?.[0]?.value);
  const label = (v: string) => (!v || v === "(not set)" || v === "(none)" || v === "(direct)" ? NATURAL : v);

  // 日別×来た元：多い順に4つまで色分けし、残りは「その他」、来た元が分からない訪問は「直接・不明」
  const totals = new Map<string, number>();
  for (const r of dailyR.rows ?? []) totals.set(label(dim(r, 1)), (totals.get(label(dim(r, 1))) ?? 0) + val(r));
  const top = [...totals].filter(([n]) => n !== NATURAL).sort((x, y) => y[1] - x[1]).map(([n]) => n);
  const sources = [...top.slice(0, 4), ...(top.length > 4 ? ["その他"] : []), ...(totals.has(NATURAL) ? [NATURAL] : [])];
  const days = new Map<string, number[]>();
  for (let i = 28; i >= 1; i--) {
    const d = new Date(Date.now() - i * DAY + 9 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");
    days.set(d, sources.map(() => 0));
  }
  for (const r of dailyR.rows ?? []) {
    const row = days.get(dim(r));
    if (!row) continue;
    const n = label(dim(r, 1));
    const idx = sources.indexOf(n) >= 0 ? sources.indexOf(n) : sources.indexOf("その他");
    if (idx >= 0) row[idx] += val(r);
  }

  // 登録（申し込み）を、メディア・キャンペーンごとに数える
  const signupBy = (i: number) => {
    const m = new Map<string, number>();
    for (const r of signupR.rows ?? []) m.set(label(dim(r, i)), (m.get(label(dim(r, i))) ?? 0) + val(r));
    return m;
  };
  const sm = signupBy(0);
  const sc = signupBy(1);
  const rows = (rep: Report, signups: Map<string, number>, dropNatural: boolean): TrafficRow[] => {
    const m = new Map<string, number>();
    for (const r of rep.rows ?? []) m.set(label(dim(r)), (m.get(label(dim(r))) ?? 0) + val(r));
    return [...m]
      // キャンペーン別では、印のない訪問（(organic)・(referral) などかっこ付きの値）を除く
      .filter(([n]) => !(dropNatural && (n === NATURAL || /^\(.*\)$/.test(n))))
      .map(([name, s]) => ({ name, sessions: s, signups: signups.get(name) ?? 0 }))
      .sort((x, y) => y.sessions - x.sessions);
  };

  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of hourR.rows ?? []) {
    const h = Number(dim(r));
    if (h >= 0 && h < 24) hours[h] += val(r);
  }
  const weekdays = Array.from({ length: 7 }, () => 0);
  for (const r of weekR.rows ?? []) {
    const w = Number(dim(r));
    if (w >= 0 && w < 7) weekdays[w] += val(r);
  }

  return {
    sources,
    daily: [...days].map(([d, values]) => ({ date: `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}`, values })),
    mediums: rows(mediumR, sm, false),
    campaigns: rows(campaignR, sc, true),
    referrers: (sourceR.rows ?? []).map((r) => ({ name: dim(r) === "(direct)" ? "直接・不明" : dim(r), sessions: val(r) })),
    hours,
    weekdays,
    signupsTotal: [...sm.values()].reduce((x, y) => x + y, 0),
  };
}

// ---------- Search Console ----------

export type ScData = {
  period: { start: string; end: string };
  totals: ScTotals;
  previous: ScTotals;
  queries: { query: string; clicks: number; impressions: number; position: number }[];
  pages: { page: string; clicks: number; impressions: number }[];
};
type ScTotals = { clicks: number; impressions: number; ctr: number; position: number };
type ScRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

export function getSearchConsole(): Promise<Section<ScData>> {
  return cached("sc", async () => {
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_SITE)}/searchAnalytics/query`;
    // Search Console のデータは 2〜3 日遅れて集計されるため、3 日前までの 28 日間を見る
    const end = daysAgo(3);
    const start = new Date(end.getTime() - 27 * DAY);
    const prevEnd = new Date(start.getTime() - DAY);
    const prevStart = new Date(prevEnd.getTime() - 27 * DAY);
    const range = { startDate: ymd(start), endDate: ymd(end) };
    const q = <T,>(body: object) => call<{ rows?: T[] }>(url, body);

    const [cur, prev, queries, pages] = await Promise.all([
      q<ScRow>({ ...range }),
      q<ScRow>({ startDate: ymd(prevStart), endDate: ymd(prevEnd) }),
      q<ScRow>({ ...range, dimensions: ["query"], rowLimit: 10 }),
      q<ScRow>({ ...range, dimensions: ["page"], rowLimit: 10 }),
    ]);
    const totals = (r?: ScRow): ScTotals => ({ clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0, ctr: r?.ctr ?? 0, position: r?.position ?? 0 });
    return {
      period: { start: range.startDate, end: range.endDate },
      totals: totals(cur.rows?.[0]),
      previous: totals(prev.rows?.[0]),
      queries: (queries.rows ?? []).map((r) => ({ query: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions, position: r.position })),
      pages: (pages.rows ?? []).map((r) => ({ page: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions })),
    };
  });
}

// ---------- タグ マネージャー ----------

export type GtmData = {
  containerId: string;
  versionName: string;
  versionId: string;
  publishedAt: number | null;
  tags: { name: string; type: string; paused: boolean }[];
};
type GtmContainer = { path: string; publicId: string };
type GtmVersion = { name?: string; containerVersionId?: string; fingerprint?: string; tag?: { name: string; type: string; paused?: boolean }[] };

// コンテナの場所（accounts/…/containers/…）は変わらないので、一度探したら1日覚えておく（毎回探すと3往復かかる）
let gtmContainer: { value: GtmContainer; at: number } | null = null;

async function findGtmContainer(api: string): Promise<GtmContainer> {
  if (gtmContainer && Date.now() - gtmContainer.at < 86_400_000) return gtmContainer.value;
  const { account = [] } = await call<{ account?: { path: string }[] }>(`${api}/accounts`);
  const lists = await Promise.all(account.map((a) => call<{ container?: GtmContainer[] }>(`${api}/${a.path}/containers`)));
  const found = lists.flatMap((l) => l.container ?? []).find((c) => c.publicId === SITE.gtmContainerId);
  if (!found) throw new GoogleApiError(404, "コンテナが見つかりません");
  gtmContainer = { value: found, at: Date.now() };
  return found;
}

export function getGtm(): Promise<Section<GtmData>> {
  return cached("gtm", async () => {
    const api = "https://tagmanager.googleapis.com/tagmanager/v2";
    const container = await findGtmContainer(api);
    const live = await call<GtmVersion>(`${api}/${container.path}/versions:live`);
    return {
      containerId: container.publicId,
      versionName: live.name ?? "",
      versionId: live.containerVersionId ?? "",
      publishedAt: live.fingerprint ? Number(live.fingerprint) : null, // fingerprint は公開した時刻（ミリ秒）
      tags: (live.tag ?? []).map((t) => ({ name: t.name, type: t.type, paused: t.paused === true })),
    };
  });
}
