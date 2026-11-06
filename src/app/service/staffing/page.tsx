import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CtaJob } from "@/components/partials/CtaJob";
import { ServiceNav } from "@/components/partials/ServiceNav";

const meta = {
  title: "人材派遣",
  description: "地域に根ざした、安心の人材派遣。札幌の株式会社エモリスリンクが、工場・製造、倉庫・物流、オフィスワーク、IT・エンジニアなどの人材派遣で、繁忙期の人手確保や柔軟な人員体制を支援します。",
  section: "service",
  hero: {
    en: "Staffing",
    ja: "人材派遣",
    img: "hero-staffing.jpg",
    crumbs: [
      [
        "service/",
        "事業内容"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("service/staffing/", meta);

export default function ServiceStaffingPage() {
  return (
    <PageShell route="service/staffing/" meta={meta}>
      <section className="section">
        <div className="container sv-hero">
          <div className="sv-hero__img fade">
            <img src="/assets/img/sv-staffing.jpg" alt="" loading="lazy" />
          </div>
          <div className="fade">
            <h2>地域に根ざした、安心の人材派遣</h2>
            <p>エモリスリンクは、企業様と求職者様をつなぐ人材派遣サービスを提供しています。</p>
            <p>
              人手不足への対応、繁忙期のサポート、そして「自分に合った働き方」を探す方まで。
              <br />
              地域密着型の体制で、安心して働ける・任せられる環境づくりを大切にしています。
            </p>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container container--narrow">
          <h2 className="h2-line center fade">人材派遣とは</h2>
          <figure className="diagram fade">
            <img src="/assets/img/diagram-staffing.jpg" alt="派遣元（エモリスリンク）・派遣先企業・派遣スタッフの三者の関係図" loading="lazy" />
          </figure>
          <div className="box fade">
            <p>人材派遣とは、派遣元である株式会社エモリスリンクと雇用契約を結び、別の企業（派遣先）で業務を行う働き方です。</p>
            <ul className="check-list">
              <li>雇用主：エモリスリンク</li>
              <li>就業先：派遣先企業</li>
              <li>業務の指示：派遣先企業</li>
            </ul>
            <p className="mb-0">雇用と就業先が異なることが特徴です。</p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">こんな場面で利用されています</h2>
          <div className="need-grid">
            <div className="need-card fade">
              <h3>
                <i className="bi bi-building" aria-hidden="true" />
                企業様
              </h3>
              <ul className="check-list">
                <li>繁忙期の人手確保</li>
                <li>必要な期間だけ柔軟に対応</li>
                <li>採用・教育コスト削減</li>
              </ul>
            </div>
            <div className="need-card fade">
              <h3>
                <i className="bi bi-person" aria-hidden="true" />
                求職者様
              </h3>
              <ul className="check-list">
                <li>自分に合った働き方</li>
                <li>未経験から挑戦</li>
                <li>正社員前の経験</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">対応職種</h2>
          <ul className="tiles fade">
            <li>工場・製造</li>
            <li>倉庫・物流</li>
            <li>オフィスワーク</li>
            <li>IT・エンジニア</li>
          </ul>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">選ばれる理由</h2>
          <div className="feature-grid">
            <div className="feature fade">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <h3>地域密着</h3>
              <p>地域の特性を理解した担当者が対応します。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-people" aria-hidden="true" />
              <h3>専任フォロー</h3>
              <p>就業前後を一貫してサポートします。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-shield-check" aria-hidden="true" />
              <h3>安心の環境</h3>
              <p>不安を解消しながらスタートできます。</p>
            </div>
          </div>
        </div>
      </section>
      <CtaJob />
      <ServiceNav />
    </PageShell>
  );
}
