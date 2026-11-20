import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { LINEXT_URL } from "@/lib/admin/linext";

// 管理画面の「LINE（Linext）」メニューから開く入口。ログイン中の管理者として Linext に自動でログインさせる（シングルサインオン）。
//   1. ここで「この管理者のメールアドレス」を入れた署名つきトークン（60秒・1回限り）を作る
//   2. Linext の /api/sso/homepage へ自動で送信するページを返す（POST なので、トークンが URL や履歴に残らない）
//   3. Linext 側が署名を確かめ、同じメールアドレスの Linext 管理者としてログインさせる（権限は Linext の設定のまま）
// 共有の鍵（LINEXT_SSO_SECRET。Linext 側は HOMEPAGE_SSO_SECRET）が未設定なら、Linext のページをそのまま開く（Linext のログイン画面が出る）
const ISSUER = "emorislink-homepage-admin";
const AUDIENCE = "linext";

function safeTo(value: string | null): string {
  return value && /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(value) ? value : "/dashboard";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.redirect(new URL("/admin/login/", request.url));

  const to = safeTo(new URL(request.url).searchParams.get("to"));
  const secret = process.env.LINEXT_SSO_SECRET;
  if (!secret) return NextResponse.redirect(`${LINEXT_URL}${to}`);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(session.email)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(secret));

  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Linext を開いています…</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;background:#eef2f5;color:#0b2a3c}p{font-size:15px}button{margin-top:12px;padding:10px 22px;border:0;border-radius:999px;background:#06c755;color:#fff;font-weight:700;font-size:14px;cursor:pointer}</style></head>
<body><form method="post" action="${esc(`${LINEXT_URL}/api/sso/homepage`)}" style="text-align:center"><p>Linext を開いています…</p>
<input type="hidden" name="token" value="${esc(token)}"><input type="hidden" name="next" value="${esc(to)}">
<noscript><button type="submit">Linext を開く</button></noscript></form>
<script>document.forms[0].submit()</script></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" },
  });
}
