import { parsePhoneNumberFromString } from "libphonenumber-js/min";

// 日本の電話番号を「090-1234-5678」「03-1234-5678」「0263-12-3456」のようにハイフン付きの形に整える。
// 市外局番の桁数は地域ごとに違うため、総務省の番号計画を収録したライブラリ（libphonenumber-js）で区切りを決める。
// 全角数字・空白・ハイフンなしや「+81」始まりも受け付ける。日本の電話番号として正しくなければ null
export function formatPhoneJP(value: string): string | null {
  const half = value.replace(/[０-９＋]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const parsed = parsePhoneNumberFromString(half, "JP");
  if (!parsed || parsed.country !== "JP" || !parsed.isValid()) return null;
  return parsed.formatNational();
}
