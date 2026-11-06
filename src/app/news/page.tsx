import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "お知らせ",
  description: "株式会社エモリスリンクからのお知らせ一覧です。会社の最新情報をお届けします。",
  section: "news",
  hero: {
    en: "News",
    ja: "お知らせ",
    img: "top-access-1.jpg"
  }
} as const;

export const metadata: Metadata = buildMetadata("news/", meta);

export default function NewsPage() {
  return (
    <PageShell route="news/" meta={meta}>
      <section className="section">
        <div className="container container--narrow">
          <ul className="news-list fade">
            <li>
              <Link href="/news/company-established/">
                <time dateTime="2026-02-05">2026.02.05</time>
                <span className="title">株式会社エモリスリンクを設立しました。</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
