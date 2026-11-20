import { isSameOrigin, jsonError, readJson } from "@/lib/auth/http";
import { getAdminSession, type AdminSession } from "@/lib/admin/session";

// 管理画面の API の共通の入口：ほかのサイトからの送信を断り、ログイン中の管理者を返す（だめならエラーの応答）
export async function adminRequest(request: Request, opts: { body?: boolean } = {}): Promise<{ session: AdminSession; body: Record<string, unknown> } | Response> {
  if (!isSameOrigin(request)) return jsonError("不正なリクエストです。", 403);
  const session = await getAdminSession();
  if (!session) return jsonError("ログインが必要です。", 401);
  if (!opts.body) return { session, body: {} };
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return jsonError("無効なリクエストです。", 400);
  return { session, body };
}

export const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
export const intOrNull = (v: unknown): number | null | undefined => (v === null ? null : Number.isInteger(v) && (v as number) > 0 ? (v as number) : undefined);
