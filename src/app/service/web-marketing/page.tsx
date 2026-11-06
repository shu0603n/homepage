import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { ServiceNav } from "@/components/partials/ServiceNav";

const meta = {
  title: "WEBマーケティング",
  description: "Webを活用した、集客と成果につながる仕組みづくり。札幌の株式会社エモリスリンクが、Google広告・SNS広告・導線改善・LP改善など、目的に合ったWEBマーケティング施策をご支援します。",
  section: "service",
  hero: {
    en: "Web Marketing",
    ja: "WEBマーケティング",
    img: "service-web-marketing.jpg",
    crumbs: [
      [
        "service/",
        "事業内容"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("service/web-marketing/", meta);

export default function ServiceWebMarketingPage() {
  return (
    <PageShell route="service/web-marketing/" meta={meta}>
      <section className="section">
        <div className="container sv-hero">
          <div className="sv-hero__img fade">
            <img src="/assets/img/sv-web-marketing.jpg" alt="" loading="lazy" />
          </div>
          <div className="fade">
            <h2>Webを活用した、集客と成果につながる仕組みづくり</h2>
            <p>
              エモリスリンクのWEBマーケティングサービスは、Webサイトへの集客からお問い合わせ獲得までを見据えた、実践的なマーケティング施策をご支援します。
            </p>
            <p>目的や課題に応じて、広告運用や導線設計などを組み合わせながら、成果につながるWeb活用をご提案します。</p>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container container--narrow">
          <h2 className="h2-line center fade">WEBマーケティングについて</h2>
          <div className="box fade">
            <p>「どんな人に」「何を伝え」「どう行動してもらうか」を整理し、最適な施策を設計・実行します。</p>
            <ul className="check-list">
              <li>集客施策の設計</li>
              <li>広告運用サポート</li>
              <li>Webサイト改善提案</li>
            </ul>
            <p className="mb-0">目的に応じて最適なマーケティング施策をご提案します。</p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">こんなニーズに対応します</h2>
          <div className="need-grid">
            <div className="need-card fade">
              <h3>
                <i className="bi bi-building" aria-hidden="true" />
                企業様
              </h3>
              <ul className="check-list">
                <li>Webからの問い合わせを増やしたい</li>
                <li>広告の成果を見える化したい</li>
                <li>何から始めるべきか整理したい</li>
              </ul>
            </div>
            <div className="need-card fade">
              <h3>
                <i className="bi bi-graph-up" aria-hidden="true" />
                ご相談内容
              </h3>
              <ul className="check-list">
                <li>広告・Web施策をまとめて相談したい</li>
                <li>社内にマーケ担当がいない</li>
                <li>無理なくWeb活用を進めたい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">対応施策</h2>
          <ul className="tiles fade">
            <li>Google広告</li>
            <li>SNS広告</li>
            <li>導線改善</li>
            <li>LP改善</li>
          </ul>
          <p className="note">※アクセス分析・改善提案も対応可能です</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">エモリスリンクのWEBマーケティングの特長</h2>
          <div className="feature-grid">
            <div className="feature fade">
              <i className="bi bi-bullseye" aria-hidden="true" />
              <h3>目的重視の施策設計</h3>
              <p>流行ではなく、目的に合った最適な施策を設計します。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-link-45deg" aria-hidden="true" />
              <h3>Web制作との連携</h3>
              <p>デザイン・開発と連携し、成果につながる導線を構築します。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-sliders" aria-hidden="true" />
              <h3>無理のない運用サポート</h3>
              <p>小規模スタートやスポット対応など柔軟に対応します。</p>
            </div>
          </div>
        </div>
      </section>
      <ServiceNav />
    </PageShell>
  );
}
