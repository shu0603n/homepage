import { describe, expect, it } from "vitest";
import { adminPasswordProblem, hashPassword, isWeakPassword, verifyPassword } from "@/lib/admin/password";

describe("管理ページのパスワード", () => {
  it("ハッシュにして保存し、同じパスワードだけが通る", async () => {
    const stored = await hashPassword("test001");
    expect(stored).toMatch(/^scrypt\$/);
    expect(stored).not.toContain("test001");
    expect(await verifyPassword("test001", stored)).toBe(true);
    expect(await verifyPassword("test002", stored)).toBe(false);
    expect(await verifyPassword("test001", "broken")).toBe(false);
  });

  it("同じパスワードでも、毎回ちがうハッシュになる", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("新しいパスワードの条件", () => {
    const email = "n_takahashi@emorislink.co.jp";
    expect(adminPasswordProblem("test001", email)).toContain("12文字以上");
    expect(adminPasswordProblem("abcdefghijkl", email)).toContain("英大文字");
    expect(adminPasswordProblem("N_takahashi2026X", email)).toContain("メールアドレス");
    expect(adminPasswordProblem("Emoris2026Link", email)).toBeNull();
    expect(isWeakPassword("test001", email)).toBe(true);
  });
});
