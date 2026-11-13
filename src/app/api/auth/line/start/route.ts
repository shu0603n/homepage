import { NextResponse } from "next/server";
import { isLineWebLoginEnabled, LINE_STATE_COOKIE, LINE_STATE_MAX_AGE, siteUrl, startLineLogin } from "@/lib/auth/line-login";
import { safeNext } from "@/lib/auth/redirect";

// 「LINE でログイン」ボタンの行き先。LINE のログイン画面へ移動させる
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next") ?? undefined);
  const started = isLineWebLoginEnabled() ? await startLineLogin(request, next) : null;
  if (!started) return NextResponse.redirect(siteUrl("/login/?line=disabled", request));

  const res = NextResponse.redirect(started.url);
  res.cookies.set(LINE_STATE_COOKIE, started.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // LINE からのリダイレクト（トップレベルの GET）でも送られるように lax
    path: "/api/auth/line/",
    maxAge: LINE_STATE_MAX_AGE,
  });
  return res;
}
