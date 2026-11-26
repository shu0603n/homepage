import { describe, expect, it } from "vitest";
import { assignRoles, type MemberStat } from "@/lib/morning-rotation";

const stats = (o: Record<number, number>) => new Map<number, MemberStat>(Object.entries(o).map(([k, count]) => [Number(k), { count, last: null }]));

describe("朝礼の当番", () => {
  // 順番：1 → 2 → 3 → 4 → 5 → 6 → 1
  const members = [1, 2, 3, 4, 5, 6];
  it("前の日の発表者 → 司会、コメント → 発表者、コメントは順番で前のコメントの人の次", () => {
    const r = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [], stats: stats({ 1: 3, 2: 3, 3: 2, 4: 2, 5: 2, 6: 2 }) });
    expect(r).toEqual({ mc: 2, presenter: 3, commenter: 4 });
  });
  it("輪の最後の次は先頭に戻る", () => {
    const r = assignRoles({ prev: { mc: 4, presenter: 5, commenter: 6 }, members, absent: [], stats: new Map() });
    expect(r).toEqual({ mc: 5, presenter: 6, commenter: 1 });
  });
  it("回数が多すぎる人は飛ばす（いちばん少ない人 + 1 回まで順番どおり）", () => {
    const r = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [], stats: stats({ 1: 4, 2: 4, 3: 3, 4: 5, 5: 3, 6: 3 }) });
    expect(r.commenter).toBe(5); // 4 は 5 回（いちばん少ない 3 回 + 2）なので飛ばす
    const r2 = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [], stats: stats({ 1: 4, 2: 4, 3: 3, 4: 4, 5: 3, 6: 3 }) });
    expect(r2.commenter).toBe(4); // + 1 回までなら順番どおり
  });
  it("いない人は飛ばして順番の次の人。引き継ぐ人がいないときは、その役も順番から", () => {
    const r = assignRoles({ prev: { mc: 1, presenter: 2, commenter: 3 }, members, absent: [2, 4], stats: new Map() });
    expect(r).toEqual({ mc: 5, presenter: 3, commenter: 6 });
  });
  it("最初の日・人が足りない日", () => {
    expect(assignRoles({ prev: null, members: [7, 8, 9], absent: [], stats: new Map() })).toEqual({ mc: 7, presenter: 8, commenter: 9 });
    expect(assignRoles({ prev: null, members: [7, 8], absent: [8], stats: new Map() })).toEqual({ mc: 7, presenter: null, commenter: null });
  });
  it("休みがなければ、コメントは決まった順番どおりに回る", () => {
    const count = new Map<number, MemberStat>(members.map((m) => [m, { count: 0, last: null }]));
    let prev = { mc: 5, presenter: 6, commenter: 1 } as ReturnType<typeof assignRoles>;
    const order: (number | null)[] = [];
    for (let day = 0; day < 12; day++) {
      const r = assignRoles({ prev, members, absent: [], stats: count });
      for (const id of [r.mc, r.presenter, r.commenter]) if (id !== null) count.set(id, { count: count.get(id)!.count + 1, last: null });
      order.push(r.commenter);
      prev = r;
    }
    expect(order).toEqual([2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1]);
  });
  it("長く回すと、全員がほぼ同じ回数になる（休みがあっても）", () => {
    const count = new Map<number, MemberStat>(members.map((m) => [m, { count: 0, last: null }]));
    let prev = null as ReturnType<typeof assignRoles> | null;
    for (let day = 0; day < 120; day++) {
      const absent = [members[day % 6], ...(day % 5 === 0 ? [members[(day + 3) % 6]] : [])];
      const r = assignRoles({ prev, members, absent, stats: count });
      for (const id of [r.mc, r.presenter, r.commenter]) if (id !== null) count.set(id, { count: count.get(id)!.count + 1, last: null });
      prev = r;
    }
    const totals = [...count.values()].map((s) => s.count);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(3);
  });
});
