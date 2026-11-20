import type { Metadata } from "next";
import { LineLinkRunner } from "@/components/auth/LineLinkRunner";
import { PageShell } from "@/components/site/PageShell";
import { readLineLinkTicket } from "@/lib/line-friend";
import { buildMetadata } from "@/lib/metadata";

// スタッフ登録と LINE の連携（登録完了・来社登録・マイページの「LINE で友だち追加する」の行き先。仕組みは lib/line-friend.ts）。
// LIFF のエンドポイント（/jobs/）の下に置く必要があるため、このパスにしている
const meta = {
  title: "LINE 連携",
  description: "株式会社エモリスリンクのスタッフ登録と LINE を連携します。",
  section: "contact",
  hero: { en: "LINE", ja: "LINE 連携", img: "hero-register.jpg" },
} as const;

export const metadata: Metadata = { ...buildMetadata("jobs/line-link/", meta), robots: { index: false, follow: false } };

export default async function LineLinkPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const valid = (await readLineLinkTicket(t)) !== null;

  return (
    <PageShell route="jobs/line-link/" meta={meta}>
      <section className="section">
        <div className="container">
          {valid && t ? (
            <LineLinkRunner ticket={t} />
          ) : (
            <div className="form form--auth">
              <p className="form__status is-ng" role="alert">
                このリンクは有効期限が切れているか、正しくありません。
              </p>
              <p className="form__note">お手数ですが、マイページの「LINE で友だち追加する」から、もう一度お試しください。</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
