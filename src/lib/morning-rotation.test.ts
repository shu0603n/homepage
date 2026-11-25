import { describe, expect, it } from "vitest";
import { assignRoles, type MemberStat } from "@/lib/morning-rotation";

const stats = (o: Record<number, [number, string | null]>) => new Map<number, MemberStat>(Object.entries(o).map(([k, [count, last]]) => [Number(k), { count, last }]));

describe("朝礼の当番", () => {
  const members = [1, 2, 3, 4, 5, 6];
  it("前の日の発表者 → 司会、コメント → 発表者、コメントは回数の少ない人", () => {
    const r = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [], stats: stats({ 1: [3, "2026-11-24"], 2: [3, "2026-11-24"], 3: [2, "2026-11-24"], 4: [1, "2026-11-20"], 5: [1, "2026-11-19"], 6: [2, "2026-11-18"] }) });
    expect(r).toEqual({ mc: 2, presenter: 3, commenter: 5 }); // 4 と 5 は 1 回。5 のほうが前に担当している
  });
  it("一度も担当していない人が先", () => {
    const r = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [], stats: stats({ 1: [0, "2026-11-02"], 6: [0, "2026-11-03"], 4: [0, null], 5: [0, "2026-11-01"] }) });
    expect(r.commenter).toBe(4);
  });
  it("引き継ぐ人がいないときは、その役も回数の少ない人から", () => {
    const r = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [2], stats: stats({ 1: [5, null], 3: [5, null], 4: [1, null], 5: [2, null], 6: [3, null] }) });
    expect(r).toEqual({ mc: 4, presenter: 3, commenter: 5 });
  });
  it("最初の日・人が足りない日", () => {
    expect(assignRoles({ prev: null, members: [7, 8, 9], absent: [], stats: new Map() })).toEqual({ mc: 7, presenter: 8, commenter: 9 });
    expect(assignRoles({ prev: null, members: [7, 8], absent: [8], stats: new Map() })).toEqual({ mc: 7, presenter: null, commenter: null });
  });
  it("長く回すと、全員がほぼ同じ回数になる（休みがあっても）", () => {
    const count = new Map<number, MemberStat>(members.map((m) => [m, { count: 0, last: null }]));
    let prev = null as ReturnType<typeof assignRoles> | null;
    for (let day = 0; day < 120; day++) {
      const absent = [members[day % 6], ...(day % 5 === 0 ? [members[(day + 3) % 6]] : [])];
      const r = assignRoles({ prev, members, absent, stats: count });
      const date = `2026-${String(Math.floor(day / 28) + 1).padStart(2, "0")}-${String((day % 28) + 1).padStart(2, "0")}`;
      for (const id of [r.mc, r.presenter, r.commenter]) if (id !== null) count.set(id, { count: count.get(id)!.count + 1, last: date });
      prev = r;
    }
    const totals = [...count.values()].map((s) => s.count);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(3);
  });
});
