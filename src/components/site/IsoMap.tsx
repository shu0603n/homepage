import { isoMap } from "@/lib/isomap";

// 札幌・大通のアイソメトリック地図。数百個の図形を座標計算で描くため、生成した SVG をそのまま埋め込む
const svg = isoMap();

export function IsoMap() {
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
