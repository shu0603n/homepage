"use client";

import { useEffect, useState } from "react";

// 案件の「気になる」ボタンと、反応（表示・クリック・閲覧）の記録

export type JobRef = { kind: "project" | "recruit"; id: number };

// 反応を記録する。画面を移っても届くよう sendBeacon（使えなければ keepalive 付きの fetch）で送る
export function trackJobs(event: "list" | "click" | "detail", jobs: JobRef[]) {
  if (jobs.length === 0) return;
  const body = JSON.stringify({ event, jobs });
  try {
    if (navigator.sendBeacon?.("/api/jobs/track/", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* sendBeacon が使えない環境 */
  }
  fetch("/api/jobs/track/", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

// 詳細ページを開いたことを1回だけ記録する
export function JobDetailView({ job }: { job: JobRef }) {
  useEffect(() => {
    trackJobs("detail", [job]);
  }, [job]);
  return null;
}

// 「気になる」ボタン。押すとすぐ見た目を切り替え、保存に失敗したら元に戻す
export function FavoriteButton({ job, initial, variant = "icon", onChange }: { job: JobRef; initial: boolean; variant?: "icon" | "full"; onChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await fetch("/api/jobs/favorite/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...job, on: next }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setOn(!next);
      alert("保存できませんでした。時間をおいてもう一度お試しください。");
      return;
    }
    onChange?.(next);
  }

  const label = on ? "気になるから外す" : "気になるに追加";
  return (
    <button type="button" className={`fav-btn fav-btn--${variant}${on ? " is-on" : ""}`} aria-pressed={on} aria-label={variant === "icon" ? label : undefined} title={label} onClick={toggle}>
      <i className={`bi ${on ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
      {variant === "full" && <span>{on ? "気になる（追加済み）" : "気になる"}</span>}
    </button>
  );
}
