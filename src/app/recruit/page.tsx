import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "採用情報",
  description: "株式会社エモリスリンクの採用情報。札幌を拠点に、ビジネスソリューション事業部の人材コーディネーターと、ITソリューション事業部のシステムエンジニアを募集しています。",
  section: "recruit",
  hero: {
    en: "Recruit",
    ja: "採用情報",
    img: "hero-recruit.jpg"
  }
} as const;

export const metadata: Metadata = buildMetadata("recruit/", meta);

export default function RecruitPage() {
  return (
    <PageShell route="recruit/" meta={meta}>
      <section className="section">
        <div className="container recruit-intro fade">
          <p>
            決まりきったレールより、まだ形のない地図のほうが面白い。
            <br />
            正解をなぞるのではなく、自分たちで正解をつくっていく。
            <br />
            うまくいく保証はないけれど、うまくいった時の景色はきっと特別だ。
            <br />
            そんな挑戦を、一緒に楽しめる仲間を探しています。
          </p>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <article className="dept fade">
            <Link className="dept__img" href="/coordinator/">
              <img src="/assets/img/recruit-business.jpg" alt="" loading="lazy" />
            </Link>
            <div>
              <span className="label-en">BUSINESS SOLUTION</span>
              <h2>ビジネスソリューション事業部</h2>
              <p>企業と人材をつなぎ、双方の成長を支援する事業部です。</p>
              <p>
                採用支援や人材紹介、派遣サービスなどを通じて、企業の人材課題を解決するとともに、求職者一人ひとりに最適なキャリア機会を提供します。
              </p>
              <p>単なるマッチングにとどまらず、長期的な活躍を見据えたサポートを行い、持続的な組織づくりに貢献します。</p>
              <Link className="btn" href="/coordinator/">人材コーディネーター募集</Link>
            </div>
          </article>
          <article className="dept fade">
            <Link className="dept__img" href="/system-engineer/">
              <img src="/assets/img/recruit-it.jpg" alt="" loading="lazy" />
            </Link>
            <div>
              <span className="label-en">IT SOLUTION</span>
              <h2>ITソリューション事業部</h2>
              <p>最新のIT技術を活用し、企業の業務効率化や課題解決を支援する事業部です。</p>
              <p>システム開発、インフラ構築、運用保守までを一貫して提供し、クライアントのビジネス成長を支えます。</p>
              <p>また、DX（デジタルトランスフォーメーション）推進や業務改善の提案を通じて、より価値の高いIT活用を実現します。</p>
              <Link className="btn" href="/system-engineer/">システムエンジニア募集</Link>
            </div>
          </article>
        </div>
      </section>
      <section className="section">
        <div className="container container--narrow">
          <div className="notice-box fade">
            <h2>求職活動等を行う皆さまへ</h2>
            <p>
              当社では、皆さまが安心して面談・選考に臨めるよう、ハラスメント防止に取り組んでいます。
              <br />
              面談・面接に関するルールおよび相談窓口については、以下の資料をご確認ください。
            </p>
            <a className="pdf-link" href="/assets/docs/harassment-prevention.pdf" target="_blank" rel="noopener">
              <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
              求職活動等におけるハラスメント防止の取り組み・相談窓口（PDF・別タブで開きます）
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
