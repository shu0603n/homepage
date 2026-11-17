import { describe, expect, it } from "vitest";
import { formatPhoneJP } from "@/lib/phone";
import { parseProfile } from "@/lib/auth/validation";

describe("formatPhoneJP", () => {
  it.each([
    ["09012345678", "090-1234-5678"],
    ["090-1234-5678", "090-1234-5678"],
    ["０９０ １２３４ ５６７８", "090-1234-5678"],
    ["+81 90 1234 5678", "090-1234-5678"],
    ["0312345678", "03-1234-5678"],
    ["0451234567", "045-123-4567"],
    ["0263123456", "0263-12-3456"],
    ["0120123456", "0120-123-456"],
    ["05012345678", "050-1234-5678"],
  ])("%s → %s", (input, expected) => {
    expect(formatPhoneJP(input)).toBe(expected);
  });

  it.each(["1234", "090123", "abc", "+1 212 555 0100"])("%s は正しくない番号", (input) => {
    expect(formatPhoneJP(input)).toBeNull();
  });
});

describe("parseProfile の電話番号", () => {
  it("ハイフン付きで保存する", () => {
    const r = parseProfile({ name: "山田", phone_number: "09012345678" });
    expect(r.ok && r.input.phone_number).toBe("090-1234-5678");
  });
  it("正しくない番号ははじく", () => {
    const r = parseProfile({ name: "山田", phone_number: "12345" });
    expect(r.ok).toBe(false);
  });
});
