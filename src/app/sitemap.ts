import type { MetadataRoute } from "next";
import { COMPANY, RECRUIT, SERVICES, SITE } from "@/lib/site";

const ROUTES = [
  "",
  "company/",
  ...COMPANY.map(([s]) => `company/${s}/`),
  "service/",
  ...SERVICES.map(([s]) => `service/${s}/`),
  "recruit/",
  ...RECRUIT.map(([s]) => `${s}/`),
  "contact/",
  "for-employers/",
  "job-seekers/",
  "news/",
  "news/company-established/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((r) => ({ url: `${SITE.siteUrl}/${r}`, lastModified }));
}
