"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { AdminWalker } from "@/components/admin/AdminWalker";

// 管理ページの外枠（開閉できる左のメニュー＋本文）。
//   - パソコン：左上のボタンでメニューを細く（アイコンだけに）たためる。たたんだかどうかは Cookie（adm_side）に覚え、
//     次に開いたページでも同じ状態で表示する（サーバー側で読むので、表示のちらつきがない）
//   - スマホ・タブレット：上の帯の ☰ ボタンでメニューを開閉する（ページを選ぶと閉じる）
export function AdminFrame({
  initialCollapsed,
  logo,
  side,
  children,
}: {
  initialCollapsed: boolean;
  logo: ReactNode;
  side: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [navOpen, setNavOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `adm_side=${next ? "collapsed" : "open"}; path=/admin; max-age=31536000; samesite=strict`;
  }

  // スマホでメニューの項目を押したら閉じる
  function closeOnLink(e: MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest("a")) setNavOpen(false);
  }

  return (
    <div className={`adm${collapsed ? " is-collapsed" : ""}${navOpen ? " is-nav-open" : ""}`}>
      <aside className="adm-side" onClick={closeOnLink}>
        <div className="adm-side__top">
          {logo}
          <button
            type="button"
            className="adm-side__toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "メニューを広げる" : "メニューをたたむ"}
            title={collapsed ? "メニューを広げる" : "メニューをたたむ"}
          >
            <i className={`bi ${collapsed ? "bi-chevron-double-right" : "bi-chevron-double-left"}`} aria-hidden="true" />
          </button>
          <button type="button" className="adm-side__burger" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen} aria-label={navOpen ? "メニューを閉じる" : "メニューを開く"}>
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
        {side}
      </aside>
      <div className="adm-body">{children}</div>
      <AdminWalker />
    </div>
  );
}
