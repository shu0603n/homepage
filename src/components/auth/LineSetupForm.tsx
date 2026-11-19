"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

// LINE から来て、まだ連携していない方のパスワード設定（ログイン画面に出す）。
// ご登録のメールアドレスに「パスワード設定リンク」を送る（api/auth/line-setup）。
// リンクから開いた画面でパスワードを決めると、この LINE と連携される（/password-setup/line/）
export function LineSetupForm() {
  const [sentTo, setSentTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/line-setup/", { email });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setSentTo(email);
  }

  return (
    <section className="form form--auth line-setup" aria-labelledby="line-setup-title">
      <h2 className="form__group" id="line-setup-title">
        パスワードを設定して LINE と連携する
      </h2>

      {sentTo ? (
        <div className="line-setup__sent" role="status">
          <p className="line-setup__sent-icon">
            <i className="bi bi-envelope-check" aria-hidden="true" />
          </p>
          <p>
            <strong className="line-setup__sent-mail">{sentTo}</strong>
          </p>
          <p className="form__note">
            ご登録のメールアドレスであれば、パスワード設定のご案内をお送りしました。
            <br />
            メールのリンクを開いてパスワードを設定すると、この LINE と連携されます（リンクの有効期限は24時間）。
            <br />
            届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <p className="line-setup__back">
            <button type="button" className="link-button" onClick={() => setSentTo("")}>
              メールアドレスを入力し直す
            </button>
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <p className="form__note">ご登録のメールアドレスに、パスワード設定のご案内をお送りします。</p>
          <div className="form__row">
            <label className="form__label" htmlFor="ls-email">
              ご登録のメールアドレス
            </label>
            <div>
              <input id="ls-email" type="email" name="email" autoComplete="email" required />
            </div>
          </div>
          <div className="form__actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "送信中…" : "パスワード設定のメールを送る"}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
