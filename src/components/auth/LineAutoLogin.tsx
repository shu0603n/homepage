"use client";

import { useEffect } from "react";

// LINE アプリ内ブラウザ（LIFF）で開かれたとき、LINE のアカウントで自動ログインする。
// NEXT_PUBLIC_LIFF_ID が未設定のあいだは何もしない。
//
// 使う場所：
//   - 案件一覧（/jobs/）：LINE のリッチメニュー「求人検索」から LIFF で開かれる（LIFF のエンドポイント URL が /jobs/）。
//     LIFF は「エンドポイント URL かその下のページ」でしか確実に動かないため、ログイン画面へ移す前にここで処理する。
//     うまくいかなければ fallback（ログイン画面）へ移る
//   - ログイン画面：LINE アプリ内で開かれていれば試す（失敗してもそのままログイン画面を使える）

export type Liff = {
  init: (config: { liffId: string }) => Promise<void>;
  isInClient: () => boolean;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getIDToken: () => string | null;
  getDecodedIDToken?: () => { exp?: number; name?: string; picture?: string } | null;
  logout?: () => void;
};

declare global {
  interface Window {
    liff?: Liff;
  }
}

const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

// LIFF の SDK を読み込む（スタッフ登録との LINE 連携の画面 /jobs/line-link/ でも使う）
export function loadLiffSdk(): Promise<Liff> {
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

// /api/auth/line/ の応答をログイン画面の案内（/login/?line=…）に合わせる
function reasonOf(status: number): string {
  if (status === 404) return "not_linked";
  if (status === 403) return "blocked";
  return "failed";
}

export function LineAutoLogin({ next, fallback }: { next: string; fallback?: string }) {
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    let cancelled = false;
    const giveUp = (reason?: string) => {
      if (cancelled || !fallback) return;
      const url = new URL(fallback, window.location.origin);
      if (reason) url.searchParams.set("line", reason);
      window.location.replace(url.toString());
    };
    if (!liffId) return giveUp();
    // LINE 側の都合で応答がないときも、ずっと「ログインしています…」のままにしない
    const timer = window.setTimeout(() => giveUp("failed"), 12_000);

    (async () => {
      try {
        const liff = await loadLiffSdk();
        await liff.init({ liffId });
        if (cancelled) return;
        if (!liff.isInClient()) return giveUp(); // 通常のブラウザでは自動ログインしない
        if (!liff.isLoggedIn()) {
          window.clearTimeout(timer); // LINE のログイン画面へ移る
          return liff.login({ redirectUri: window.location.href });
        }
        const idToken = liff.getIDToken();
        if (!idToken) return giveUp("failed");
        const res = await fetch("/api/auth/line/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
        if (cancelled) return;
        if (res.ok) window.location.replace(next);
        else giveUp(reasonOf(res.status));
      } catch (error) {
        console.error("LINE auto login skipped:", error);
        giveUp("failed");
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [next, fallback]);

  return null;
}
