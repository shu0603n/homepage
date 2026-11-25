// 朝礼の画面で人を並べる順（担当を選ぶプルダウン・担当した回数の表）。名字で決める。ここにない人は最後に名前順
const ORDER = ["真浦", "飯田", "南間", "村井", "高橋", "高須", "金野", "黒田", "鈴木"];

const rank = (name: string) => {
  const n = name.replace(/\s/g, "");
  const i = ORDER.findIndex((s) => n.startsWith(s));
  return i < 0 ? ORDER.length : i;
};

export function byMorningOrder<T>(list: T[], nameOf: (x: T) => string): T[] {
  return [...list].sort((a, b) => rank(nameOf(a)) - rank(nameOf(b)) || nameOf(a).localeCompare(nameOf(b), "ja"));
}
