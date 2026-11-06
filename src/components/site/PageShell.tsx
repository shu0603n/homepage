import type { ReactNode } from "react";
import { PageHero } from "@/components/site/PageHero";
import { jsonLd } from "@/lib/schema";
import { pageDescription, pageImage, type PageMeta } from "@/lib/metadata";
import { SITE } from "@/lib/site";

// 全ページ共通：JSON-LD（構造化データ）とページ先頭の写真を付けて本文を包む
export function PageShell({ route, meta, special, children }: { route: string; meta: PageMeta; special?: boolean; children: ReactNode }) {
  const url = `${SITE.siteUrl}/${route}`;
  const graph = special
    ? null
    : jsonLd({ route, meta, url, desc: pageDescription(meta), image: pageImage(meta), datePosted: BUILD_DATE });
  return (
    <>
      {graph && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\u003c") }} />}
      {meta.hero && <PageHero hero={meta.hero} />}
      {children}
    </>
  );
}

// 求人の掲載日に使う（ビルドした日）
const BUILD_DATE = new Date().toISOString().slice(0, 10);
