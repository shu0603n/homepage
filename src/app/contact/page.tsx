import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";

const meta = {
  title: "お問い合わせ",
  description: "株式会社エモリスリンクへのお問い合わせ。企業様からの人材派遣・人材紹介・システム開発などのご相談、求職者様からのお仕事探し・ご応募を受け付けています。お電話は011-590-4888（9:00〜18:00、土日祝を除く）。",
  section: "contact",
  hero: {
    en: "Contact",
    ja: "お問い合わせ",
    img: "hero-contact.jpg"
  }
} as const;

export const metadata: Metadata = buildMetadata("contact/", meta);

export default function ContactPage() {
  return (
    <PageShell route="contact/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="lead-block fade mb-48">
            <p className="lead">
              企業様からのご相談やお仕事のご依頼、採用に関するお問い合わせを承っております。
              <br />
              また、当社に興味をお持ちの求職者の方からのご応募・ご相談も歓迎しております。
            </p>
            <p>
              企業担当者様向けフォームと求職者向けフォームをご用意しておりますので、ご用件に合わせてご利用ください。
              <br />
              内容を確認のうえ、担当者より順次ご連絡いたします。
            </p>
          </div>
          <div className="contact-cards">
            <Link className="link-card fade" href="/for-employers/">
              <div className="link-card__img">
                <img src="/assets/img/contact-employers.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">FOR EMPLOYERS</span>
                <h2 className="link-card__title">企業担当者様向け</h2>
                <p className="link-card__text">
                  企業の人材課題や事業成長に関するご相談を承っております。人材派遣・人材紹介・システムエンジニアリング・システム開発など、貴社の状況やご要望に合わせて最適なご提案をいたします。まずは情報収集やご相談ベースでも構いません。お気軽にお問い合わせください。
                </p>
              </div>
            </Link>
            <Link className="link-card fade" href="/job-seekers/">
              <div className="link-card__img">
                <img src="/assets/img/contact-seekers.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">FOR JOB SEEKERS</span>
                <h2 className="link-card__title">お仕事をお探しの方</h2>
                <p className="link-card__text">
                  新しい仕事との出会いや、これからのキャリアについてのご相談を承っております。掲載中のお仕事に関するお問い合わせはもちろん、あなたのご希望や働き方に合わせたお仕事探しのサポートも行っています。あなたらしく働ける環境との出会いをお手伝いいたします。
                </p>
              </div>
            </Link>
          </div>
          <div className="tel-box fade">
            <p>お電話でのお問い合わせ</p>
            <a href="tel:0115904888">{SITE.tel}</a>
            <p>受付時間 9:00〜18:00（土・日・祝日を除く）</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
