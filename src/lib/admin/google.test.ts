import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Google の API の応答をまねて、管理ページ用のデータに正しく変換できるかを確かめる（実際の Google には接続しない）
const row = (dims: string[], mets: (number | string)[]) => ({ dimensionValues: dims.map((value) => ({ value })), metricValues: mets.map((v) => ({ value: String(v) })) });

beforeAll(async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  process.env.GOOGLE_SA_EMAIL = "robot@example.iam.gserviceaccount.com";
  process.env.GOOGLE_SA_KEY = (await exportPKCS8(privateKey)).replace(/\n/g, "\\n"); // Amplify には 1 行（\n の文字）で入れる
  process.env.GA4_PROPERTY_ID = "123456";
});
afterEach(() => vi.unstubAllGlobals());

function mockFetch(handler: (url: string, body: Record<string, unknown> | undefined) => unknown, status = 200) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return new Response(JSON.stringify(handler(url, body)), { status });
  });
  return calls;
}

describe("GA4", () => {
  it("合計・前期間・日ごと・ページ・流入元・端末・登録完了・リアルタイムを取り出す", async () => {
    vi.resetModules();
    mockFetch((url, body) => {
      if (url.endsWith(":batchRunReports"))
        return {
          reports: [
            { rows: [row(["current"], [120, 80, 150, 400]), row(["previous"], [100, 70, 130, 350])] },
            { rows: [row(["20261101"], [5]), row(["20261102"], [7])] },
            { rows: [row(["/"], [200]), row(["/register/"], [50])] },
            { rows: [row(["Organic Search"], [90]), row(["Direct"], [40])] },
            { rows: [row(["mobile"], [90]), row(["desktop"], [30])] },
          ],
        };
      if (url.endsWith(":runReport")) {
        expect(JSON.stringify(body)).toContain("/register/complete");
        return { rows: [row(["/register/complete/", "current"], [6]), row(["/register/complete/", "previous"], [4])] };
      }
      if (url.endsWith(":runRealtimeReport")) return { rows: [row([], [3])] };
      throw new Error(url);
    });
    const { getGa4 } = await import("@/lib/admin/google");
    const r = await getGa4();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.totals).toEqual({ users: 120, newUsers: 80, sessions: 150, views: 400 });
    expect(r.data.previous.users).toBe(100);
    expect(r.data.daily).toEqual([{ date: "11/01", users: 5 }, { date: "11/02", users: 7 }]);
    expect(r.data.pages[1]).toEqual({ path: "/register/", views: 50 });
    expect(r.data.channels[0].name).toBe("Organic Search");
    expect(r.data.registrations).toEqual({ current: 6, previous: 4 });
    expect(r.data.realtimeUsers).toBe(3);
  });

  it("権限がないとき（403）は「権限がない」と分かる結果にする", async () => {
    vi.resetModules();
    mockFetch(() => ({ error: { message: "User does not have sufficient permissions" } }), 403);
    const { getGa4 } = await import("@/lib/admin/google");
    const r = await getGa4();
    expect(r).toMatchObject({ ok: false, reason: "no_access" });
  });
});

describe("Search Console・タグ マネージャー", () => {
  it("検索の合計・検索語・ページを取り出す", async () => {
    vi.resetModules();
    mockFetch((url, body) => {
      const dims = (body?.dimensions as string[] | undefined)?.[0];
      if (!dims) return { rows: [{ clicks: 10, impressions: 500, ctr: 0.02, position: 12.3 }] };
      if (dims === "query") return { rows: [{ keys: ["エモリスリンク"], clicks: 8, impressions: 20, ctr: 0.4, position: 1.1 }] };
      return { rows: [{ keys: ["https://www.emorislink.co.jp/"], clicks: 9, impressions: 300, ctr: 0.03, position: 5 }] };
    });
    const { getSearchConsole } = await import("@/lib/admin/google");
    const r = await getSearchConsole();
    expect(r.ok && r.data.totals.clicks).toBe(10);
    expect(r.ok && r.data.queries[0].query).toBe("エモリスリンク");
    expect(r.ok && r.data.pages[0].page).toBe("https://www.emorislink.co.jp/");
  });

  it("公開中のコンテナを ID（GTM-…）で探し、タグの一覧を出す", async () => {
    vi.resetModules();
    const calls = mockFetch((url) => {
      if (url.endsWith("/accounts")) return { account: [{ path: "accounts/1" }] };
      if (url.endsWith("/containers")) return { container: [{ path: "accounts/1/containers/9", publicId: "GTM-P7Z2LF3T" }] };
      if (url.endsWith("versions:live")) return { name: "GA4設定", containerVersionId: "2", fingerprint: "1795000000000", tag: [{ name: "Google Analytics", type: "googtag" }] };
      throw new Error(url);
    });
    const { getGtm } = await import("@/lib/admin/google");
    const r = await getGtm();
    expect(r.ok && r.data).toMatchObject({ containerId: "GTM-P7Z2LF3T", versionName: "GA4設定", tags: [{ name: "Google Analytics", type: "googtag", paused: false }] });
    expect(calls.some((u) => u.includes("accounts/1/containers/9/versions:live"))).toBe(true);
  });
});
