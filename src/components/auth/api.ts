export type ApiResult = { ok: true } | { ok: false; message: string };

// 認証系 API への POST。失敗時はサーバーが返したメッセージをそのまま画面に出す
export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (res.ok && data?.ok) return { ok: true };
    return { ok: false, message: data?.message ?? "処理に失敗しました。時間をおいて再度お試しください。" };
  } catch {
    return { ok: false, message: "通信に失敗しました。ネットワークをご確認のうえ、再度お試しください。" };
  }
}
