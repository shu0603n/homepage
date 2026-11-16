"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

// パスワードをお忘れの方：メールアドレスを入力すると、「パスワード再設定のご案内」メール（リンク）が届く。
// リンクを開いて新しいパスワードを決める（/reset-password/）。確認コードの入力はない。
// 登録の有無は分からないよう、どのアドレスでも同じ「お送りしました」を表示する
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sentTo) window.scrollTo({ top: 0, behavior: "instant" });
  }, [sentTo]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/forgot-password/", { email: value });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setSentTo(value);
  }

  if (sentTo) {
    return (
      <div className="form form--auth register-sent">
        <p className="register-sent__icon" aria-hidden="true">
          <i className="bi bi-envelope-check" />
        </p>
        <h2 className="register-sent__title">ご案内メールをお送りしました</h2>
        <p className="register-sent__mail">{sentTo}</p>
        <ol className="register-sent__steps">
          <li>上のメールアドレスに届いた「パスワード再設定のご案内」メールを開いてください。</li>
          <li>メールに記載のリンクを押して、新しいパスワードを決めてください。</li>
        </ol>
        <p className="register-sent__note">
          ※ ご登録のあるメールアドレスの場合のみ、メールが届きます。リンクの有効期限は24時間です。
          <br />※ メールが届かない場合は、迷惑メールフォルダもご確認ください。それでも届かない場合は、お電話にてお問い合わせください。
        </p>
        <ul className="auth-links">
          <li>
            <button type="button" className="auth-links__btn" onClick={() => setSentTo(null)}>
              メールアドレスを入力し直す
            </button>
          </li>
          <li>
            <Link href="/login/">ログインに戻る</Link>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <form className="form form--auth" onSubmit={onSubmit}>
      <p className="form__note">ご登録のメールアドレスを入力してください。パスワード再設定のご案内（リンク）をメールでお送りします。</p>
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
          {busy ? "送信中…" : "ご案内メールを送信する"}
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
