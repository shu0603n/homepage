import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LineAutoLogin } from "@/components/auth/LineAutoLogin";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageShell } from "@/components/site/PageShell";
import { isLineWebLoginEnabled } from "@/lib/auth/line-login";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "ログイン",
  description: "株式会社エモリスリンクのスタッフ向けログインページです。",
  section: "contact",
  hero: { en: "Login", ja: "ログイン", img: "hero-contact.jpg", crumbs: [["job-seekers/", "お仕事をお探しの方"]] },
} as const;

export const metadata: Metadata = { ...buildMetadata("login/", meta), robots: { index: false, follow: false } };

// LINE ログインから戻ってきたときの案内（/api/auth/line/callback/ が ?line=… を付ける）
const LINE_MESSAGES: Record<string, string> = {
  not_linked: "この LINE アカウントと連携しているスタッフ登録が見つかりません。メールアドレスとパスワードでログインし、マイページから LINE の友だち追加を行ってください。",
  blocked: "このアカウントではログインできません。お電話にてお問い合わせください。",
  cancelled: "LINE でのログインがキャンセルされました。",
  expired: "LINE でのログインの有効期限が切れました。もう一度お試しください。",
  failed: "LINE でのログインに失敗しました。時間をおいて再度お試しください。",
  disabled: "現在、LINE でのログインはご利用いただけません。",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; line?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSession()) redirect(next);
  const lineMessage = params.line ? LINE_MESSAGES[params.line] : undefined;
  const lineHref = `/api/auth/line/start/?next=${encodeURIComponent(next)}`;

  return (
    <PageShell route="login/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">
              {isLineWebLoginEnabled() ? "LINE アカウント、または登録済みのメールアドレスとパスワードでログインしてください。" : "登録済みのメールアドレスとパスワードでログインしてください。"}
            </p>
          </div>
          {lineMessage && (
            <p className="form__status is-ng line-login__error" role="alert">
              {lineMessage}
            </p>
          )}
          {isLineWebLoginEnabled() && (
            <div className="line-login">
              <a className="line-step__btn" href={lineHref}>
                <i className="bi bi-line" aria-hidden="true" />
                LINE でログイン
              </a>
              <p className="line-login__note">LINE 公式アカウントと連携済みの方は、LINE アカウントでログインできます。</p>
              <p className="line-login__or">
                <span>または メールアドレスでログイン</span>
              </p>
            </div>
          )}
          <LoginForm next={next} />
          <LineAutoLogin next={next} />
        </div>
      </section>
    </PageShell>
  );
}
