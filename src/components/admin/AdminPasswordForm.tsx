"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

export function AdminPasswordForm({ min }: { min: number }) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("next") !== fd.get("next2")) return setMessage({ text: "新しいパスワード（確認）が一致しません。", ok: false });
    setBusy(true);
    setMessage(null);
    const result = await postJson("/api/admin/password/", { current: fd.get("current"), next: fd.get("next") });
    setBusy(false);
    if (result.ok) {
      form.reset();
      setMessage({ text: "パスワードを変更しました。次回から新しいパスワードでログインしてください。", ok: true });
    } else {
      setMessage({ text: result.message, ok: false });
    }
  }

  const type = show ? "text" : "password";
  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {message && (
        <p className={`adm-alert ${message.ok ? "is-ok" : "is-ng"}`} role="status">
          {message.text}
        </p>
      )}
      <label className="adm-field">
        <span>今のパスワード</span>
        <input key={`c${show}`} type={type} name="current" autoComplete="current-password" required />
      </label>
      <label className="adm-field">
        <span>新しいパスワード</span>
        <input key={`n${show}`} type={type} name="next" autoComplete="new-password" minLength={min} required />
      </label>
      <label className="adm-field">
        <span>新しいパスワード（確認）</span>
        <input key={`n2${show}`} type={type} name="next2" autoComplete="new-password" minLength={min} required />
      </label>
      <label className="adm-check">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        入力したパスワードを表示する
      </label>
      <button className="adm-btn adm-btn--block" type="submit" disabled={busy}>
        {busy ? "変更しています…" : "パスワードを変更する"}
      </button>
    </form>
  );
}
