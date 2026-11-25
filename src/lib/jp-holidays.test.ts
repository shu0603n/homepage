import { describe, expect, it } from "vitest";
import { addDays, holidayName, holidaysOf, isWeekend, todayJst } from "@/lib/jp-holidays";

describe("日本の祝日", () => {
  it("2026 年（内閣府の一覧と同じ）", () => {
    expect([...holidaysOf(2026).entries()].sort()).toEqual(
      [
        ["2026-01-01", "元日"],
        ["2026-01-12", "成人の日"],
        ["2026-02-11", "建国記念の日"],
        ["2026-02-23", "天皇誕生日"],
        ["2026-03-20", "春分の日"],
        ["2026-04-29", "昭和の日"],
        ["2026-05-03", "憲法記念日"],
        ["2026-05-04", "みどりの日"],
        ["2026-05-05", "こどもの日"],
        ["2026-05-06", "振替休日"],
        ["2026-07-20", "海の日"],
        ["2026-08-11", "山の日"],
        ["2026-09-21", "敬老の日"],
        ["2026-09-22", "国民の休日"],
        ["2026-09-23", "秋分の日"],
        ["2026-10-12", "スポーツの日"],
        ["2026-11-03", "文化の日"],
        ["2026-11-23", "勤労感謝の日"],
      ].sort(),
    );
  });
  it("振替休日・春分秋分（2025・2027 年）", () => {
    expect(holidayName("2025-02-24")).toBe("振替休日");
    expect(holidayName("2025-11-24")).toBe("振替休日");
    expect(holidayName("2027-03-21")).toBe("春分の日");
    expect(holidayName("2027-03-22")).toBe("振替休日");
    expect(holidayName("2027-09-23")).toBe("秋分の日");
    expect(holidayName("2026-11-24")).toBeNull();
  });
  it("週末・日付の計算・日本時間の今日", () => {
    expect(isWeekend("2026-11-28")).toBe(true);
    expect(isWeekend("2026-11-27")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(todayJst(new Date("2026-11-24T15:30:00Z"))).toBe("2026-11-25");
  });
});
