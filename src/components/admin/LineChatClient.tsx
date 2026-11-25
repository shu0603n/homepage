"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// 個別チャットの入力欄（Enter で改行、Ctrl＋Enter／⌘＋Enter で送信）
export function LineChatComposer({ to, disabled }: { to: string; disabled: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/line/messages/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, text }) });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "送信できませんでした。");
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-line__composer">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void send();
          }
        }}
        rows={3}
        maxLength={2000}
        disabled={disabled || busy}
        placeholder={disabled ? "この方には送れません（ブロック中、または LINE との接続が未設定）" : "メッセージを入力（Ctrl＋Enter で送信）"}
        aria-label="送るメッセージ"
      />
      <button type="button" className="adm-chipbtn adm-line__send" onClick={send} disabled={disabled || busy || !text.trim()}>
        <i className="bi bi-send" aria-hidden="true" />
        {busy ? "送信中…" : "送信"}
      </button>
      {error && (
        <p className="adm-line__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// 開いている間、interval ミリ秒ごとに新しいメッセージを取りに行く（画面が見えているときだけ）。scroll なら開いたときにやり取りの一番下へ
export function LineAutoRefresh({ interval = 15000, scroll = true }: { interval?: number; scroll?: boolean }) {
  const router = useRouter();
  const first = useRef(true);
  useEffect(() => {
    const list = document.querySelector(".adm-line__messages");
    if (scroll && list && first.current) {
      list.scrollTop = list.scrollHeight;
      first.current = false;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, interval);
    return () => window.clearInterval(timer);
  }, [router, interval, scroll]);
  return null;
}

// 既存の友だちの取り込み（受信先を切り替える前からの友だち）
export function LineImportButton({ small = false }: { small?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function run() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/line/import/", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; added?: number; remaining?: number; source?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "取り込みに失敗しました。");
      setNote(
        `${data.added ?? 0}人を取り込みました${data.source === "staff" ? "（LINE 連携済みのスタッフから）" : ""}。` +
          (data.remaining ? `残り${data.remaining}人います。もう一度押してください。` : ""),
      );
      router.refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "取り込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className={`adm-line__importbtn${small ? " is-small" : ""}`}>
      <button type="button" className="adm-chipbtn" onClick={run} disabled={busy}>
        <i className="bi bi-cloud-download" aria-hidden="true" />
        {busy ? "取り込み中…" : "既存の友だちを取り込む"}
      </button>
      {note && <small>{note}</small>}
    </span>
  );
}

// 「ブロック状況を確認」：一覧の友だちを LINE に問い合わせて、ブロック中の印を付け直す（400 人ずつ、続きがあれば続けて確かめる）
export function LineBlockCheckButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function run() {
    setBusy(true);
    setNote("");
    const total = { checked: 0, blocked: 0, newlyBlocked: 0, unblocked: 0, failed: 0 };
    try {
      let after: string | null = null;
      for (let round = 0; round < 50; round++) {
        const res: Response = await fetch("/api/admin/line/check-blocked/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ after }) });
        const data = (await res.json().catch(() => null)) as ({ ok?: boolean; message?: string; next?: string | null } & typeof total) | null;
        if (!res.ok || !data?.ok) throw new Error(data?.message ?? "確認に失敗しました。");
        for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += data[k] ?? 0;
        setNote(`確認中…（${total.checked + total.failed}人）`);
        if (!data.next) break;
        after = data.next;
      }
      setNote(
        `${total.checked}人を確認しました。ブロック中（または友だちでない）：${total.blocked}人` +
          (total.newlyBlocked ? `（新たに印を付けた人：${total.newlyBlocked}人）` : "") +
          (total.unblocked ? `。友だちに戻っていた人：${total.unblocked}人` : "") +
          (total.failed ? `。確認できなかった人：${total.failed}人（時間をおいてもう一度押してください）` : "") +
          "。",
      );
      router.refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "確認に失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="adm-line__importbtn is-small">
      <button type="button" className="adm-chipbtn" onClick={run} disabled={busy}>
        <i className={`bi ${busy ? "bi-hourglass-split" : "bi-person-slash"}`} aria-hidden="true" />
        {busy ? "確認しています…" : "ブロック状況を確認"}
      </button>
      {note && <small>{note}</small>}
    </span>
  );
}
