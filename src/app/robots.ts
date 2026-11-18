import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // 管理ページ（/admin/）と API は検索の対象外
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }, sitemap: `${SITE.siteUrl}/sitemap.xml` };
}
