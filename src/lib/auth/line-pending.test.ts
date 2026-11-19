import { beforeEach, describe, expect, it, vi } from "vitest";

// スタッフ表の代わり（id → line_user_id）
const staff = new Map<number, string | null>();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    staff: {
      findFirst: async ({ where }: { where: { line_user_id: string } }) => {
        for (const [id, line] of staff) if (line === where.line_user_id) return { id };
        return null;
      },
      updateMany: async ({ where, data }: { where: { id: number }; data: { line_user_id: string } }) => {
        const cur = staff.get(where.id);
        if (cur === undefined || (cur !== null && cur !== "")) return { count: 0 };
        staff.set(where.id, data.line_user_id);
        return { count: 1 };
      },
    },
  },
}));

process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
const { linkStaffLine, makeLinePendingToken, readLinePendingToken } = await import("./line-pending");

describe("LINE の連携待ちトークン", () => {
  it("作ったトークンから LINE の userId を読み戻せる", async () => {
    expect(await readLinePendingToken(await makeLinePendingToken("U123"))).toBe("U123");
  });

  it("改ざん・空・別の用途のトークンは受け付けない", async () => {
    const token = await makeLinePendingToken("U123");
    expect(await readLinePendingToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(await readLinePendingToken(undefined)).toBeNull();
    // ログインのセッションなど、同じ鍵で署名した別の用途のトークン（audience が違う）
    const { SignJWT } = await import("jose");
    const other = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("U123").sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await readLinePendingToken(other)).toBeNull();
  });
});

describe("スタッフと LINE の連携", () => {
  beforeEach(() => {
    staff.clear();
    staff.set(1, null);
    staff.set(2, "U-other");
    staff.set(3, "");
  });

  it("未連携のスタッフに連携する", async () => {
    expect(await linkStaffLine(1, "U-new")).toBe("linked");
    expect(staff.get(1)).toBe("U-new");
  });

  it("空文字の line_user_id も未連携として扱う", async () => {
    expect(await linkStaffLine(3, "U-new")).toBe("linked");
  });

  it("別の LINE と連携済みのスタッフは上書きしない", async () => {
    expect(await linkStaffLine(2, "U-new")).toBe("other_line");
    expect(staff.get(2)).toBe("U-other");
  });

  it("ほかのスタッフが使っている LINE は連携しない", async () => {
    expect(await linkStaffLine(1, "U-other")).toBe("taken");
    expect(staff.get(1)).toBeNull();
  });

  it("もともと同じ LINE と連携済みなら何もしない", async () => {
    expect(await linkStaffLine(2, "U-other")).toBe("already");
  });
});
