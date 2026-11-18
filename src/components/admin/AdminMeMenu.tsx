"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ログイン中の人のカード。押すと小窓が開き、「管理者」「パスワード変更」に進める。
// 小窓の外を押すか Esc キーで閉じる。スマホでは上部の帯に頭文字の丸いボタンとして出る
type Props = {
  name: string | null;
  email: string;
  role: "super" | "staff";
  roleLabel: string;
  current: "users" | "password" | null; // いま開いているページ（小窓の中の項目を強調する）
};

const ITEMS = [
  { key: "users", href: "/admin/users/", label: "管理者", help: "管理ページを使える人の一覧・追加", icon: "bi-people" },
  { key: "password", href: "/admin/password/", label: "パスワード変更", help: "自分のログイン用パスワードを変える", icon: "bi-key" },
] as const;

export function AdminMeMenu({ name, email, role, roleLabel, current }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name ?? email).slice(0, 1).toUpperCase();
  return (
    <div className={`adm-me-wrap${open ? " is-open" : ""}`} ref={box}>
      <button type="button" className={`adm-me${current ? " is-current" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="adm-me__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="adm-me__text">
          <strong>
            {name ?? "管理者"}
            <em className={`adm-role adm-role--${role}`}>{roleLabel}</em>
          </strong>
          <small>{email}</small>
        </span>
        <i className="bi bi-chevron-expand adm-me__chev" aria-hidden="true" />
        <span className="visually-hidden">アカウントのメニューを開く</span>
      </button>
      {open && (
        <div className="adm-menu" role="menu">
          <div className="adm-menu__head">
            <span className="adm-me__avatar" aria-hidden="true">
              {initial}
            </span>
            <span>
              <strong>{name ?? "管理者"}</strong>
              <small>{email}</small>
            </span>
          </div>
          {ITEMS.map((item) => (
            <Link key={item.key} href={item.href} role="menuitem" className={`adm-menu__item${current === item.key ? " is-active" : ""}`} onClick={() => setOpen(false)}>
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.help}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
