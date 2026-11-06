import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SiteBehavior } from "@/components/site/SiteBehavior";
import { SITE } from "@/lib/site";
import "./site.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.siteUrl),
  title: SITE.defaultTitle,
  description: SITE.defaultDescription,
  icons: {
    icon: [{ url: "/assets/img/favicon-32.png", sizes: "32x32" }],
    apple: "/assets/img/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004968",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Caveat:wght@600&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
          integrity="sha384-XGjxtQfXaH2tnPFa9x+ruJTuLE3Aa6LhHSWRr1XeTyhezb4abCG4ccI5AkVDxqC+"
          crossOrigin="anonymous"
        />
        {/* JavaScript が動く環境では .js を付け、演出用の初期状態を CSS 側で切り替える */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body id="top" suppressHydrationWarning>
        <a className="skip-link" href="#main">
          本文へスキップ
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <SiteBehavior />
      </body>
    </html>
  );
}
