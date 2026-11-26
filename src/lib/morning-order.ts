// 朝礼の画面で人を並べる順と、当番が回る順番。どちらも名字で決める
// 画面の並び（担当を選ぶプルダウン・担当した回数の表）。ここにない人は最後に名前順
const ORDER = ["真浦", "飯田", "南間", "村井", "高橋", "鷹巣", "金野", "黒田", "鈴木"];
// コメントの当番が回る順番（最後の次は先頭に戻る）。ここにない人は最後に、管理者の番号順
export const ROTATION = ["高橋", "村井", "鈴木", "真浦", "飯田", "南間", "鷹巣", "黒田", "金野"];

const rankIn = (list: string[], name: string) => {
  const n = name.replace(/\s/g, "");
  const i = list.findIndex((s) => n.startsWith(s));
  return i < 0 ? list.length : i;
};

export function byMorningOrder<T>(list: T[], nameOf: (x: T) => string): T[] {
  return [...list].sort((a, b) => rankIn(ORDER, nameOf(a)) - rankIn(ORDER, nameOf(b)) || nameOf(a).localeCompare(nameOf(b), "ja"));
}

// 当番の順番に並べた管理者の番号
export function rotationOrder(people: { id: number; name: string }[]): number[] {
  return [...people].sort((a, b) => rankIn(ROTATION, a.name) - rankIn(ROTATION, b.name) || a.id - b.id).map((p) => p.id);
}
