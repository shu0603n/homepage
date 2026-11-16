"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { AuthIconLink, AuthTextLink } from "@/components/auth/AuthLink";
import { useLoggedIn } from "@/components/auth/useLoggedIn";
import { Arrow } from "@/components/site/Arrow";
import { CONTACT_NAV, NAV, SITE, sectionOf, telHref } from "@/lib/site";

function Chevron() {
  return (
    <svg className="ico-chev" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ヘッダーとスマホ用メニュー。開閉やスクロール連動は SiteBehavior（lib/behavior.ts）が担当
export function Header() {
  const pathname = usePathname();
  const current = sectionOf(pathname);
  const loggedIn = useLoggedIn();
  const menuGroups = [...NAV, CONTACT_NAV];
  return (
    <>
      <header className="header" id="header">
        <div className="header__inner">
          <Link className="header__logo" href="/" aria-label={`${SITE.siteName} トップへ`}>
            <img className="header__logo-d" src="/assets/img/logo-footer.png" alt="EMORISLINK" width={270} height={66} />
            <img className="header__logo-w" src="/assets/img/logo-header-white.png" alt="" width={270} height={66} aria-hidden="true" />
          </Link>
          <nav className="gnav" aria-label="グローバルナビゲーション">
            <ul className="gnav__list">
              {NAV.map((n) => (
                <li key={n.key} className={`gnav__item${current === n.key ? " is-current" : ""}${n.children.length ? " has-drop" : ""}`}>
                  <Link className="gnav__link" href={n.href}>
                    {n.ja}
                    {n.children.length > 0 && <Chevron />}
                  </Link>
                  {n.children.length > 0 && (
                    <div className="gnav__drop">
                      <div className="gnav__drop-head">
                        <span className="gnav__drop-en">{n.en}</span>
                        <Link href={n.href}>
                          {n.ja}トップ
                          <Arrow />
                        </Link>
                      </div>
                      <ul>
                        {n.children.map(([h, t]) => (
                          <li key={h}>
                            <Link href={h}>{t}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
              {loggedIn && (
                <li className={`gnav__item${pathname.startsWith("/jobs/") ? " is-current" : ""}`}>
                  <Link className="gnav__link" href="/jobs/">
                    案件一覧
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          <div className="header__actions">
            {/* ログイン中（登録済み）の方には不要なので出さない */}
            {!loggedIn && (
              <Link className="header__sub" href="/register/">
                スタッフ登録はこちら
              </Link>
            )}
            <Link className="header__cta" href="/contact/">
              お問い合わせ
              <Arrow />
            </Link>
            <AuthIconLink loggedIn={loggedIn} />
          </div>
          {/* スマホ・タブレット：メニューボタンの左に「スタッフ登録」を常に出す（PC の「スタッフ登録はこちら」は幅が狭いと隠れるため） */}
          {!loggedIn && (
            <Link className="header__sp-register" href="/register/">
              <i className="bi bi-person-plus-fill" aria-hidden="true" />
              スタッフ登録
            </Link>
          )}
          <button className="menu-btn" type="button" aria-label="メニューを開く" aria-expanded="false" aria-controls="drawer">
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="menu" id="drawer" hidden>
        <div className="blobs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {/* メニューを開いて最初に目に入る位置に、スタッフ登録への大きなボタンを置く */}
        {!loggedIn && (
          <Link className="menu__register" href="/register/">
            <span className="menu__register-label">お仕事をお探しの方</span>
            <strong className="menu__register-title">スタッフ登録はこちら</strong>
            <span className="menu__register-text">登録は無料です。登録すると、お仕事のご紹介や LINE でのご案内が受けられます。</span>
            <span className="menu__register-arrow" aria-hidden="true">
              <Arrow />
            </span>
          </Link>
        )}
        <nav className="menu__nav" aria-label="スマートフォン用メニュー">
          {menuGroups.map((g, i) => (
            <div key={g.key} className="menu__group" style={{ "--i": i } as CSSProperties}>
              <Link className="menu__head" href={g.href}>
                <span className="menu__en">{g.en}</span>
                <span className="menu__ja">{g.ja}</span>
              </Link>
              {g.children.length > 0 && (
                <ul>
                  {g.children.map(([h, t]) => (
                    <li key={h}>
                      <Link href={h}>{t}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
        <p className="menu__auth">
          {loggedIn && (
            <Link className="btn btn--ghost" href="/jobs/">
              案件一覧
            </Link>
          )}{" "}
          <AuthTextLink loggedIn={loggedIn} className="btn" />
        </p>
        <p className="menu__tel">
          TEL <a href={telHref}>{SITE.tel}</a>
          <small>受付 9:00〜18:00（土日祝除く）</small>
        </p>
      </div>
    </>
  );
}
