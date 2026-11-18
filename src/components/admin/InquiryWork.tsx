"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// 問い合わせごとの「担当者」と「内部メモ」（社内だけで見るもの。お客さまには届かない）。
// 担当者は選んだ時点で保存。メモは「メモを保存」で保存し、最後に書いた人と日時を出す
type Props = {
  id: number;
  admins: { id: number; label: string }[];
  assigneeId: number | null;
  memo: string;
  memoInfo: string | null; // 例：「山田 花子・2026/11/18 15:20」
};

async function patch(id: number, body: object): Promise<{ ok: boolean; message?: string; memoSavedAt?: string; memoSavedBy?: string }> {
  try {
    const res = await fetch(`/api/admin/inquiries/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; memoSavedAt?: string; memoSavedBy?: string } | null;
    return res.ok && data?.ok ? { ok: true, memoSavedAt: data.memoSavedAt, memoSavedBy: data.memoSavedBy } : { ok: false, message: data?.message ?? "保存できませんでした。" };
  } catch {
    return { ok: false, message: "通信に失敗しました。" };
  }
}

const stamp = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function InquiryWork({ id, admins, assigneeId, memo: initialMemo, memoInfo: initialInfo }: Props) {
  const router = useRouter();
  const [assignee, setAssignee] = useState(assigneeId === null ? "" : String(assigneeId));
  const [memo, setMemo] = useState(initialMemo);
  const [saved, setSaved] = useState(initialMemo);
  const [info, setInfo] = useState(initialInfo);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  // 「対応済み」にチェックして担当者が自動で入ったとき（画面の再読み込みで assigneeId が変わる）、選択欄も合わせる
  const [prevAssigneeId, setPrevAssigneeId] = useState(assigneeId);
  if (assigneeId !== prevAssigneeId) {
    setPrevAssigneeId(assigneeId);
    setAssignee(assigneeId === null ? "" : String(assigneeId));
  }
  const dirty = memo.trim() !== saved.trim();
  // 削除された管理者が担当のままの場合も、選択肢に出しておく
  const options = assigneeId !== null && !admins.some((a) => a.id === assigneeId) ? [...admins, { id: assigneeId, label: "（削除された管理者）" }] : admins;

  async function changeAssignee(value: string) {
    const before = assignee;
    setAssignee(value);
    setBusy(true);
    const r = await patch(id, { assignee_id: value ? Number(value) : null });
    setBusy(false);
    if (!r.ok) {
      setAssignee(before);
      setStatus({ text: r.message ?? "保存できませんでした。", ok: false });
      return;
    }
    setStatus({ text: value ? "担当者を保存しました。" : "担当者を未設定にしました。", ok: true });
    router.refresh();
  }

  async function saveMemo() {
    setBusy(true);
    const r = await patch(id, { memo });
    setBusy(false);
    if (!r.ok) return setStatus({ text: r.message ?? "保存できませんでした。", ok: false });
    setSaved(memo);
    setInfo(r.memoSavedAt ? `${r.memoSavedBy ?? ""}・${stamp(r.memoSavedAt)}` : null);
    setStatus({ text: memo.trim() ? "メモを保存しました。" : "メモを消しました。", ok: true });
    router.refresh();
  }

  return (
    <div className="adm-work">
      <p className="adm-work__title">
        <i className="bi bi-lock" aria-hidden="true" />
        社内用（お客さまには表示されません）
      </p>
      <label className="adm-work__assignee">
        <span>担当者</span>
        <select value={assignee} disabled={busy} onChange={(e) => changeAssignee(e.target.value)}>
          <option value="">未設定</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="adm-work__memo">
        <span>内部メモ</span>
        <textarea value={memo} maxLength={5000} rows={4} placeholder="対応の状況や引き継ぎ事項など（例：11/18 電話済み。来週の面談で詳細を説明）" onChange={(e) => setMemo(e.target.value)} />
      </label>
      <div className="adm-work__foot">
        <span className="adm-work__info">{info ? `最終更新：${info}` : "メモはまだありません"}</span>
        <button type="button" className="adm-chipbtn" disabled={busy || !dirty} onClick={saveMemo}>
          <i className="bi bi-save" aria-hidden="true" />
          メモを保存
        </button>
      </div>
      {status && (
        <p className={`adm-work__status ${status.ok ? "is-ok" : "is-ng"}`} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}
