import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";
import { Privacy } from "@/components/partials/Privacy";

const meta = {
  title: "お仕事をお探しの方",
  description: "お仕事をお探しの方のご相談・ご応募フォーム。札幌の株式会社エモリスリンクが、掲載中のお仕事のご案内や、ご希望・働き方に合わせたお仕事探しをサポートします。",
  section: "contact",
  hero: {
    en: "Entry",
    ja: "お仕事をお探しの方",
    img: "hero-contact.jpg",
    crumbs: [
      [
        "contact/",
        "お問い合わせ"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("job-seekers/", meta);

export default function JobSeekersPage() {
  return (
    <PageShell route="job-seekers/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p>
              掲載中のお仕事に関するお問い合わせ・ご応募はもちろん、あなたのご希望や働き方に合わせたお仕事探しのサポートも行っています。
              <br />
              以下のフォームに必要事項をご入力のうえ、送信してください。
            </p>
          </div>
          <form className="form" data-contact data-endpoint={`${SITE.formEndpoint.seekers}`} data-mailto={`${SITE.mail}`} data-subject="【お仕事をお探しの方】HPよりお問い合わせがありました" noValidate>
            <input type="hidden" name="_form" value="seekers" />
            <input type="hidden" name="_subject" value="【お仕事をお探しの方】HPよりお問い合わせがありました" />
            <div className="hp-field" aria-hidden="true">
              <label>
                空欄のまま送信してください
                <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="s-name">
                氏名
                <span className="req">必須</span>
              </label>
              <div>
                <input id="s-name" type="text" name="name" data-label="氏名" autoComplete="name" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="s-kana">
                ふりがな
                <span className="req">必須</span>
              </label>
              <div>
                <input id="s-kana" type="text" name="kana" data-label="ふりがな" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="s-email">
                メールアドレス
                <span className="req">必須</span>
              </label>
              <div>
                <input id="s-email" type="email" name="email" data-label="メールアドレス" autoComplete="email" required />
              </div>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="s-tel">
                電話番号
                <span className="req">必須</span>
              </label>
              <div>
                <input id="s-tel" type="tel" name="tel" data-label="電話番号" autoComplete="tel" pattern="[0-9０-９\-－ ]{10,15}" required />
              </div>
            </div>
            <div className="form__row">
              <span className="form__label" id="s-gender-label">
                性別
                <span className="req">必須</span>
              </span>
              <fieldset className="choices" aria-labelledby="s-gender-label" data-required>
                <label>
                  <input type="radio" name="gender" value="男性" data-label="性別" />
                  男性
                </label>
                <label>
                  <input type="radio" name="gender" value="女性" />
                  女性
                </label>
                <label>
                  <input type="radio" name="gender" value="どちらでもない" />
                  どちらでもない
                </label>
              </fieldset>
            </div>
            <div className="form__row">
              <span className="form__label" id="s-job-label">希望職種</span>
              <fieldset className="choices" aria-labelledby="s-job-label">
                <label>
                  <input type="radio" name="job" value="オフィスワーク" data-label="希望職種" />
                  オフィスワーク
                </label>
                <label>
                  <input type="radio" name="job" value="エンジニア" />
                  エンジニア
                </label>
                <label>
                  <input type="radio" name="job" value="その他" />
                  その他
                </label>
              </fieldset>
            </div>
            <div className="form__row">
              <label className="form__label" htmlFor="s-message">
                お問い合わせ
                <span className="req">必須</span>
              </label>
              <div>
                <textarea id="s-message" name="message" data-label="お問い合わせ" required />
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
      {/* 求人サイト EMORIS AGENT の紹介。画像：assets/img/agent-card.jpg（推奨 1200×628px 以上、約1.9:1 の横長） */}
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">求人サイト「EMORIS AGENT」</h2>
          <div className="agent fade">
            <span className="agent__bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <a className="agent__visual" href="https://emoris-jobs.com/?utm_medium=instagram&amp;utm_campaign=seeker-2026-11" target="_blank" rel="noopener">
              <img src="/assets/img/agent-card.jpg" alt="EMORIS AGENT 人と仕事の、最適な出会いを。（新しいタブで開きます）" width={1200} height={628} loading="lazy" />
            </a>
            <div className="agent__body">
              <p className="agent__lead">
                <span>
                  幅広い業界・職種から、
                  <br />
                  あなたに合う仕事が見つかる。
                </span>
              </p>
              <p className="agent__text">
                EMORIS AGENT は、お仕事探しのための求人サイトです。気になる求人を探して応募できるほか、企業からのスカウトを受け取ったり、応募書類を作成したりできます。
              </p>
              <ul className="agent__features">
                <li>
                  <i className="bi bi-search" aria-hidden="true" />
                  求人検索・応募
                </li>
                <li>
                  <i className="bi bi-envelope" aria-hidden="true" />
                  企業からの
                  <br />
                  スカウト
                </li>
                <li>
                  <i className="bi bi-file-earmark-text" aria-hidden="true" />
                  履歴書・
                  <br />
                  職務経歴書の作成
                </li>
              </ul>
              <a className="agent__cta" href="https://emoris-jobs.com/?utm_medium=instagram&amp;utm_campaign=seeker-2026-11" target="_blank" rel="noopener">
                <span className="agent__cta-badge">登録・利用はすべて無料</span>
                <span className="agent__cta-label">無料で会員登録する</span>
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
