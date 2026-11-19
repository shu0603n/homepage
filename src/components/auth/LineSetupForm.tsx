"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

// LINE から来て、まだ連携していない方のパスワード設定（ログイン画面に出す）。
//   ① ご登録のメールアドレスを入力 → 6桁の確認コードがメールで届く
//   ② 確認コードと新しいパスワードを入力 → パスワード設定・LINE 連携・ログインまで一度に済む
// LINE の画面から出ずに進められるよう、メールのリンクではなく確認コードにしている（api/auth/line-setup）
export function LineSetupForm({ next }: { next: string }) {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  async function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/line-setup/", { email: value });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setEmail(value);
    setStep("code");
  }

  async function finish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    if (pw !== pw2) return setMessage("確認用のパスワードが一致しません。");
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/line-setup/finish/", { code, password: pw });
    if (!result.ok) {
      setMessage(result.message);
      setBusy(false);
      return;
    }
    setStep("done");
    await new Promise((r) => setTimeout(r, 2000));
    // Cookie を反映させるためページ全体を読み込み直して移動する
    window.location.assign(next);
  }

  // パスワードの「表示する」は入力欄を作り直して切り替える（PasswordSetForm と同じ。iPhone で伏せ字のままになるのを避ける）
  const fieldProps = show
    ? ({ type: "text", autoComplete: "off", autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const)
    : ({ type: "password", autoComplete: "new-password" } as const);

  return (
    <section className="form form--auth line-setup" aria-labelledby="line-setup-title">
      <h2 className="form__group" id="line-setup-title">
        パスワードを設定して LINE と連携する
      </h2>

      {step === "email" && (
        <form onSubmit={sendCode}>
          <p className="form__note">
            ご登録のメールアドレスに、6桁の確認コードをお送りします。
            <br />
            この画面のまま、届いたコードとパスワードを入力するだけで完了します。
          </p>
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
              {busy ? "送信中…" : "確認コードを送る"}
            </button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={finish}>
          <p className="form__note">
            <strong>{email}</strong> に確認コードをお送りしました（有効期限15分）。
            <br />
            届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <div className="form__row">
            <label className="form__label" htmlFor="ls-code">
              確認コード（6桁）
            </label>
            <div>
              <input id="ls-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required />
            </div>
          </div>
          <div className="form__row">
            <label className="form__label" htmlFor="ls-password">
              パスワード
            </label>
            <div>
              <input {...fieldProps} key={`pw-${show}`} id="ls-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
              <p className="form__help">英大文字（A〜Z）・英小文字（a〜z）・数字（0〜9）をそれぞれ1文字以上含む、8文字以上</p>
            </div>
          </div>
          <div className="form__row">
            <label className="form__label" htmlFor="ls-password2">
              パスワード（確認）
            </label>
            <div>
              <input {...fieldProps} key={`pw2-${show}`} id="ls-password2" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required />
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
              {busy ? "設定中…" : "パスワードを設定して連携する"}
            </button>
          </div>
          <p className="form__note line-setup__back">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStep("email");
                setMessage("");
              }}
            >
              メールアドレスを入力し直す・コードを送り直す
            </button>
          </p>
        </form>
      )}

      {step === "done" && (
        <p className="form__status is-ok" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" /> パスワードを設定し、LINE と連携しました。次回から LINE で自動ログインできます。
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
