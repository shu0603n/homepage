"use client";

import { useEffect } from "react";
import { postJson } from "@/components/auth/api";

// LINE アプリ内ブラウザ（LIFF）でログイン画面が開かれたとき、LINE のアカウントで自動ログインする。
// NEXT_PUBLIC_LIFF_ID が未設定のあいだは何もしない（LINE 側を設定したら有効になる）。

type Liff = {
  init: (config: { liffId: string }) => Promise<void>;
  isInClient: () => boolean;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getIDToken: () => string | null;
};

declare global {
  interface Window {
    liff?: Liff;
  }
}

const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadLiffSdk(): Promise<Liff> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve(window.liff);
    const script = document.createElement("script");
    script.src = LIFF_SDK_URL;
    script.async = true;
    script.onload = () => (window.liff ? resolve(window.liff) : reject(new Error("LIFF SDK not available")));
    script.onerror = () => reject(new Error("LIFF SDK failed to load"));
    document.head.appendChild(script);
  });
}

export function LineAutoLogin({ next }: { next: string }) {
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;
    let cancelled = false;

    (async () => {
      try {
        const liff = await loadLiffSdk();
        await liff.init({ liffId });
        if (cancelled || !liff.isInClient()) return; // 通常のブラウザでは自動ログインしない
        if (!liff.isLoggedIn()) return liff.login({ redirectUri: window.location.href });
        const idToken = liff.getIDToken();
        if (!idToken) return;
        const result = await postJson("/api/auth/line/", { idToken });
        if (result.ok && !cancelled) window.location.assign(next);
      } catch (error) {
        console.error("LINE auto login skipped:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [next]);

  return null;
}
