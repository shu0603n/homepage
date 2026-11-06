import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "企業情報",
  description: "株式会社エモリスリンクの企業情報。代表のご挨拶、企業理念、会社概要、沿革、アクセス、メイホーグループのグループ概要をご紹介します。",
  section: "company",
  hero: {
    en: "Company",
    ja: "企業情報",
    img: "hero-company.jpg"
  }
} as const;

export const metadata: Metadata = buildMetadata("company/", meta);

export default function CompanyPage() {
  return (
    <PageShell route="company/" meta={meta}>
      <section className="section">
        <div className="container">
          <div className="card-grid">
            <Link className="link-card fade" href="/company/message/">
              <div className="link-card__img">
                <img src="/assets/img/company-message.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">GREETING</span>
                <h2 className="link-card__title">ごあいさつ</h2>
                <p className="link-card__text">
                  思いやりを起点に、人と企業をつなぐ。
                  <br />
                  価値と成長の循環を生み出し続ける。
                </p>
              </div>
            </Link>
            <Link className="link-card fade" href="/company/philosophy/">
              <div className="link-card__img">
                <img src="/assets/img/company-philosophy.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">PHILOSOPHY</span>
                <h2 className="link-card__title">企業理念</h2>
                <p className="link-card__text">人を想い、つなぎ、価値を循環させる。</p>
              </div>
            </Link>
            <Link className="link-card fade" href="/company/about/">
              <div className="link-card__img">
                <img src="/assets/img/company-about.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">ABOUT</span>
                <h2 className="link-card__title">会社概要</h2>
                <p className="link-card__text">
                  人を起点に、
                  <br />
                  価値と未来をつないでいく。
                </p>
              </div>
            </Link>
            <Link className="link-card fade" href="/company/history/">
              <div className="link-card__img">
                <img src="/assets/img/company-history.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">HISTORY</span>
                <h2 className="link-card__title">沿革</h2>
                <p className="link-card__text">
                  ユーザー目線に立ったサービスで
                  <br />
                  お客様に愛される企業に
                </p>
              </div>
            </Link>
            <Link className="link-card fade" href="/company/access/">
              <div className="link-card__img">
                <img src="/assets/img/company-access.jpg" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">ACCESS</span>
                <h2 className="link-card__title">アクセス</h2>
                <p className="link-card__text">ご縁が生まれる場所へ。</p>
              </div>
            </Link>
            <Link className="link-card fade" href="/company/group-overview/">
              <div className="link-card__img">
                <img src="/assets/img/company-group.png" alt="" loading="lazy" />
              </div>
              <div className="link-card__body">
                <span className="link-card__en">GROUP</span>
                <h2 className="link-card__title">グループ概要</h2>
                <p className="link-card__text">変わる勇気が、未来を変える</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
