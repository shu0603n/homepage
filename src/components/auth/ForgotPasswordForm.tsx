"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

type Step = "email" | "reset" | "done";

// パスワードリセット：①メールアドレスを入力 → ②届いた確認コードと新しいパスワードを入力
export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/forgot-password/", { email: value });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setEmail(value);
    setStep("reset");
  }

  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("password2")) return setMessage("パスワードが一致しません。");
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/reset-password/", { email, code: fd.get("code"), password: fd.get("password") });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="form form--auth">
        <p className="form__status is-ok">パスワードを変更しました。新しいパスワードでログインしてください。</p>
        <div className="form__actions">
          <Link className="btn" href="/login/">
            ログインへ
          </Link>
        </div>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form className="form form--auth" onSubmit={resetPassword}>
        <p className="form__note">
          {email} 宛に確認コードを送信しました（登録がある場合）。メールに記載のコードと、新しいパスワードを入力してください。
        </p>
        <div className="form__row">
          <label className="form__label" htmlFor="reset-code">
            確認コード
          </label>
          <div>
            <input id="reset-code" type="text" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          </div>
        </div>
        <div className="form__row">
          <label className="form__label" htmlFor="reset-password">
            新しいパスワード
          </label>
          <div>
            <input id="reset-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
            <p className="form__help">英大文字・英小文字・数字を含む8文字以上</p>
          </div>
        </div>
        <div className="form__row">
          <label className="form__label" htmlFor="reset-password2">
            新しいパスワード（確認）
          </label>
          <div>
            <input id="reset-password2" type="password" name="password2" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
        <div className="form__actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "変更中…" : "パスワードを変更する"}
          </button>
        </div>
        {message && (
          <p className="form__status is-ng" role="alert">
            {message}
          </p>
        )}
        <ul className="auth-links">
          <li>
            <button type="button" className="auth-links__btn" onClick={() => setStep("email")}>
              メールアドレスを入力し直す
            </button>
          </li>
        </ul>
      </form>
    );
  }

  return (
    <form className="form form--auth" onSubmit={sendCode}>
      <p className="form__note">ご登録のメールアドレスを入力してください。パスワード再設定用の確認コードをお送りします。</p>
      <div className="form__row">
        <label className="form__label" htmlFor="forgot-email">
          メールアドレス
        </label>
        <div>
          <input id="forgot-email" type="email" name="email" autoComplete="email" required />
        </div>
      </div>
      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "送信中…" : "確認コードを送信"}
        </button>
      </div>
      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
      <ul className="auth-links">
        <li>
          <Link href="/login/">ログインに戻る</Link>
        </li>
      </ul>
    </form>
  );
}
