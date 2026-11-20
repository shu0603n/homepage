"use client";

import { useEffect, useState } from "react";
import { loadLiffSdk } from "@/components/auth/LineAutoLogin";

// スタッフ登録と LINE の連携を実行する（/jobs/line-link/ の中身。仕組みは lib/line-friend.ts）。
//   LINE ログイン（LIFF）→ 本人の LINE を確かめて連携（/api/auth/line/link/）→ 公式アカウントの友だち追加へ
// LIFF はエンドポイント（/jobs/）の下のページでしか確実に動かないため、このページは /jobs/line-link/ に置いている
type State =
  | { stage: "working" }
  | { stage: "done"; result: "linked" | "already" | "other_line" | "taken"; friendUrl: string }
  | { stage: "error"; message: string };

const RESULT_TEXT: Record<"linked" | "already" | "other_line" | "taken", { ok: boolean; title: string; text: string }> = {
  linked: { ok: true, title: "LINE と連携しました", text: "続けて、LINE 公式アカウントを友だち追加してください。" },
  already: { ok: true, title: "LINE と連携済みです", text: "LINE 公式アカウントを友だち追加してご利用ください。" },
  other_line: {
    ok: false,
    title: "別の LINE と連携済みです",
    text: "このスタッフ登録には、すでに別の LINE アカウントが連携されています。LINE を変更したい場合は、お手数ですがお電話にてお問い合わせください。",
  },
  taken: {
    ok: false,
    title: "この LINE は別の登録と連携済みです",
    text: "お使いの LINE アカウントは、別のスタッフ登録と連携されています。お心当たりがない場合は、お電話にてお問い合わせください。",
  },
};

export function LineLinkRunner({ ticket }: { ticket: string }) {
  const [state, setState] = useState<State>({ stage: "working" });

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    let cancelled = false;
    (async () => {
      try {
        if (!liffId) throw new Error("LIFF not configured");
        const liff = await loadLiffSdk();
        await liff.init({ liffId });
        if (cancelled) return;
        // まだ LINE でログインしていなければ LINE のログインへ（戻り先はこのページ。引換券も URL に入ったまま）
        if (!liff.isLoggedIn()) return liff.login({ redirectUri: window.location.href });
        // 以前のログインの ID トークンは期限切れのことがある（LIFF は自動で更新しない）。その場合はログインし直す
        const exp = liff.getDecodedIDToken?.()?.exp;
        const idToken = liff.getIDToken();
        if (!idToken || (exp && exp * 1000 <= Date.now())) {
          liff.logout?.();
          return liff.login({ redirectUri: window.location.href });
        }
        const res = await fetch("/api/auth/line/link/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket, idToken }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; result?: keyof typeof RESULT_TEXT; friendUrl?: string } | null;
        if (cancelled) return;
        if (!res.ok || !data?.ok || !data.result) {
          setState({ stage: "error", message: data?.message ?? "連携に失敗しました。時間をおいて再度お試しください。" });
          return;
        }
        setState({ stage: "done", result: data.result, friendUrl: data.friendUrl ?? "" });
        // 連携できたら、少しお知らせを見せてから友だち追加の画面へ進む
        if ((data.result === "linked" || data.result === "already") && data.friendUrl) {
          window.setTimeout(() => window.location.assign(data.friendUrl!), 1800);
        }
      } catch (error) {
        console.error("LINE link failed:", error);
        if (!cancelled) setState({ stage: "error", message: "LINE との連携を開始できませんでした。時間をおいて再度お試しください。" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticket]);

  if (state.stage === "working") {
    return (
      <p className="line-auto-login" role="status">
        <span className="line-auto-login__spinner" aria-hidden="true" />
        LINE と連携しています…
      </p>
    );
  }
  if (state.stage === "error") {
    return (
      <div className="form form--auth line-link-result">
        <p className="form__status is-ng" role="alert">
          {state.message}
        </p>
      </div>
    );
  }
  const t = RESULT_TEXT[state.result];
  return (
    <div className="form form--auth line-link-result register-sent">
      <p className={`register-sent__icon${t.ok ? "" : " is-ng"}`}>
        <i className={`bi ${t.ok ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} aria-hidden="true" />
      </p>
      <h2 className="register-sent__title">{t.title}</h2>
      <p className="line-link-result__text">{t.text}</p>
      {t.ok && state.friendUrl && (
        <a className="line-step__btn" href={state.friendUrl}>
          <i className="bi bi-line" aria-hidden="true" />
          LINE 公式アカウントを友だち追加する
        </a>
      )}
    </div>
  );
}
