import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CtaJob } from "@/components/partials/CtaJob";
import { ServiceNav } from "@/components/partials/ServiceNav";

const meta = {
  title: "人材紹介",
  description: "企業と人をつなぐ、最適なマッチング。札幌の株式会社エモリスリンクの人材紹介は、正社員・契約社員など直接雇用を前提とした採用を、丁寧なヒアリングと価値観まで考慮した人材提案でサポートします。",
  section: "service",
  hero: {
    en: "Recruitment",
    ja: "人材紹介",
    img: "service-recruitment.jpg",
    crumbs: [
      [
        "service/",
        "事業内容"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("service/recruitment/", meta);

export default function ServiceRecruitmentPage() {
  return (
    <PageShell route="service/recruitment/" meta={meta}>
      <section className="section">
        <div className="container sv-hero">
          <div className="sv-hero__img fade">
            <img src="/assets/img/sv-recruitment.jpg" alt="" loading="lazy" />
          </div>
          <div className="fade">
            <h2>企業と人をつなぐ、最適なマッチング</h2>
            <p>
              エモリスリンクの人材紹介サービスは、優秀な人材を採用したい企業様と、求職・転職を希望される方を結びつけ、
              <strong>直接雇用の成立をサポートするサービス</strong>
              です。
            </p>
            <p>
              単なる人材紹介にとどまらず、企業様の課題や求職者様の希望を丁寧に把握したうえで、双方にとって最適なマッチングを目指します。
            </p>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container container--narrow">
          <h2 className="h2-line center fade">人材紹介とは</h2>
          <figure className="diagram fade">
            <img src="/assets/img/diagram-recruitment.jpg" alt="採用企業・エモリスリンク・求職者の関係図" loading="lazy" />
          </figure>
          <div className="box fade">
            <p>
              人材紹介とは、エモリスリンクが企業様と求職者様の間に立ち、正社員・契約社員などの
              <strong>直接雇用を前提とした採用を支援する仕組み</strong>
              です。
            </p>
            <ul className="check-list">
              <li>雇用主：採用企業様</li>
              <li>エモリスリンクは採用までをサポート</li>
              <li>入社後は企業様と求職者様の直接雇用</li>
            </ul>
            <p className="mb-0">長期的な人材確保や定着を目的とした採用に適しています。</p>
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
                <li>即戦力となる人材を採用したい</li>
                <li>採用活動にかかる負担を減らしたい</li>
                <li>自社に合う人材を見極めたい</li>
              </ul>
            </div>
            <div className="need-card fade">
              <h3>
                <i className="bi bi-person" aria-hidden="true" />
                求職者様
              </h3>
              <ul className="check-list">
                <li>正社員として安定して働きたい</li>
                <li>自分に合った職場を見つけたい</li>
                <li>キャリアアップ・キャリアチェンジを目指したい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">エモリスリンクの人材紹介の特長</h2>
          <div className="feature-grid">
            <div className="feature fade">
              <i className="bi bi-chat-left-text" aria-hidden="true" />
              <h3>丁寧なヒアリング</h3>
              <p>企業様の求人ニーズや課題、求職者様の希望を丁寧に把握します。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <h3>最適な人材提案</h3>
              <p>スキルだけでなく価値観も考慮したマッチングを行います。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-graph-up" aria-hidden="true" />
              <h3>採用課題の解決をサポート</h3>
              <p>採用に関する課題や体制づくりまで支援します。</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">対応職種例</h2>
          <ul className="tiles fade">
            <li>工場・製造業</li>
            <li>倉庫・物流</li>
            <li>オフィスワーク</li>
            <li>IT・エンジニア職</li>
          </ul>
          <p className="note">※その他、各種職種・雇用形態についてもお気軽にご相談ください。</p>
        </div>
      </section>
      <CtaJob />
      <ServiceNav />
    </PageShell>
  );
}
