// 郵便番号から住所を調べる（ブラウザから直接呼ぶ）。
// 無料の郵便番号検索 API「zipcloud」（日本郵便の郵便番号データを元にしたもの）を使う。https://zipcloud.ibsnet.co.jp/doc/api
// 1つの郵便番号に複数の町名がある場合は、全件に共通する部分まで（例：清須市春日）を「確定できる住所」とする

const ENDPOINT = "https://zipcloud.ibsnet.co.jp/api/search";

export type PostalResult = { prefecture: string; address: string; complete: boolean };

type ZipcloudResponse = { status: number; results: { address1: string; address2: string; address3: string }[] | null };

// 全角数字・ハイフン・空白を許して、7桁の数字だけを取り出す（7桁でなければ null）
export function normalizePostal(value: string): string | null {
  const digits = value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, "");
  return digits.length === 7 ? digits : null;
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const v of values.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < v.length && prefix[i] === v[i]) i++;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

// 見つからない・通信できないときは null（入力欄はそのままにして、手で入力してもらう）
export async function lookupPostal(code: string, signal?: AbortSignal): Promise<PostalResult | null> {
  // 10秒たっても返事がなければあきらめる（「検索しています…」のまま止まらないように）
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 10_000);
  signal?.addEventListener("abort", () => timeout.abort());
  try {
    const res = await fetch(`${ENDPOINT}?zipcode=${code}`, { signal: timeout.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as ZipcloudResponse;
    const results = data.results ?? [];
    if (data.status !== 200 || results.length === 0) return null;
    const prefectures = new Set(results.map((r) => r.address1));
    if (prefectures.size !== 1) return null; // 都道府県をまたぐ郵便番号はない想定だが、念のため
    const cities = new Set(results.map((r) => r.address2));
    const city = cities.size === 1 ? results[0].address2 : commonPrefix(results.map((r) => r.address2));
    const town = cities.size === 1 ? commonPrefix(results.map((r) => r.address3)) : "";
    return { prefecture: results[0].address1, address: city + town, complete: results.length === 1 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
