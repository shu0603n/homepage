"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { postJson } from "@/components/auth/api";
import { readProfileFields, Row, StaffProfileFields } from "@/components/auth/StaffProfileFields";

// スタッフ登録フォーム（next-app の staff-register と同じ項目）。
// 1. 入力内容を送ると、スタッフ情報が保存され、入力したメールアドレス宛に「パスワード設定のご案内」メールが届く
// 2. メールのリンクを開いてパスワードを決めると登録完了（/register/password/）。メールアドレスが本人のものか確かめるため
export function RegisterForm({ privacy }: { privacy: ReactNode }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null); // ご案内メールを送ったメールアドレス

  function scrollToTop() {
    window.scrollTo({ top: document.getElementById("register-form")?.offsetTop ?? 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    if (get("mail") !== get("mail2")) {
      setMessage("確認用のメールアドレスが一致しません。");
      return scrollToTop();
    }

    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/register/", {
      ...readProfileFields(fd),
      referrer: get("referrer"),
      mail: get("mail"),
      consent1: fd.get("consent1") === "on",
      consent2: fd.get("consent2") === "on",
    });
    setBusy(false);
    if (result.ok) setSentTo(get("mail"));
    else setMessage(result.message);
    scrollToTop();
  }

  if (sentTo) {
    return (
      <div id="register-form" className="form form--auth register-sent">
        <p className="register-sent__icon" aria-hidden="true">
          <i className="bi bi-envelope-check" />
        </p>
        <h2 className="register-sent__title">ご案内メールをお送りしました</h2>
        <p className="register-sent__mail">{sentTo}</p>
        <ol className="register-sent__steps">
          <li>上のメールアドレスに届いた「パスワード設定のご案内」メールを開いてください。</li>
          <li>メールに記載のリンクを押して、ログイン用のパスワードを決めてください。</li>
          <li>パスワードを設定すると、登録が完了します。</li>
        </ol>
        <p className="register-sent__note">
          ※ リンクの有効期限は48時間です。
          <br />※ メールが届かない場合は、迷惑メールフォルダもご確認ください。それでも届かない場合は、お電話にてお問い合わせください。
        </p>
      </div>
    );
  }

  return (
    <div id="register-form">
      <form className="form form--wide" onSubmit={onSubmit}>
        {message && (
          <p className="form__status is-ng" role="alert">
            {message}
          </p>
        )}

        <StaffProfileFields
          leading={
            <Row label="紹介者" htmlFor="r-referrer">
              <input id="r-referrer" type="text" name="referrer" placeholder="紹介者がいる場合はお名前をご入力ください" />
            </Row>
          }
          afterKana={
            <>
              <Row label="メールアドレス" htmlFor="r-mail" required>
                <input id="r-mail" type="email" name="mail" autoComplete="email" required />
                <p className="form__help">ログインに使います。パスワード設定のご案内メールをこのアドレスにお送りします。</p>
              </Row>
              <Row label="メールアドレス（確認）" htmlFor="r-mail2" required>
                <input id="r-mail2" type="email" name="mail2" autoComplete="email" required />
                <p className="form__help">確認のため、同じメールアドレスをもう一度入力してください。</p>
              </Row>
            </>
          }
        />

        <h2 className="form__group">個人情報の取り扱いについて</h2>
        {privacy}
        <p className="form__agree">
          <label>
            <input type="checkbox" name="consent1" required />
            個人情報の取り扱いに同意します
          </label>
        </p>
        <h2 className="form__group">秘密保持のお願い</h2>
        <p>就業先企業・業務内容に関する情報は第三者に開示・漏洩しないようお願いいたします。</p>
        <p className="form__agree">
          <label>
            <input type="checkbox" name="consent2" required />
            秘密保持事項に同意します
          </label>
        </p>

        <p className="register-note">送信すると、ご入力のメールアドレスに「パスワード設定のご案内」メールが届きます。</p>
        <div className="form__actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "送信中…" : "登録する"}
          </button>
        </div>
        <ul className="auth-links">
          <li>
            <Link href="/login/">すでに登録済みの方はログイン</Link>
          </li>
        </ul>
      </form>
    </div>
  );
}
