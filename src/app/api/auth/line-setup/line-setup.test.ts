import { beforeEach, describe, expect, it, vi } from "vitest";

// LINE から来て未連携の方の「確認コードでパスワード設定＋LINE 連携」を、メール・Cognito・DB を差し替えて通しで試す

const jar = new Map<string, string>(); // ブラウザの Cookie の代わり
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (arg: string | { name: string }) => void jar.delete(typeof arg === "string" ? arg : arg.name),
  }),
}));

const sent: { to: string; text: string }[] = [];
vi.mock("@/lib/mail", () => ({ isMailConfigured: () => true, sendMail: async (m: { to: string; text: string }) => void sent.push(m) }));

const cognito = new Map<string, string>(); // メール → パスワード
vi.mock("@/lib/auth/cognito", () => ({
  CognitoAuthError: class extends Error {},
  userLastModified: async (mail: string) => (cognito.has(mail) ? new Date() : null),
  createUser: async (mail: string, pw: string) => void cognito.set(mail, pw),
  setUserPassword: async (mail: string, pw: string) => void cognito.set(mail, pw),
}));

type Staff = { id: number; name: string; mail: string; line_user_id: string | null; staff_status: string | null };
const staffRows: Staff[] = [];
vi.mock("@/lib/prisma", () => ({
  prisma: {
    staff: {
      findFirst: async ({ where }: { where: { line_user_id?: string; mail?: { equals: string } } }) => {
        if (where.line_user_id) return staffRows.find((s) => s.line_user_id === where.line_user_id) ?? null;
        const mail = where.mail?.equals.toLowerCase();
        return staffRows.filter((s) => s.mail.toLowerCase() === mail).sort((a, b) => b.id - a.id)[0] ?? null;
      },
      findUnique: async ({ where }: { where: { id: number } }) => staffRows.find((s) => s.id === where.id) ?? null,
      updateMany: async ({ where, data }: { where: { id: number }; data: { line_user_id: string } }) => {
        const s = staffRows.find((r) => r.id === where.id);
        if (!s || s.line_user_id) return { count: 0 };
        s.line_user_id = data.line_user_id;
        return { count: 1 };
      },
    },
  },
}));

process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
const { makeLinePendingToken, LINE_PENDING_COOKIE } = await import("@/lib/auth/line-pending");
const start = (await import("./route")).POST;
const finish = (await import("./finish/route")).POST;

const ORIGIN = "https://www.emorislink.co.jp";
const req = (path: string, body: unknown) =>
  new Request(`${ORIGIN}${path}`, { method: "POST", headers: { Origin: ORIGIN, Host: "www.emorislink.co.jp", "Content-Type": "application/json" }, body: JSON.stringify(body) });
const call = async (fn: (r: Request) => Promise<Response>, path: string, body: unknown) => {
  const res = await fn(req(path, body));
  return { status: res.status, body: (await res.json()) as { ok: boolean; message?: string; lineLink?: string } };
};
const codeOf = (i = -1) => /確認コード：(\d{6})/.exec(sent.at(i)!.text)![1];

let mailSeq = 0;
beforeEach(async () => {
  jar.clear();
  sent.length = 0;
  cognito.clear();
  staffRows.length = 0;
  mailSeq++;
  staffRows.push({ id: 1, name: "山田 太郎", mail: `taro${mailSeq}@example.com`, line_user_id: null, staff_status: "新規" });
  staffRows.push({ id: 2, name: "佐藤 花子", mail: `hanako${mailSeq}@example.com`, line_user_id: "U-hanako", staff_status: "新規" });
  jar.set(LINE_PENDING_COOKIE, await makeLinePendingToken("U-taro"));
});

describe("確認コードでパスワード設定＋LINE 連携", () => {
  it("コードを送り、正しいコードとパスワードで設定・連携・ログインまで済む", async () => {
    const mail = `taro${mailSeq}@example.com`;
    expect((await call(start, "/api/auth/line-setup/", { email: mail })).body.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(mail);
    const r = await call(finish, "/api/auth/line-setup/finish/", { code: codeOf(), password: "Abcdefg1" });
    expect(r.body).toEqual({ ok: true, lineLink: "linked" });
    expect(cognito.get(mail)).toBe("Abcdefg1");
    expect(staffRows[0].line_user_id).toBe("U-taro");
    expect(jar.has("emoris_session")).toBe(true);
    expect(jar.has(LINE_PENDING_COOKIE)).toBe(false);
    // 同じコードはもう使えない
    expect((await call(finish, "/api/auth/line-setup/finish/", { code: codeOf(), password: "Abcdefg1" })).body.ok).toBe(false);
  });

  it("LINE で本人確認していない（Cookie がない）と始められない", async () => {
    jar.clear();
    const r = await call(start, "/api/auth/line-setup/", { email: `taro${mailSeq}@example.com` });
    expect(r.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("登録がないアドレスでも同じ応答で、メールは送らず、どのコードも通らない", async () => {
    expect((await call(start, "/api/auth/line-setup/", { email: `nobody${mailSeq}@example.com` })).body.ok).toBe(true);
    expect(sent).toHaveLength(0);
    const r = await call(finish, "/api/auth/line-setup/finish/", { code: "123456", password: "Abcdefg1" });
    expect(r.body.ok).toBe(false);
    expect(cognito.size).toBe(0);
  });

  it("コードを間違えると設定されず、5回でそのコードは使えなくなる", async () => {
    await call(start, "/api/auth/line-setup/", { email: `taro${mailSeq}@example.com` });
    const right = codeOf();
    const wrong = right === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await call(finish, "/api/auth/line-setup/finish/", { code: wrong, password: "Abcdefg1" })).body.ok).toBe(false);
    expect((await call(finish, "/api/auth/line-setup/finish/", { code: right, password: "Abcdefg1" })).body.ok).toBe(false);
    expect(cognito.size).toBe(0);
    expect(staffRows[0].line_user_id).toBeNull();
  });

  it("弱いパスワードは受け付けない（コードも消費しない）", async () => {
    await call(start, "/api/auth/line-setup/", { email: `taro${mailSeq}@example.com` });
    expect((await call(finish, "/api/auth/line-setup/finish/", { code: codeOf(), password: "abc" })).status).toBe(400);
    expect((await call(finish, "/api/auth/line-setup/finish/", { code: codeOf(), password: "Abcdefg1" })).body.ok).toBe(true);
  });

  it("既に別の LINE と連携しているスタッフは、パスワードは設定するが LINE は上書きしない", async () => {
    await call(start, "/api/auth/line-setup/", { email: `hanako${mailSeq}@example.com` });
    const r = await call(finish, "/api/auth/line-setup/finish/", { code: codeOf(), password: "Abcdefg1" });
    expect(r.body).toEqual({ ok: true, lineLink: "other_line" });
    expect(staffRows[1].line_user_id).toBe("U-hanako");
  });

  it("NG/BL のスタッフにはコードを送らない", async () => {
    staffRows[0].staff_status = "NG";
    await call(start, "/api/auth/line-setup/", { email: `taro${mailSeq}@example.com` });
    expect(sent).toHaveLength(0);
  });
});
