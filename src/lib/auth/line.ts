// LINE（LIFF）からのログイン。
// 公式LINE のリッチメニュー等から LIFF アプリ経由でこのサイトを開いたとき、LINE の ID トークンを検証して
// 「LINE と紐づいたスタッフ」を特定し、通常のログインと同じセッションを作る。
// いまは LINE 側を設定していないため、LIFF_ID が未設定のあいだはこの機能は無効（呼ぶと null を返す）。
//
// 有効にするには：
//   1. LINE Developers で LIFF アプリを作り、エンドポイント URL をこのサイトの /mypage/ 等にする
//   2. .env に LIFF_ID と NEXT_PUBLIC_LIFF_ID（同じ値）を設定する
//   3. スタッフと LINE の紐づけ（staff.line_user_id）は next-app の line-link と同じ方式で保存される

export function isLineLoginEnabled(): boolean {
  return Boolean(process.env.LIFF_ID);
}

type LineVerifyResponse = { aud?: string; sub?: string };

// ID トークンを LINE に問い合わせて検証し、LINE の userId を返す（不正なら null）
export async function verifyLineIdToken(idToken: string): Promise<string | null> {
  const liffId = process.env.LIFF_ID;
  if (!liffId) return null;
  const channelId = liffId.split("-")[0];

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!res.ok) return null;
  const verified = (await res.json()) as LineVerifyResponse;
  return verified.aud === channelId && verified.sub ? verified.sub : null;
}
