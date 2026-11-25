// 日本の祝日（国民の祝日に関する法律にもとづく。振替休日・国民の休日を含む）。データベースにもネットにも頼らず、計算で決める。
// 春分・秋分の日は、国立天文台の暦要項と同じ近似式（1980〜2099年で一致）。日付は "YYYY-MM-DD"（日本時間の暦）

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const weekday = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
// その月の第 n 月曜日
const nthMonday = (y: number, m: number, n: number) => {
  const first = weekday(y, m, 1);
  return 1 + ((8 - first) % 7) + (n - 1) * 7;
};
const vernal = (y: number) => Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
const autumnal = (y: number) => Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));

const cache = new Map<number, Map<string, string>>();

// その年の祝日（日付 → 名前）
export function holidaysOf(y: number): Map<string, string> {
  const hit = cache.get(y);
  if (hit) return hit;
  const h = new Map<string, string>();
  const add = (m: number, d: number, name: string) => h.set(ymd(y, m, d), name);
  add(1, 1, "元日");
  add(1, nthMonday(y, 1, 2), "成人の日");
  add(2, 11, "建国記念の日");
  if (y >= 2020) add(2, 23, "天皇誕生日");
  add(3, vernal(y), "春分の日");
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  // 海の日・スポーツの日・山の日（2020・2021 年は東京五輪で移動）
  if (y === 2020) add(7, 23, "海の日");
  else if (y === 2021) add(7, 22, "海の日");
  else add(7, nthMonday(y, 7, 3), "海の日");
  if (y === 2020) add(8, 10, "山の日");
  else if (y === 2021) add(8, 8, "山の日");
  else add(8, 11, "山の日");
  add(9, nthMonday(y, 9, 3), "敬老の日");
  add(9, autumnal(y), "秋分の日");
  if (y === 2020) add(7, 24, "スポーツの日");
  else if (y === 2021) add(7, 23, "スポーツの日");
  else add(10, nthMonday(y, 10, 2), y >= 2020 ? "スポーツの日" : "体育の日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");

  // 国民の休日：前日と翌日が祝日の平日（敬老の日と秋分の日の間など）
  for (let m = 1; m <= 12; m++) {
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 2; d < days; d++) {
      const key = ymd(y, m, d);
      if (h.has(key) || weekday(y, m, d) === 0) continue;
      if (h.has(ymd(y, m, d - 1)) && h.has(ymd(y, m, d + 1))) h.set(key, "国民の休日");
    }
  }
  // 振替休日：祝日が日曜なら、その後の最初の「祝日でない日」
  for (const key of [...h.keys()].sort()) {
    const [yy, mm, dd] = key.split("-").map(Number);
    if (weekday(yy, mm, dd) !== 0) continue;
    const t = new Date(Date.UTC(yy, mm - 1, dd));
    do t.setUTCDate(t.getUTCDate() + 1);
    while (h.has(ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())));
    if (t.getUTCFullYear() === y) h.set(ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()), "振替休日");
  }
  cache.set(y, h);
  return h;
}

export const holidayName = (day: string) => holidaysOf(Number(day.slice(0, 4))).get(day) ?? null;
export const isWeekend = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const w = weekday(y, m, d);
  return w === 0 || w === 6;
};

// 日付の足し算（"YYYY-MM-DD"）
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

// 日本時間の今日
export function todayJst(now = new Date()): string {
  const t = new Date(now.getTime() + 9 * 3600_000);
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
