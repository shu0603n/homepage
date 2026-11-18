import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export type PageMeta = {
  title?: string;
  description?: string;
  section?: string;
  bodyClass?: string;
  ogImage?: string;
  hero?: {
    en: string;
    ja: string;
    img?: string;
    crumbs?: ReadonlyArray<readonly [string, string]>;
    current?: string;
    noH1?: boolean;
  };
};

export function pageTitle(meta: PageMeta): string {
  return meta.title ? `${meta.title} | ${SITE.siteName}` : SITE.defaultTitle;
}

export function pageDescription(meta: PageMeta): string {
  return meta.description || SITE.defaultDescription;
}

// SNS・LINE などで共有したときに出る画像。全ページ共通のロゴ入り画像（1200×630）を使う。
// ページごとに変えたいときだけ、そのページの meta に ogImage を書く
const OGP_IMAGE = { file: "ogp.jpg", width: 1200, height: 630 } as const;

export function pageImage(meta: PageMeta): string {
  return `${SITE.siteUrl}/assets/img/${meta.ogImage || OGP_IMAGE.file}`;
}

function ogImages(meta: PageMeta) {
  const url = pageImage(meta);
  return meta.ogImage ? [{ url, alt: SITE.siteName }] : [{ url, width: OGP_IMAGE.width, height: OGP_IMAGE.height, alt: SITE.siteName }];
}

export function buildMetadata(route: string, meta: PageMeta): Metadata {
  const title = pageTitle(meta);
  const description = pageDescription(meta);
  const url = `${SITE.siteUrl}/${route}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: route ? "article" : "website",
      locale: "ja_JP",
      siteName: SITE.siteName,
      title,
      description,
      url,
      images: ogImages(meta),
    },
    twitter: { card: "summary_large_image", title, description, images: ogImages(meta) },
  };
}
