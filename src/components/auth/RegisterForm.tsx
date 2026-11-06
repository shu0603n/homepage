"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { postJson } from "@/components/auth/api";
import { readProfileFields, Row, StaffProfileFields } from "@/components/auth/StaffProfileFields";

// スタッフ登録フォーム（next-app の staff-register と同じ項目）。登録するとスタッフ情報が DB に保存され、ログイン状態になる
export function RegisterForm({ privacy }: { privacy: ReactNode }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    if (get("password") !== get("password2")) return setMessage("パスワードが一致しません。");

    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/register/", {
      ...readProfileFields(fd),
      referrer: get("referrer"),
      mail: get("mail"),
      password: String(fd.get("password") ?? ""),
      consent1: fd.get("consent1") === "on",
      consent2: fd.get("consent2") === "on",
    });
    if (result.ok) {
      window.location.assign("/mypage/?registered=1");
      return;
    }
    setMessage(result.message);
    setBusy(false);
    window.scrollTo({ top: document.getElementById("register-form")?.offsetTop ?? 0, behavior: "smooth" });
  }

  return (
    <form id="register-form" className="form form--wide" onSubmit={onSubmit}>
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
          <Row label="メールアドレス" htmlFor="r-mail" required>
            <input id="r-mail" type="email" name="mail" autoComplete="email" required />
            <p className="form__help">ログインID になります。</p>
          </Row>
        }
      />

      <h2 className="form__group">ログイン用パスワード</h2>
      <Row label="パスワード" htmlFor="r-password" required>
        <input id="r-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
        <p className="form__help">英大文字・英小文字・数字を含む8文字以上</p>
      </Row>
      <Row label="パスワード（確認）" htmlFor="r-password2" required>
        <input id="r-password2" type="password" name="password2" autoComplete="new-password" minLength={8} required />
      </Row>

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

      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "登録中…" : "登録する"}
        </button>
      </div>
      <ul className="auth-links">
        <li>
          <Link href="/login/">すでに登録済みの方はログイン</Link>
        </li>
      </ul>
    </form>
  );
}
