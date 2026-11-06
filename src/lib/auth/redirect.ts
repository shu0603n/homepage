// ログイン後の移動先。外部サイトへ飛ばされないよう、このサイト内のパスだけを許可する
export function safeNext(value: string | string[] | undefined, fallback = "/mypage/"): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
}
