"use client";

import Link from "next/link";

// ヘッダー用：アイコンだけのボタン。未ログインは「ログイン」、ログイン中は人のアイコンで「マイページ」
export function AuthIconLink({ loggedIn }: { loggedIn: boolean }) {
  const label = loggedIn ? "マイページ" : "ログイン";
  return (
    <Link className="header__icon" href={loggedIn ? "/mypage/" : "/login/"} aria-label={label} title={label}>
      <i className={`bi ${loggedIn ? "bi-person-circle" : "bi-box-arrow-in-right"}`} aria-hidden="true" />
    </Link>
  );
}

// スマホ用メニュー用：文字つきのボタン
export function AuthTextLink({ loggedIn, className }: { loggedIn: boolean; className: string }) {
  return (
    <Link className={className} href={loggedIn ? "/mypage/" : "/login/"}>
      {loggedIn ? "マイページ" : "ログイン"}
    </Link>
  );
}
