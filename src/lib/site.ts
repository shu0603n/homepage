// サイト全体の設定とナビゲーション定義

export const SITE = {
  siteName: "株式会社エモリスリンク",
  siteUrl: "https://emorislink.co.jp",
  defaultDescription:
    "株式会社エモリスリンクは、札幌を拠点に人材派遣・人材紹介・SES・システム開発・Web制作を通じて、人と企業をつなぐ架け橋となることを目指しています。",
  defaultTitle: "株式会社エモリスリンク | 札幌の人材派遣・人材紹介・SES・システム開発・Web制作",
  tel: "011-590-4888",
  mail: "info@emorislink.co.jp",

  // 公式SNS（フッターにアイコンで表示。url が空のものは表示しない）
  // 公式LINE を開設したら、line の url に友だち追加用の URL（例: 'https://lin.ee/xxxxxxx'）を入れる
  social: [
    { id: "instagram", name: "Instagram", url: "https://www.instagram.com/emorislink_info/" },
    { id: "line", name: "公式LINE", url: "" },
  ],

  // お問い合わせフォームの送信先：AWS Lambda の関数 URL（プログラムは aws/contact/index.mjs、設定手順は aws/contact/README.md）
  // 空のあいだは、送信時に利用者のメールソフトが起動し info@ 宛のメールが作成される（仮の動き）
  formEndpoint: {
    employers: "https://nfv4wni5hb2eo463fjkuwp25su0wknbq.lambda-url.ap-northeast-1.on.aws/",
    seekers: "https://nfv4wni5hb2eo463fjkuwp25su0wknbq.lambda-url.ap-northeast-1.on.aws/",
  },
} as const;

export const telHref = `tel:${SITE.tel.replace(/-/g, "")}`;

export const EMORIS_AGENT_URL = "https://emoris-jobs.com/?utm_medium=instagram&utm_campaign=seeker-2026-11";

export const SERVICES: ReadonlyArray<readonly [string, string]> = [
  ["staffing", "人材派遣"],
  ["recruitment", "人材紹介"],
  ["temp-to-perm", "紹介予定派遣"],
  ["outsourcing", "業務委託"],
  ["ses", "システムエンジニアリング"],
  ["system-development", "システム開発"],
  ["web-design", "WEBデザイン"],
  ["web-marketing", "WEBマーケティング"],
];

export const COMPANY: ReadonlyArray<readonly [string, string]> = [
  ["message", "ご挨拶"],
  ["philosophy", "企業理念"],
  ["about", "会社概要"],
  ["history", "沿革"],
  ["access", "アクセス"],
  ["group-overview", "グループ概要"],
];

export const RECRUIT: ReadonlyArray<readonly [string, string]> = [
  ["system-engineer", "システムエンジニア"],
  ["coordinator", "人材コーディネーター"],
];

export type NavItem = {
  key: string;
  en: string;
  ja: string;
  href: string;
  children: ReadonlyArray<readonly [string, string]>;
};

// グローバルナビ：[セクションキー, 英語, 日本語, トップのパス, 子ページ]
export const NAV: NavItem[] = [
  { key: "company", en: "Company", ja: "企業情報", href: "/company/", children: COMPANY.map(([s, ja]) => [`/company/${s}/`, ja] as const) },
  { key: "service", en: "Service", ja: "事業内容", href: "/service/", children: SERVICES.map(([s, ja]) => [`/service/${s}/`, ja] as const) },
  { key: "recruit", en: "Recruit", ja: "採用情報", href: "/recruit/", children: RECRUIT.map(([s, ja]) => [`/${s}/`, ja] as const) },
];

export const CONTACT_NAV: NavItem = {
  key: "contact",
  en: "Contact",
  ja: "お問い合わせ",
  href: "/contact/",
  children: [
    ["/for-employers/", "企業担当者様"],
    ["/job-seekers/", "お仕事をお探しの方"],
  ],
};

// パスからセクションキーを求める（ヘッダーの現在地表示用）
export function sectionOf(pathname: string): string | null {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (p.startsWith("/company/")) return "company";
  if (p.startsWith("/service/")) return "service";
  if (p === "/recruit/" || p === "/system-engineer/" || p === "/coordinator/") return "recruit";
  if (p === "/contact/" || p === "/for-employers/" || p === "/job-seekers/") return "contact";
  return null;
}
