"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

// スタッフ登録：メールのリンクから開いた画面で、ログイン用パスワードを決める。設定できたら登録完了ページへ
export function PasswordSetForm({ token, email }: { token: string; email: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password !== String(fd.get("password2") ?? "")) return setMessage("確認用のパスワードが一致しません。");
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/register/password/", { token, password });
    if (result.ok) {
      // 登録完了ページで、LINE 公式アカウントの友だち追加へ案内する
      window.location.assign("/register/complete/");
      return;
    }
    setMessage(result.message);
    setBusy(false);
  }

  const type = show ? "text" : "password";
  return (
    <form className="form form--auth" onSubmit={onSubmit}>
      <div className="form__row">
        <span className="form__label">メールアドレス</span>
        <div>
          <p className="password-set__mail">{email}</p>
          <p className="form__help">ログインのときに使います。</p>
        </div>
      </div>
      <div className="form__row">
        <label className="form__label" htmlFor="set-password">
          パスワード
        </label>
        <div>
          <input id="set-password" type={type} name="password" autoComplete="new-password" minLength={8} required />
          <p className="form__help">英大文字（A〜Z）・英小文字（a〜z）・数字（0〜9）をそれぞれ1文字以上含む、8文字以上</p>
        </div>
      </div>
      <div className="form__row">
        <label className="form__label" htmlFor="set-password2">
          パスワード（確認）
        </label>
        <div>
          <input id="set-password2" type={type} name="password2" autoComplete="new-password" minLength={8} required />
          <p className="form__help">確認のため、同じパスワードをもう一度入力してください。</p>
        </div>
      </div>
      <p className="password-set__show">
        <label>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          入力したパスワードを表示する
        </label>
      </p>
      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "設定中…" : "パスワードを設定して登録を完了する"}
        </button>
      </div>
      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
