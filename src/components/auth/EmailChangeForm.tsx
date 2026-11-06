"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

type Step = "request" | "confirm" | "done";

// メールアドレスの変更：①新しいメールアドレスと現在のパスワードを入力 → ②新しいメールに届いた確認コードを入力
export function EmailChangeForm({ currentEmail, canChange }: { currentEmail: string | null; canChange: boolean }) {
  const [step, setStep] = useState<Step>("request");
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("newEmail") ?? "").trim();
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/profile/email/", { newEmail: email, password: fd.get("password") });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setNewEmail(email);
    setStep("confirm");
  }

  async function confirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/profile/email/confirm/", { code });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setStep("done");
    // 画面上のメールアドレス表示を新しいものにするため、少し待って読み込み直す
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <section id="email-change" className="form form--auth mypage-section" aria-labelledby="email-change-title">
      <h2 className="form__group" id="email-change-title">
        メールアドレスの変更
      </h2>
      <p className="form__note">
        現在のメールアドレス：<strong>{currentEmail ?? "（未登録）"}</strong>
        <br />
        メールアドレスはログインにも使われます。変更後は、新しいメールアドレスでログインしてください。
      </p>

      {!canChange && <p className="form__status is-ng">この方法でログインしている場合は、メールアドレスを変更できません。</p>}

      {canChange && step === "request" && (
        <form onSubmit={sendCode}>
          <div className="form__row">
            <label className="form__label" htmlFor="ec-new">
              新しいメールアドレス
            </label>
            <div>
              <input id="ec-new" type="email" name="newEmail" autoComplete="email" required />
            </div>
          </div>
          <div className="form__row">
            <label className="form__label" htmlFor="ec-password">
              現在のパスワード
            </label>
            <div>
              <input id="ec-password" type="password" name="password" autoComplete="current-password" required />
              <p className="form__help">ご本人確認のために入力してください。</p>
            </div>
          </div>
          <div className="form__actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "送信中…" : "確認コードを送信"}
            </button>
          </div>
        </form>
      )}

      {canChange && step === "confirm" && (
        <form onSubmit={confirm}>
          <p className="form__note">{newEmail} 宛に確認コード（6桁）を送信しました。メールに記載のコードを入力してください（有効期限15分）。</p>
          <div className="form__row">
            <label className="form__label" htmlFor="ec-code">
              確認コード
            </label>
            <div>
              <input id="ec-code" type="text" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
            </div>
          </div>
          <div className="form__actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "確認中…" : "メールアドレスを変更する"}
            </button>
          </div>
          <ul className="auth-links">
            <li>
              <button type="button" className="auth-links__btn" onClick={() => setStep("request")}>
                メールアドレスを入力し直す
              </button>
            </li>
          </ul>
        </form>
      )}

      {step === "done" && (
        <p className="form__status is-ok" role="status">
          メールアドレスを変更しました。次回からは新しいメールアドレスでログインしてください。
        </p>
      )}

      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
