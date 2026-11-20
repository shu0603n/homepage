import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE, makeState } from "@/lib/admin/google-oauth-state";
import { getAdminSession } from "@/lib/admin/session";
import { authUrl, oauthConfigured } from "@/lib/admin/sheets";
import { siteUrl } from "@/lib/auth/http";

// 「Google と連携」：会社の Google アカウントのログイン画面へ送る（特級の管理者だけ）。?back= に戻り先（管理画面のページ）
export async function GET(request: Request) {
  const session = await getAdminSession().catch(() => null);
  if (!session) return NextResponse.redirect(siteUrl("/admin/login/", request));
  const backParam = new URL(request.url).searchParams.get("back") ?? "/admin/?tab=forms";
  const back = backParam.startsWith("/admin/") ? backParam : "/admin/?tab=forms";
  const fail = (reason: string) => NextResponse.redirect(siteUrl(`${back}${back.includes("?") ? "&" : "?"}google=${reason}`, request));
  if (session.role !== "super") return fail("forbidden");
  if (!oauthConfigured()) return fail("not_configured");
  const nonce = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(nonce, siteUrl("/api/admin/google/callback/", request).toString()));
  res.cookies.set(GOOGLE_STATE_COOKIE, await makeState({ nonce, adminId: session.id, back }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Google から戻ってくるときにも送られるように
    path: "/api/admin/google/",
    maxAge: 600,
  });
  return res;
}
