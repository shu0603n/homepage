import { beforeEach, describe, expect, it, vi } from "vitest";

// スタッフ登録と LINE の連携（/api/auth/line/link/）を、LINE の検証と DB を差し替えて試す

vi.mock("@/lib/auth/line", () => ({
  isLineLoginEnabled: () => true,
  verifyLineIdToken: async (t: string) => (t.startsWith("ok:") ? { userId: t.slice(3), name: "テスト" } : null),
}));

type Staff = { id: number; name: string; mail: string; line_user_id: string | null; staff_status: string | null };
const rows: Staff[] = [];
vi.mock("@/lib/prisma", () => ({
  prisma: {
    staff: {
      findFirst: async ({ where }: { where: { line_user_id?: string } }) => rows.find((s) => s.line_user_id === where.line_user_id) ?? null,
      findUnique: async ({ where }: { where: { id: number } }) => rows.find((s) => s.id === where.id) ?? null,
      updateMany: async ({ where, data }: { where: { id: number }; data: { line_user_id: string } }) => {
        const s = rows.find((r) => r.id === where.id);
        if (!s || s.line_user_id) return { count: 0 };
        s.line_user_id = data.line_user_id;
        return { count: 1 };
      },
    },
  },
}));

process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
process.env.NEXT_PUBLIC_LIFF_ID = "1234-abcd";
const { lineFriendUrl, readLineLinkTicket } = await import("@/lib/line-friend");
const { POST } = await import("./route");

const ORIGIN = "https://www.emorislink.co.jp";
const call = async (body: unknown) => {
  const res = await POST(new Request(`${ORIGIN}/api/auth/line/link/`, { method: "POST", headers: { Origin: ORIGIN, Host: "www.emorislink.co.jp", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as { ok: boolean; result?: string; message?: string } };
};
const ticketOf = async (id: number, mail: string, source: "web" | "visit" = "visit") => new URL(await lineFriendUrl(id, mail, source), ORIGIN).searchParams.get("t");

beforeEach(() => {
  rows.length = 0;
  rows.push({ id: 207492, name: "吉野 敦子", mail: "atsuko@example.com", line_user_id: null, staff_status: "新規" });
  rows.push({ id: 2, name: "佐藤", mail: "sato@example.com", line_user_id: "U-sato", staff_status: "新規" });
});

describe("スタッフ登録と LINE の連携", () => {
  it("来社登録のボタンはこのサイトの連携ページを指し、引換券からスタッフが分かる", async () => {
    const url = await lineFriendUrl(207492, "Atsuko@Example.com", "visit");
    expect(url.startsWith("/jobs/line-link/?t=")).toBe(true);
    expect(await readLineLinkTicket(new URL(url, ORIGIN).searchParams.get("t"))).toEqual({ staffId: 207492, mail: "atsuko@example.com" });
  });

  it("LINE で確かめた本人の LINE を、そのスタッフに連携する", async () => {
    const r = await call({ ticket: await ticketOf(207492, "atsuko@example.com"), idToken: "ok:U-yoshino" });
    expect(r.body).toMatchObject({ ok: true, result: "linked" });
    expect(rows[0].line_user_id).toBe("U-yoshino");
    // もう一度押しても「連携済み」
    expect((await call({ ticket: await ticketOf(207492, "atsuko@example.com"), idToken: "ok:U-yoshino" })).body.result).toBe("already");
  });

  it("ほかのスタッフの LINE・別の LINE と連携済みのスタッフは上書きしない", async () => {
    expect((await call({ ticket: await ticketOf(207492, "atsuko@example.com"), idToken: "ok:U-sato" })).body.result).toBe("taken");
    expect(rows[0].line_user_id).toBeNull();
    expect((await call({ ticket: await ticketOf(2, "sato@example.com"), idToken: "ok:U-new" })).body.result).toBe("other_line");
    expect(rows[1].line_user_id).toBe("U-sato");
  });

  it("引換券が不正・LINE の認証失敗・メールが変わったスタッフは連携しない", async () => {
    expect((await call({ ticket: "bad", idToken: "ok:U-x" })).status).toBe(400);
    expect((await call({ ticket: await ticketOf(207492, "atsuko@example.com"), idToken: "ng" })).status).toBe(401);
    expect((await call({ ticket: await ticketOf(207492, "other@example.com"), idToken: "ok:U-x" })).status).toBe(400);
    expect(rows[0].line_user_id).toBeNull();
  });

  it("NG のスタッフは連携しない", async () => {
    rows[0].staff_status = "NG";
    expect((await call({ ticket: await ticketOf(207492, "atsuko@example.com"), idToken: "ok:U-x" })).status).toBe(400);
  });
});
