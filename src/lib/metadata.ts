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

export function pageImage(meta: PageMeta): string {
  return `${SITE.siteUrl}/assets/img/${meta.ogImage || meta.hero?.img || "contact-bg.jpg"}`;
}

export function buildMetadata(route: string, meta: PageMeta): Metadata {
  const title = pageTitle(meta);
  const description = pageDescription(meta);
  const url = `${SITE.siteUrl}/${route}`;
  const image = pageImage(meta);
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
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
