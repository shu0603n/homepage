"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// 問い合わせの「対応済み」チェック。押すとすぐ保存し、一覧（未対応の件数など）を読み直す
export function InquiryHandledToggle({ id, handled }: { id: number; handled: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(handled);
  const [busy, setBusy] = useState(false);
  return (
    <label className="admin-handled">
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.checked;
          setBusy(true);
          setChecked(next);
          const res = await fetch(`/api/admin/inquiries/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handled: next }) }).catch(() => null);
          setBusy(false);
          if (!res?.ok) {
            setChecked(!next);
            alert("保存できませんでした。時間をおいてもう一度お試しください。");
            return;
          }
          router.refresh();
        }}
      />
      対応済み
    </label>
  );
}
