import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "@/components/site/Arrow";
import { COMPANY, EMORIS_AGENT_URL, RECRUIT, SERVICES, SITE, telHref } from "@/lib/site";

const SOCIAL_ICONS: Record<string, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5c-5.2 0-9.4 3.4-9.4 7.6 0 3.8 3.3 6.9 7.8 7.5.3.1.7.2.8.5.1.2.1.6 0 .9l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.4-5.4c1.4-1.5 2.1-3.1 2.1-4.8 0-4.2-4.2-7.6-9.4-7.6Z" fill="currentColor" />
      <path d="M6.6 9.4v3.7h2.3M10.4 9.4v3.7M12.3 13.1V9.4l2.6 3.7V9.4M18.4 9.4h-2.2v3.7h2.2M16.2 11.25h2" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

type Col = { en: string; href: string; items: ReadonlyArray<readonly [string, string]> };

function FooterCol({ en, href, items }: Col) {
  return (
    <div className="footer__col">
      <Link className="footer__title" href={href}>
        {en}
      </Link>
      {items.length > 0 && (
        <ul>
          {items.map(([h, t]) =>
            /^https?:/.test(h) ? (
              <li key={h}>
                <a href={h} target="_blank" rel="noopener">
                  {t}
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  <span className="visually-hidden">（新しいタブで開きます）</span>
                </a>
              </li>
            ) : (
              <li key={h}>
                <Link href={h}>{t}</Link>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

// お問い合わせ導線・フッター・右端のタブ（キャンペーン）・ページ先頭へ戻るボタン
export function Footer() {
  const socials = SITE.social.filter((s) => s.url);
  return (
    <>
      <section className="contact-cta" aria-labelledby="contact-cta-title">
        {/* 背景画像：assets/img/contact-bg.jpg（同じ名前で上書きすれば差し替わる。推奨 2400×1350px／16:9） */}
        <div className="contact-cta__media" aria-hidden="true">
          <img className="contact-cta__bg" src="/assets/img/contact-bg.jpg" alt="" width={1671} height={941} loading="lazy" />
        </div>
        <div className="contact-cta__inner">
          <div className="contact-cta__text">
            <p className="contact-cta__en" aria-hidden="true">
              Contact
            </p>
            <h2 className="contact-cta__title" id="contact-cta-title">
              <span className="contact-cta__line">
                <span>一緒に、</span>
              </span>
              <span className="contact-cta__line">
                <span>未来をつなごう。</span>
              </span>
            </h2>
            <p className="contact-cta__lead">
              人材のこと、ITのこと、これからの働き方のこと。
              <br />
              まずはお気軽にご相談ください。
            </p>
          </div>
          <div className="contact-cta__bottom">
            <p className="contact-cta__tel">
              <span className="contact-cta__tel-label">お電話でのお問い合わせ</span>
              <a href={telHref}>{SITE.tel}</a>
              <small>受付 9:00〜18:00（土日祝除く）</small>
            </p>
            <div className="contact-cta__cards">
              <Link className="cta-card" href="/for-employers/">
                <span className="cta-card__en">For Business</span>
                <strong className="cta-card__title">企業のご担当者様</strong>
                <span className="cta-card__text">人材派遣・人材紹介・SES・システム開発・Web制作のご相談</span>
                <span className="cta-card__arrow">
                  <Arrow />
                </span>
              </Link>
              <Link className="cta-card" href="/job-seekers/">
                <span className="cta-card__en">For Job Seekers</span>
                <strong className="cta-card__title">お仕事をお探しの方</strong>
                <span className="cta-card__text">お仕事探し・ご応募・キャリアのご相談</span>
                <span className="cta-card__arrow">
                  <Arrow />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__info">
            <Link className="footer__logo" href="/">
              <img src="/assets/img/logo-footer.png" alt="EMORISLINK" width={270} height={66} loading="lazy" />
            </Link>
            <p className="footer__catch">人と技術の力で、働くをもっと自由に。</p>
            <address className="footer__addr">
              〒060-0042
              <br />
              北海道札幌市中央区大通西7丁目1-1
              <br />
              井門札幌パークフロントビル 1F
              <br />
              TEL <a href={telHref}>{SITE.tel}</a>
            </address>
            <p className="footer__group">
              <img src="/assets/img/logo-meihogroup.png" alt="" loading="lazy" />
              メイホーグループ
            </p>
            {socials.length > 0 && (
              <ul className="footer__sns" aria-label="公式SNS">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a className={`footer__sns-link footer__sns-link--${s.id}`} href={s.url} target="_blank" rel="noopener" aria-label={`${s.name}（新しいタブで開きます）`}>
                      {SOCIAL_ICONS[s.id]}
                      <span>{s.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <nav className="footer__nav" aria-label="フッターナビゲーション">
            <FooterCol en="Service" href="/service/" items={SERVICES.map(([s, ja]) => [`/service/${s}/`, ja] as const)} />
            <FooterCol en="Company" href="/company/" items={COMPANY.map(([s, ja]) => [`/company/${s}/`, ja] as const)} />
            <FooterCol en="Recruit" href="/recruit/" items={RECRUIT.map(([s, ja]) => [`/${s}/`, ja] as const)} />
            <FooterCol
              en="Contact"
              href="/contact/"
              items={[
                ["/for-employers/", "企業担当者様"],
                ["/job-seekers/", "お仕事をお探しの方"],
                [EMORIS_AGENT_URL, "EMORIS AGENT"],
              ]}
            />
          </nav>
        </div>
        <div className="footer__bottom">
          <p className="footer__copy">&copy; {new Date().getFullYear()} EMORISLINK Co., Ltd.</p>
          <p className="footer__license">労働者派遣事業 派01-301612 ／ 有料職業紹介事業 01-ユ-300946</p>
        </div>
        <p className="footer__big" aria-hidden="true">
          EMORISLINK
        </p>
      </footer>

      <aside className="promo" aria-label="キャンペーン・お知らせ">
        <div className="promo__item promo__item--agent" data-key="emorislink-promo-agent-closed">
          <button className="promo__tab" type="button" aria-expanded="false" aria-controls="promo-panel-agent">
            <span className="promo__tab-text">正社員求人情報</span>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <div className="promo__panel" id="promo-panel-agent" hidden>
            <a className="promo__banner" href={EMORIS_AGENT_URL} target="_blank" rel="noopener">
              <img src="/assets/img/floating-banner-agent.jpg" alt="幅広い業界・職種から、あなたに合う仕事が見つかる。EMORIS AGENT 登録・利用はすべて無料 無料で会員登録する（新しいタブで開きます）" width={800} height={418} />
            </a>
            <button className="promo__close" type="button" aria-label="EMORIS AGENT のバナーを閉じる">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="promo__item promo__item--bonus" data-key="emorislink-promo-closed" data-auto-open>
          <button className="promo__tab" type="button" aria-expanded="false" aria-controls="promo-panel-bonus">
            <span className="promo__tab-text">
              入社祝い金<b>20</b>万円
            </span>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <div className="promo__panel" id="promo-panel-bonus" hidden>
            <Link className="promo__banner" href="/system-engineer/">
              <img src="/assets/img/floating-banner.jpg" alt="公式HP経由で応募いただいた方限定 入社祝い金20万円 経験者システムエンジニア 詳細・応募はこちら" width={800} height={418} />
            </Link>
            <button className="promo__close" type="button" aria-label="入社祝い金のバナーを閉じる">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
      <a className="pagetop" href="#top" aria-label="ページの先頭へ">
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <circle className="pagetop__track" cx="28" cy="28" r="26" />
          <circle className="pagetop__ring" cx="28" cy="28" r="26" />
        </svg>
        <span aria-hidden="true">↑</span>
      </a>
    </>
  );
}
