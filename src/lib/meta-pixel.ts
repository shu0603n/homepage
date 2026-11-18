// Meta Pixel（Instagram・Facebook 広告の効果測定）。ブラウザーから Meta へ計測を送る。
//
// 送るのは本番のドメイン（www.emorislink.co.jp）でだけ。手元（localhost）・Amplify の確認用アドレス・管理ページ（/admin/）からは送らない。
// 個人情報（氏名・メール・電話番号など）はイベントに一切入れない。
//
// 今後 Conversions API（サーバーから Meta へ送る仕組み）を足すときのため、イベントには eventID を付けられるようにしてある
// （同じ eventID をサーバーからも送ると、Meta 側で1件にまとめてくれる）

import { SITE } from "@/lib/site";

const PRODUCTION_HOSTS = new Set(["www.emorislink.co.jp"]);

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    __emorisMetaPixel?: boolean; // このサイトで init 済みか（二重に init しないため）
  }
}

// この画面で Meta Pixel を動かしてよいか
export function metaPixelEnabled(): boolean {
  if (typeof window === "undefined" || !SITE.metaPixelId) return false;
  return PRODUCTION_HOSTS.has(window.location.hostname) && !window.location.pathname.startsWith("/admin");
}

// Meta の標準のコード（fbevents.js を後から読み込む）。既に fbq があれば（タグ マネージャー等で入っていれば）読み込まない
export function loadMetaPixel(): boolean {
  if (!metaPixelEnabled()) return false;
  if (!window.fbq) {
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  if (!window.__emorisMetaPixel) {
    window.fbq("init", SITE.metaPixelId);
    window.__emorisMetaPixel = true;
  }
  return true;
}

// 標準イベントを送る（PageView・SubmitApplication など）。params に個人情報を入れないこと
export function trackMeta(event: string, params?: Record<string, string | number>, eventId?: string): void {
  if (!loadMetaPixel() || !window.fbq) return;
  if (eventId) window.fbq("track", event, params ?? {}, { eventID: eventId });
  else if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}

// 送ったイベントを後からサーバー側（Conversions API）と突き合わせるための ID
export function newEventId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
