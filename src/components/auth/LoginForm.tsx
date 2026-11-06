"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

export function LoginForm({ next }: { next: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/login/", { email: fd.get("email"), password: fd.get("password") });
    if (result.ok) {
      // Cookie を反映させるためページ全体を読み込み直して移動する
      window.location.assign(next);
      return;
    }
    setMessage(result.message);
    setBusy(false);
  }

  return (
    <form className="form form--auth" onSubmit={onSubmit}>
      <div className="form__row">
        <label className="form__label" htmlFor="login-email">
          メールアドレス
        </label>
        <div>
          <input id="login-email" type="email" name="email" autoComplete="email" required />
        </div>
      </div>
      <div className="form__row">
        <label className="form__label" htmlFor="login-password">
          パスワード
        </label>
        <div>
          <input id="login-password" type="password" name="password" autoComplete="current-password" required />
        </div>
      </div>
      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "ログイン中…" : "ログイン"}
        </button>
      </div>
      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
      <ul className="auth-links">
        <li>
          <Link href="/forgot-password/">パスワードをお忘れの方</Link>
        </li>
        <li>
          <Link href="/register/">はじめての方（スタッフ登録）</Link>
        </li>
      </ul>
    </form>
  );
}
