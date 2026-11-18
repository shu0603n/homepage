"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

export function AdminLoginForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/admin/login/", { email: fd.get("email"), password: fd.get("password") });
    if (result.ok) {
      window.location.assign("/admin/");
      return;
    }
    setBusy(false);
    setMessage(result.message);
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {message && (
        <p className="adm-alert is-ng" role="alert">
          {message}
        </p>
      )}
      <label className="adm-field">
        <span>メールアドレス</span>
        <input type="email" name="email" autoComplete="username" required />
      </label>
      <label className="adm-field">
        <span>パスワード</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      <button className="adm-btn adm-btn--block" type="submit" disabled={busy}>
        {busy ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
