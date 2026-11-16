"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

// スタッフ登録：メールのリンクから開いた画面で、ログイン用パスワードを決める。設定できたら登録完了ページへ
export function PasswordSetForm({ token, email }: { token: string; email: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

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

  // 「表示する」の切り替えは、入力欄の type を書き換えるのではなく、入力欄を作り直して行う。
  // スマホのブラウザ（iPhone の Safari など）では、パスワード欄の type を後から text に変えても、伏せ字のまま表示されることがあるため。
  // 入力した値は state に持っているので、作り直しても消えない
  const fieldProps = show
    ? ({ type: "text", autoComplete: "off", autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const)
    : ({ type: "password", autoComplete: "new-password" } as const);
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
          <input {...fieldProps} key={`pw-${show}`} id="set-password" name="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
          <p className="form__help">英大文字（A〜Z）・英小文字（a〜z）・数字（0〜9）をそれぞれ1文字以上含む、8文字以上</p>
        </div>
      </div>
      <div className="form__row">
        <label className="form__label" htmlFor="set-password2">
          パスワード（確認）
        </label>
        <div>
          <input {...fieldProps} key={`pw2-${show}`} id="set-password2" name="password2" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required />
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
