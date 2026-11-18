import Script from "next/script";
import { SITE } from "@/lib/site";

// Google タグ マネージャー（GTM）。全ページで読み込む。
// GA4（G-9X8WDKWNDL）などの計測タグは GTM の画面で管理する（ここで GA4 を直接読み込むと二重に計測されるため入れない）。
// サイト内でページを移ったときの計測は、GA4 の「拡張計測機能」（ブラウザの履歴の変化でページビューを送る）に任せる。
// 手元で動かしたとき（localhost など）と、内勤用の管理ページ（/admin/）では読み込まない
export function GoogleTagManager() {
  const id = SITE.gtmContainerId;
  if (!id) return null;
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`if (!/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname) && !location.pathname.startsWith('/admin')) {
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');
}`}
    </Script>
  );
}

// JavaScript が動かない環境向けの GTM（body の先頭に置く）
export function GoogleTagManagerNoScript() {
  const id = SITE.gtmContainerId;
  if (!id) return null;
  return (
    <noscript>
      <iframe src={`https://www.googletagmanager.com/ns.html?id=${id}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" />
    </noscript>
  );
}
