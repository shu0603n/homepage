import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";
import { Privacy } from "@/components/partials/Privacy";

const meta = {
  title: "企業担当者様向けお問い合わせ",
  description: "企業担当者様向けのお問い合わせフォーム。札幌の株式会社エモリスリンクが、人材派遣・人材紹介・システムエンジニアリング・システム開発など、貴社の状況やご要望に合わせて最適なご提案をいたします。",
  section: "contact",
  hero: {
    en: "Contact",
    ja: "企業担当者様向けお問い合わせ",
    img: "hero-contact.jpg",
    crumbs: [
      [
        "contact/",
        "お問い合わせ"
      ]
    ],
    current: "企業担当者様"
  }
} as const;

export const metadata: Metadata = buildMetadata("for-employers/", meta);

export default function ForEmployersPage() {
  return (
    <PageShell route="for-employers/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p>
              人材派遣・人材紹介・システムエンジニアリング・システム開発など、貴社の状況やご要望に合わせて最適なご提案をいたします。
              <br />
              以下のフォームに必要事項をご入力のうえ、送信してください。
            </p>
          </div>
          <form className="form" data-contact data-endpoint={`${SITE.formEndpoint.employers}`} data-mailto={`${SITE.mail}`} data-subject="【企業担当者】HPよりお問い合わせがありました" noValidate>
            <input type="hidden" name="_form" value="employers" />
            <input type="hidden" name="_subject" value="【企業担当者】HPよりお問い合わせがありました" />
            <div className="hp-field" aria-hidden="true">
              <label>
                空欄のまま送信してください
                <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-company">
                企業名
                <span className="req">必須</span>
              </label>
              <div>
                <input id="f-company" type="text" name="company" data-label="企業名" autoComplete="organization" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-name">
                ご担当者様名
                <span className="req">必須</span>
              </label>
              <div>
                <input id="f-name" type="text" name="name" data-label="ご担当者様名" autoComplete="name" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-kana">
                ふりがな
                <span className="req">必須</span>
              </label>
              <div>
                <input id="f-kana" type="text" name="kana" data-label="ふりがな" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-email">
                メール
                <span className="req">必須</span>
              </label>
              <div>
                <input id="f-email" type="email" name="email" data-label="メール" autoComplete="email" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-tel">
                電話番号
                <span className="req">必須</span>
              </label>
              <div>
                <input id="f-tel" type="tel" name="tel" data-label="電話番号" autoComplete="tel" pattern="[0-9０-９\-－ ]{10,15}" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-address">
                所在地
                <span className="req">必須</span>
              </label>
              <div>
                <input id="f-address" type="text" name="address" data-label="所在地" autoComplete="street-address" required />
              </div>
            </div>
            <div className="form__row">
              <span className="form__label" id="f-type-label">
                お問い合わせ内容
                <span className="req">必須</span>
              </span>
              <fieldset className="choices" aria-labelledby="f-type-label" data-required>
                <label>
                  <input type="radio" name="type" value="採用について" data-label="お問い合わせ内容" />
                  採用について
                </label>
                <label>
                  <input type="radio" name="type" value="協業・パートナー" />
                  協業・パートナー
                </label>
                <label>
                  <input type="radio" name="type" value="サービス紹介" />
                  サービス紹介
                </label>
                <label>
                  <input type="radio" name="type" value="取材依頼" />
                  取材依頼
                </label>
                <label>
                  <input type="radio" name="type" value="その他" />
                  その他
                </label>
              </fieldset>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="f-message">
                お問い合わせ
                <span className="req">必須</span>
              </label>
              <div>
                <textarea id="f-message" name="message" data-label="お問い合わせ" required />
              </div>
            </div>
            <Privacy />
            <p className="form__agree">
              <label>
                <input type="checkbox" name="agree" value="同意する" required />
                個人情報の取り扱いについて同意する
                <span className="req">必須</span>
              </label>
            </p>
            <div className="form__submit">
              <button className="btn" type="submit">送信する</button>
            </div>
            <p className="form__status" role="status" hidden />
          </form>
        </div>
      </section>
      {/* 採用管理サービス EMORIS AGENT（企業向け）の紹介。お仕事をお探しの方ページの求職者向けセクションと同じ作り
     画像：assets/img/agent-card-company.jpg（推奨 1200×628px 以上、約1.9:1 の横長） */}
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">求人掲載・採用管理サービス「EMORIS AGENT」</h2>
          <div className="agent fade">
            <span className="agent__bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <a className="agent__visual" href="https://emoris-jobs.com/company" target="_blank" rel="noopener">
              <img src="/assets/img/agent-card-company.jpg" alt="EMORIS AGENT 企業向け 人と仕事の、最適な出会いを。（新しいタブで開きます）" width={1200} height={628} loading="lazy" />
            </a>
            <div className="agent__body">
              <p className="agent__lead">
                <span>
                  求人の掲載は無料。
                  <br />
                  掲載から採用まで、
                  <br className="sp-only" />
                  ひとつの画面で。
                </span>
              </p>
              <p className="agent__text">
                EMORIS AGENT は、無料で求人を掲載できる採用サービスです。掲載した求人への応募者の管理、求職者への直接スカウト、面接日程の調整、内定通知までを、ひとつの管理画面で行えます。アカウント登録・求人掲載は無料で、費用がかかるのは採用が決まったときだけです。
              </p>
              <ul className="agent__features">
                <li>
                  <i className="bi bi-file-earmark-plus" aria-hidden="true" />
                  求人の
                  <br />
                  無料掲載
                </li>
                <li>
                  <i className="bi bi-people" aria-hidden="true" />
                  応募者管理・
                  <br />
                  スカウト
                </li>
                <li>
                  <i className="bi bi-calendar-check" aria-hidden="true" />
                  面接日程の
                  <br />
                  調整
                </li>
              </ul>
              <a className="agent__cta" href="https://emoris-jobs.com/company" target="_blank" rel="noopener">
                <span className="agent__cta-badge">求人掲載・登録は無料</span>
                <span className="agent__cta-label">無料で求人掲載を始める</span>
                <i className="bi bi-chevron-right" aria-hidden="true" />
                <span className="visually-hidden">（EMORIS AGENT が新しいタブで開きます）</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
