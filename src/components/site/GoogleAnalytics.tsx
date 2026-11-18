import Script from "next/script";
import { SITE } from "@/lib/site";

// Google アナリティクス（GA4）。全ページで読み込む。
// サイト内でページを移ったときの計測は、GA4 の「拡張計測機能」（ブラウザの履歴の変化でページビューを送る）に任せる。
// 手元で動かしたとき（localhost など）は計測しない
export function GoogleAnalytics() {
  const id = SITE.gaMeasurementId;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`if (!/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)) {
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
}`}
      </Script>
    </>
  );
}
