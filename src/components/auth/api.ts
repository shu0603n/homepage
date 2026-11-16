// ok のときは、サーバーが一緒に返した値（例：来社登録の LINE 友だち追加リンク）を data に入れる
export type ApiResult = { ok: true; data: Record<string, unknown> } | { ok: false; message: string };

// 認証系 API への POST。失敗時はサーバーが返したメッセージをそのまま画面に出す
export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  return sendJson("POST", url, body);
}

async function sendJson(method: "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as ({ ok?: boolean; message?: string } & Record<string, unknown>) | null;
    if (res.ok && data?.ok) return { ok: true, data };
    return { ok: false, message: data?.message ?? "処理に失敗しました。時間をおいて再度お試しください。" };
  } catch {
    return { ok: false, message: "通信に失敗しました。ネットワークをご確認のうえ、再度お試しください。" };
  }
}

// 登録解除（DELETE）
export async function deleteJson(url: string): Promise<ApiResult> {
  return sendJson("DELETE", url);
}

// 登録情報の更新（PUT）
export async function putJson(url: string, body: unknown): Promise<ApiResult> {
  return sendJson("PUT", url, body);
}
