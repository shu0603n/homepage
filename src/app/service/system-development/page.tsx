import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CtaEngineer } from "@/components/partials/CtaEngineer";
import { ServiceNav } from "@/components/partials/ServiceNav";

const meta = {
  title: "システム開発",
  description: "目的に合わせた、最適なシステム開発。札幌の株式会社エモリスリンクが、自社開発で培った知見を活かし、Webシステム・業務管理・アプリ開発から運用・保守まで一貫して支援します。",
  section: "service",
  hero: {
    en: "System Development",
    ja: "システム開発",
    img: "service-dev.jpg",
    crumbs: [
      [
        "service/",
        "事業内容"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("service/system-development/", meta);

export default function ServiceSystemDevelopmentPage() {
  return (
    <PageShell route="service/system-development/" meta={meta}>
      <section className="section">
        <div className="container sv-hero">
          <div className="sv-hero__img fade">
            <img src="/assets/img/sv-dev.jpg" alt="" loading="lazy" />
          </div>
          <div className="fade">
            <h2>目的に合わせた、最適なシステム開発</h2>
            <p>
              エモリスリンクのシステム開発サービスは、自社システムの開発・運用で培った知見と技術力を活かし、企業様の業務や目的に合わせたシステム構築を支援するサービスです。
            </p>
            <p>Webシステムやアプリケーションの開発をはじめ、販売管理・業務管理など、業務に密着したシステム開発に対応しています。</p>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container container--narrow">
          <h2 className="h2-line center fade">システム開発について</h2>
          <div className="box fade">
            <p>本サービスでは、企業様の課題や業務内容を丁寧に把握したうえで、最適な開発手法・体制をご提案します。</p>
            <ul className="check-list">
              <li>要件整理からの開発支援</li>
              <li>既存システムの改善・機能追加</li>
              <li>運用を見据えたシステム構築</li>
            </ul>
            <p className="mb-0">状況に応じて柔軟な開発体制を構築可能です。</p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">こんなニーズに応えます</h2>
          <div className="need-grid">
            <div className="need-card fade">
              <h3>
                <i className="bi bi-building" aria-hidden="true" />
                企業様
              </h3>
              <ul className="check-list">
                <li>業務効率化のためにシステムを導入したい</li>
                <li>現場に合ったシステムを構築したい</li>
                <li>IT活用をまとめて相談したい</li>
              </ul>
            </div>
            <div className="need-card fade">
              <h3>
                <i className="bi bi-gear" aria-hidden="true" />
                ご相談内容
              </h3>
              <ul className="check-list">
                <li>技術的な判断を任せたい</li>
                <li>小規模から段階的に進めたい</li>
                <li>運用まで見据えた開発をしたい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">対応開発分野</h2>
          <ul className="tiles fade">
            <li>Webシステム</li>
            <li>業務管理</li>
            <li>アプリ開発</li>
            <li>運用・保守</li>
          </ul>
          <p className="note">※ITソリューション支援も対応可能です</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">エモリスリンクのシステム開発の特長</h2>
          <div className="feature-grid">
            <div className="feature fade">
              <i className="bi bi-code-slash" aria-hidden="true" />
              <h3>自社開発で培ったノウハウ</h3>
              <p>自社システムの開発・運用で得た知見を活かし、実務に強い開発を行います。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-lightbulb" aria-hidden="true" />
              <h3>業務に寄り添う提案力</h3>
              <p>単なる開発ではなく、業務にどう活かすかまで考えた提案を行います。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              <h3>継続的なサポート</h3>
              <p>導入後の運用や改善まで、長期的に支援します。</p>
            </div>
          </div>
        </div>
      </section>
      <CtaEngineer />
      <ServiceNav />
    </PageShell>
  );
}
