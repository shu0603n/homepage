import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { finishLineLogin, LINE_STATE_COOKIE, readLineState, siteUrl } from "@/lib/auth/line-login";
import { createSession } from "@/lib/auth/session";
import { findStaffByLineUserId, isLoginBlocked, reactivateIfUnsubscribed } from "@/lib/auth/staff";

// LINE のログイン画面から戻ってくる先。
// LINE と連携済みのスタッフ（staff.line_user_id が一致）が見つかったときだけ、通常のログインと同じセッションを作る
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const store = await cookies();
  const saved = await readLineState(store.get(LINE_STATE_COOKIE)?.value);
  store.delete({ name: LINE_STATE_COOKIE, path: "/api/auth/line/" });

  const fail = (reason: string) => {
    const url = siteUrl("/login/", request);
    url.searchParams.set("line", reason);
    if (saved && saved.next !== "/mypage/") url.searchParams.set("next", saved.next);
    return NextResponse.redirect(url);
  };

  if (params.get("error")) return fail("cancelled"); // 同意画面でキャンセルされた
  const code = params.get("code");
  if (!saved || !code || params.get("state") !== saved.state) return fail("expired");

  const lineUserId = await finishLineLogin(request, code, saved.nonce).catch((error) => {
    console.error("LINE login failed:", error);
    return null;
  });
  if (!lineUserId) return fail("failed");

  const staff = await findStaffByLineUserId(lineUserId);
  if (!staff) return fail("not_linked");
  if (isLoginBlocked(staff)) return fail("blocked");

  await reactivateIfUnsubscribed(staff.id).catch((error) => console.error("staff reactivate failed:", error));
  await createSession({ sub: lineUserId, email: staff.mail, staffId: staff.id, via: "line" });
  return NextResponse.redirect(siteUrl(saved.next, request));
}
