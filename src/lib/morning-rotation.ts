// 朝礼の当番の決め方（データベースに触れない計算だけ。lib/admin/morning.ts から使う）。
//   ・今日の発表者 → 明日の司会、今日のコメントの人 → 明日の発表者、明日のコメントの人は新しく選ぶ
//   ・新しく選ぶのは「担当回数がいちばん少ない人」。同じなら「最後に担当してからいちばん日が空いている人」（一度もない人が先）、
//     それも同じなら、管理者の番号の小さい順
//   ・いない人（休み・入社対応など）は外して、空いた役は同じ決め方で選ぶ。いなかった日は回数に数えないので、あとで順番が回ってくる

export type Roles = { mc: number | null; presenter: number | null; commenter: number | null };
export type MemberStat = { count: number; last: string | null };

export function assignRoles(opts: { prev: Roles | null; members: number[]; absent: number[]; stats: Map<number, MemberStat> }): Roles {
  const present = opts.members.filter((m) => !opts.absent.includes(m));
  const used = new Set<number>();
  const fair = () => {
    const pick = present
      .filter((m) => !used.has(m))
      .sort((a, b) => {
        const sa = opts.stats.get(a) ?? { count: 0, last: null };
        const sb = opts.stats.get(b) ?? { count: 0, last: null };
        if (sa.count !== sb.count) return sa.count - sb.count;
        if (sa.last !== sb.last) return sa.last === null ? -1 : sb.last === null ? 1 : sa.last < sb.last ? -1 : 1;
        return a - b;
      })[0];
    if (pick !== undefined) used.add(pick);
    return pick ?? null;
  };
  const carry = (id: number | null | undefined) => {
    if (id == null || !present.includes(id) || used.has(id)) return null;
    used.add(id);
    return id;
  };
  // 前の日から引き継ぐ人を先に押さえてから、空いた役を選ぶ（引き継ぐ人がほかの役に選ばれないように）
  const mcCarry = carry(opts.prev?.presenter);
  const presenterCarry = carry(opts.prev?.commenter);
  const mc = mcCarry ?? fair();
  const presenter = presenterCarry ?? fair();
  const commenter = fair();
  return { mc, presenter, commenter };
}
