import { getFile } from "@/lib/admin/forms";
import { getAdminSession } from "@/lib/admin/session";

// 回答の添付ファイルを開く（管理者だけ）。画像・PDF はブラウザで開き、それ以外は保存する
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession().catch(() => null))) return new Response("ログインが必要です。", { status: 401 });
  const f = await getFile(Number((await params).id) || 0);
  if (!f) return new Response("ファイルが見つかりません。", { status: 404 });
  return new Response(Buffer.from(f.data), {
    headers: {
      "Content-Type": f.content_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.file_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
