import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CtaEngineer } from "@/components/partials/CtaEngineer";
import { ServiceNav } from "@/components/partials/ServiceNav";

const meta = {
  title: "WEBデザイン",
  description: "ブランド価値を高める、伝わるWebデザイン。札幌の株式会社エモリスリンクが、コーポレートサイト・サービス紹介ページ・採用サイトを、使いやすさと分かりやすさを重視して制作します。",
  section: "service",
  hero: {
    en: "Web Design",
    ja: "WEBデザイン",
    img: "service-web-design.jpg",
    crumbs: [
      [
        "service/",
        "事業内容"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("service/web-design/", meta);

export default function ServiceWebDesignPage() {
  return (
    <PageShell route="service/web-design/" meta={meta}>
      <section className="section">
        <div className="container sv-hero">
          <div className="sv-hero__img fade">
            <img src="/assets/img/sv-web-design.jpg" alt="" loading="lazy" />
          </div>
          <div className="fade">
            <h2>ブランド価値を高める、伝わるWebデザイン</h2>
            <p>
              エモリスリンクのWEBデザインサービスは、豊富なデザイン経験と最新のトレンドを取り入れながら、企業様のブランドや目的に合ったWebサイトを制作します。
            </p>
            <p>見た目の美しさだけでなく、「使いやすさ」「分かりやすさ」を重視したデザインをご提案します。</p>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container container--narrow">
          <h2 className="h2-line center fade">WEBデザインについて</h2>
          <div className="box fade">
            <p>WEBデザインでは、企業様のサービス内容やターゲット、伝えたいメッセージを整理したうえで、最適な設計を行います。</p>
            <ul className="check-list">
              <li>コーポレートサイト</li>
              <li>サービス紹介ページ</li>
              <li>採用サイト</li>
            </ul>
            <p className="mb-0">用途に応じた最適なWebデザインをご提案します。</p>
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
                <li>企業イメージを整理して伝えたい</li>
                <li>Webサイトをリニューアルしたい</li>
                <li>スマホ対応・SEOを強化したい</li>
              </ul>
            </div>
            <div className="need-card fade">
              <h3>
                <i className="bi bi-palette" aria-hidden="true" />
                ご相談内容
              </h3>
              <ul className="check-list">
                <li>デザインの方向性から相談したい</li>
                <li>既存サイトの課題を改善したい</li>
                <li>Webでの情報発信を強化したい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">対応内容</h2>
          <ul className="tiles fade">
            <li>Webデザイン</li>
            <li>レスポンシブ</li>
            <li>UI / UX設計</li>
            <li>SEO設計</li>
          </ul>
          <p className="note">※既存サイトの改善・リニューアルも対応可能です</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2-line center fade">エモリスリンクのWEBデザインの特長</h2>
          <div className="feature-grid">
            <div className="feature fade">
              <i className="bi bi-brush" aria-hidden="true" />
              <h3>ブランドに寄り添うデザイン</h3>
              <p>企業様の強みや個性を引き出し、ブランド価値を高めます。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-layout-text-window" aria-hidden="true" />
              <h3>使いやすさを重視</h3>
              <p>直感的に操作できる構成・導線でユーザー体験を向上させます。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-code-slash" aria-hidden="true" />
              <h3>ITサービスとの連携</h3>
              <p>開発・IT支援と連携し、機能性とデザイン性を両立します。</p>
            </div>
          </div>
        </div>
      </section>
      <CtaEngineer />
      <ServiceNav />
    </PageShell>
  );
}
