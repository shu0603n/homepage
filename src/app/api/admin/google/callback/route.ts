import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE, readState } from "@/lib/admin/google-oauth-state";
import { connectWithCode, SheetError } from "@/lib/admin/sheets";
import { siteUrl } from "@/lib/auth/http";

// Google のログインから戻ってくるところ。合言葉（state）を確かめて、連携の鍵を保存する。
// 戻り先へは、このページの中から移る（Google からの続きの移動だと、管理画面のログイン Cookie が送られず、ログイン画面になってしまうため）
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const store = await cookies();
  const state = await readState(store.get(GOOGLE_STATE_COOKIE)?.value);
  const back = state?.back ?? "/admin/?tab=forms";
  let result = "ok";
  if (!state || params.get("state") !== state.nonce) result = "expired";
  else if (params.get("error")) result = "cancelled";
  else {
    try {
      await connectWithCode(params.get("code") ?? "", siteUrl("/api/admin/google/callback/", request).toString(), state.adminId);
    } catch (error) {
      console.error("google connect failed:", error);
      result = error instanceof SheetError && error.message.includes("権限") ? "no_scope" : "failed";
    }
  }
  const to = siteUrl(`${back}${back.includes("?") ? "&" : "?"}google=${result}`, request).toString();
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to.replace(/"/g, "&quot;")}"><title>Google と連携</title></head><body><p>管理画面に戻ります…</p><script>location.replace(${JSON.stringify(to)})</script></body></html>`;
  const res = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/admin/google/", maxAge: 0 });
  return res;
}
