import { NextResponse } from "next/server";
import type { CognitoErrorCode } from "@/lib/auth/cognito";
import { SITE } from "@/lib/site";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export const JSON_OK = { ok: true } as const;

// 他のサイトからのフォーム送信（CSRF）を避けるため、Origin が自サイトのときだけ受け付ける
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // 同一オリジンの fetch は Origin を付けない場合がある
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// サイト内の URL を、いまアクセスされているドメインを基準に作る（Amplify の URL でも独自ドメインでも、そのまま戻れるように）。
// NEXT_PUBLIC_APP_URL は独自ドメインへの切り替え前から本番ドメイン（旧サイト）になっているため使わない。
//
// 注意：X-Forwarded-Host はアクセスする側が自由に書き換えられる（Amplify はそのまま通す）。
// そのまま使うと、他人のメールアドレスで「パスワードをお忘れの方」を送られたとき、
// 本人に届く再設定メールのリンク先が攻撃者のサイトになり、リンクの中身（再設定用の鍵）を盗まれてしまう。
// そのため、このサイトのドメインとして決めたものだけを使い、それ以外は正規の URL（SITE.siteUrl）にする
const SITE_HOSTS = new Set([new URL(SITE.siteUrl).host, "emorislink.co.jp", "main.d33wn8ifx0n6p4.amplifyapp.com"]);

function isLocalHost(host: string): boolean {
  return process.env.NODE_ENV !== "production" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

export function siteUrl(path: string, request: Request): URL {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (SITE_HOSTS.has(host)) return new URL(path, `https://${host}`);
  if (isLocalHost(host)) return new URL(path, `http://${host}`);
  return new URL(path, SITE.siteUrl);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// 画面に出すメッセージ。ログイン／リセットでは、登録の有無が分かる書き方を避ける
export const AUTH_MESSAGES: Record<CognitoErrorCode, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  user_not_found: "メールアドレスまたはパスワードが正しくありません。",
  user_exists: "このメールアドレスは既に登録されています。ログインしてください。",
  invalid_password: "パスワードが条件を満たしていません。英大文字・英小文字・数字を含む8文字以上にしてください。",
  invalid_code: "確認コードが正しくありません。",
  expired_code: "確認コードの有効期限が切れています。もう一度コードを送信してください。",
  too_many_requests: "試行回数が多すぎます。しばらく時間をおいてからお試しください。",
  new_password_required: "パスワードの再設定が必要です。「パスワードをお忘れの方」からお手続きください。",
  unknown: "処理に失敗しました。時間をおいて再度お試しください。",
};
