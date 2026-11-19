import { beforeEach, describe, expect, it, vi } from "vitest";

// LINE から来て未連携の方の「メールのリンクでパスワード設定＋LINE 連携」を、メール・Cognito・DB を差し替えて通しで試す

const jar = new Map<string, string>(); // ブラウザの Cookie の代わり
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (arg: string | { name: string }) => void jar.delete(typeof arg === "string" ? arg : arg.name),
  }),
}));

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/mail", () => ({ isMailConfigured: () => true, sendMail: async (m: { to: string; subject: string; text: string }) => void sent.push(m) }));

const cognito = new Map<string, { pw: string; at: Date }>();
vi.mock("@/lib/auth/cognito", () => ({
  CognitoAuthError: class extends Error {},
  userLastModified: async (mail: string) => cognito.get(mail)?.at ?? null,
  createUser: async (mail: string, pw: string) => void cognito.set(mail, { pw, at: new Date(Date.now() + 1000) }),
  setUserPassword: async (mail: string, pw: string) => void cognito.set(mail, { pw, at: new Date(Date.now() + 1000) }),
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
const { readPasswordToken } = await import("@/lib/auth/password-link");
const start = (await import("./route")).POST;
const finish = (await import("./finish/route")).POST;

const ORIGIN = "https://www.emorislink.co.jp";
const req = (path: string, body: unknown) =>
  new Request(`${ORIGIN}${path}`, { method: "POST", headers: { Origin: ORIGIN, Host: "www.emorislink.co.jp", "Content-Type": "application/json" }, body: JSON.stringify(body) });
const call = async (fn: (r: Request) => Promise<Response>, path: string, body: unknown) => {
  const res = await fn(req(path, body));
  return { status: res.status, body: (await res.json()) as { ok: boolean; message?: string; lineLink?: string } };
};
const linkUrl = () => new URL(/https:\/\/\S+password-setup\/line\/\S+/.exec(sent.at(-1)!.text)![0]);
const tokenOf = () => linkUrl().searchParams.get("token")!;

let seq = 0;
let taro = "";
beforeEach(async () => {
  jar.clear();
  sent.length = 0;
  cognito.clear();
  staffRows.length = 0;
  seq++;
  taro = `taro${seq}@example.com`;
  staffRows.push({ id: 1, name: "山田 太郎", mail: taro, line_user_id: null, staff_status: "新規" });
  staffRows.push({ id: 2, name: "佐藤 花子", mail: `hanako${seq}@example.com`, line_user_id: "U-hanako", staff_status: "新規" });
  jar.set(LINE_PENDING_COOKIE, await makeLinePendingToken("U-taro", "たろう"));
});

describe("メールのリンクでパスワード設定＋LINE 連携", () => {
  it("メールにリンクが届き、リンクの画面でパスワードを決めると設定・連携・ログインまで済む", async () => {
    expect((await call(start, "/api/auth/line-setup/", { email: taro })).body.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(taro);
    expect(sent[0].text).toContain("表示名「たろう」");
    expect(linkUrl().origin + linkUrl().pathname).toBe(`${ORIGIN}/password-setup/line/`);
    const link = await readPasswordToken(tokenOf(), "line-setup");
    expect(link?.line).toEqual({ lineUserId: "U-taro", lineName: "たろう" });

    // リンクは LINE の外のブラウザで開かれる想定（LINE の Cookie はない）
    jar.clear();
    const r = await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf(), password: "Abcdefg1" });
    expect(r.body).toEqual({ ok: true, lineLink: "linked" });
    expect(cognito.get(taro)?.pw).toBe("Abcdefg1");
    expect(staffRows[0].line_user_id).toBe("U-taro");
    expect(jar.has("emoris_session")).toBe(true);
    // 同じリンクはもう使えない
    expect((await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf(), password: "Abcdefg1" })).body.ok).toBe(false);
  });

  it("LINE で本人確認していない（Cookie がない）と始められない", async () => {
    jar.clear();
    expect((await call(start, "/api/auth/line-setup/", { email: taro })).status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("登録がないアドレス・NG のスタッフには送らない（応答は同じ）", async () => {
    expect((await call(start, "/api/auth/line-setup/", { email: `nobody${seq}@example.com` })).body.ok).toBe(true);
    staffRows[0].staff_status = "NG";
    expect((await call(start, "/api/auth/line-setup/", { email: taro })).body.ok).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it("改ざんしたリンク・別の用途のリンクでは設定できない", async () => {
    await call(start, "/api/auth/line-setup/", { email: taro });
    expect((await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf().slice(0, -3) + "abc", password: "Abcdefg1" })).status).toBe(400);
    const { createPasswordLink } = await import("@/lib/auth/password-link");
    const activate = new URL(await createPasswordLink(req("/", {}), "activate", 1, taro)).searchParams.get("token");
    expect((await call(finish, "/api/auth/line-setup/finish/", { token: activate, password: "Abcdefg1" })).status).toBe(400);
    expect(cognito.size).toBe(0);
  });

  it("弱いパスワードは受け付けず、リンクはそのまま使える", async () => {
    await call(start, "/api/auth/line-setup/", { email: taro });
    expect((await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf(), password: "abc" })).status).toBe(400);
    expect((await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf(), password: "Abcdefg1" })).body.ok).toBe(true);
  });

  it("既に別の LINE と連携しているスタッフは、パスワードは設定するが LINE は上書きしない", async () => {
    await call(start, "/api/auth/line-setup/", { email: `hanako${seq}@example.com` });
    const r = await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf(), password: "Abcdefg1" });
    expect(r.body).toEqual({ ok: true, lineLink: "other_line" });
    expect(staffRows[1].line_user_id).toBe("U-hanako");
  });

  it("リンクを送ったあとにメールアドレスが変わったスタッフには使えない", async () => {
    await call(start, "/api/auth/line-setup/", { email: taro });
    staffRows[0].mail = "changed@example.com";
    expect((await call(finish, "/api/auth/line-setup/finish/", { token: tokenOf(), password: "Abcdefg1" })).status).toBe(400);
    expect(staffRows[0].line_user_id).toBeNull();
  });
});
