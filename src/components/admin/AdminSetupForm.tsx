"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

export function AdminSetupForm({ token, min }: { token: string; min: number }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("password2")) return setMessage("パスワード（確認）が一致しません。");
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/admin/setup/", { token, password: fd.get("password") });
    if (result.ok) {
      window.location.assign("/admin/");
      return;
    }
    setBusy(false);
    setMessage(result.message);
  }

  const type = show ? "text" : "password";
  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {message && (
        <p className="adm-alert is-ng" role="alert">
          {message}
        </p>
      )}
      <label className="adm-field">
        <span>パスワード</span>
        <input key={`p${show}`} type={type} name="password" autoComplete="new-password" minLength={min} required />
      </label>
      <label className="adm-field">
        <span>パスワード（確認）</span>
        <input key={`p2${show}`} type={type} name="password2" autoComplete="new-password" minLength={min} required />
      </label>
      <label className="adm-check">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        入力したパスワードを表示する
      </label>
      <button className="adm-btn adm-btn--block" type="submit" disabled={busy}>
        {busy ? "設定しています…" : "パスワードを設定してログイン"}
      </button>
    </form>
  );
}
