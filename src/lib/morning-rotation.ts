// 朝礼の当番の決め方（データベースに触れない計算だけ。lib/admin/morning.ts から使う）。
//   ・今日の発表者 → 明日の司会、今日のコメントの人 → 明日の発表者、明日のコメントの人は新しく選ぶ
//   ・新しく選ぶのは、決まった順番（members の並び。lib/morning-order.ts の ROTATION）で「前のコメントの人の次の人」。
//     ただし回数も見る：その人の担当回数が、選べる人のいちばん少ない回数より 2 回以上多ければ飛ばして、順番の次の人へ
//     （休みで順番を飛ばされた人が、あとで追いつけるように）
//   ・いない人（休み・入社対応など）は外して、空いた役も同じ決め方で選ぶ。いなかった日は回数に数えない

export type Roles = { mc: number | null; presenter: number | null; commenter: number | null };
export type MemberStat = { count: number; last: string | null };

// 回数の差をどこまで許して順番どおりにするか（いちばん少ない人 + SLACK 回までなら順番どおり）
const SLACK = 1;

export function assignRoles(opts: { prev: Roles | null; members: number[]; absent: number[]; stats: Map<number, MemberStat> }): Roles {
  const present = opts.members.filter((m) => !opts.absent.includes(m));
  const used = new Set<number>();
  const countOf = (id: number) => opts.stats.get(id)?.count ?? 0;
  // 順番の輪を、前のコメントの人の次から一周ぶん並べる（前のコメントの人がいなければ、輪の先頭から）
  const ring = opts.members;
  const anchor = opts.prev?.commenter != null ? ring.indexOf(opts.prev.commenter) : -1;
  const cycle = ring.map((_, i) => ring[(anchor + 1 + i) % ring.length]);
  const pickNext = () => {
    const cand = cycle.filter((m) => present.includes(m) && !used.has(m));
    if (!cand.length) return null;
    const min = Math.min(...cand.map(countOf));
    const pick = cand.find((m) => countOf(m) <= min + SLACK) ?? cand[0];
    used.add(pick);
    return pick;
  };
  const carry = (id: number | null | undefined) => {
    if (id == null || !present.includes(id) || used.has(id)) return null;
    used.add(id);
    return id;
  };
  // 前の日から引き継ぐ人を先に押さえてから、空いた役を選ぶ（引き継ぐ人がほかの役に選ばれないように）
  const mcCarry = carry(opts.prev?.presenter);
  const presenterCarry = carry(opts.prev?.commenter);
  const mc = mcCarry ?? pickNext();
  const presenter = presenterCarry ?? pickNext();
  const commenter = pickNext();
  return { mc, presenter, commenter };
}
