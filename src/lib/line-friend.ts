// スタッフ登録後の「LINE 公式アカウントの友だち追加」へのリンク。
//
// next-app のスタッフ登録（staff-register）と同じ流れにそろえている：
//   1. このリンク（line-recruit-hub のトラッキングリンク）を開く
//   2. line-recruit-hub が LINE ログイン（LIFF）で本人の LINE userId を確定し、流入経路を記録する
//   3. externalRef（＝スタッフ ID）を使って、next-app の line-link-manual に staff.line_user_id を書き戻す
//   4. line-recruit-hub がスタッフのプロフィールを取り込み、LINE の友だち追加画面へ移動する
//
// リンク先は環境変数 LINE_FRIEND_TRACK_URL で差し替えられる（ホームページからの登録を、next-app からの登録と
// 分けて集計したいときは、line-recruit-hub の「流入経路」で新しいリンクを作ってその URL を設定する）。
// 未設定のあいだは next-app と同じリンクを使う。

// 来社登録（/register/visit/）は、next-app の来社登録フォームと同じく別のリンクにして、流入経路を分けて集計する
// （LINE_FRIEND_VISIT_TRACK_URL で差し替え可）
const DEFAULT_TRACK_URL = "https://line-recruit-hub.vercel.app/track/27dc72af";
const DEFAULT_VISIT_TRACK_URL = "https://line-recruit-hub.vercel.app/track/2b1c82c3";

// サーバー側でだけ呼ぶこと（スタッフ ID はログイン中の本人のセッション、または今登録したスタッフから渡す）
export function lineFriendUrl(staffId: number, source: "web" | "visit" = "web"): string {
  const base = source === "visit" ? process.env.LINE_FRIEND_VISIT_TRACK_URL || DEFAULT_VISIT_TRACK_URL : process.env.LINE_FRIEND_TRACK_URL || DEFAULT_TRACK_URL;
  const url = new URL(base);
  url.searchParams.set("externalRef", String(staffId));
  return url.toString();
}
