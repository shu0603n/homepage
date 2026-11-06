import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CtaJob } from "@/components/partials/CtaJob";
import { ServiceNav } from "@/components/partials/ServiceNav";

const meta = {
  title: "紹介予定派遣",
  description: "派遣から始める、納得感のある採用と働き方。札幌の株式会社エモリスリンクの紹介予定派遣は、最長6か月の派遣期間を経て直接雇用へ移行する仕組みで、採用後のミスマッチを抑えます。",
  section: "service",
  hero: {
    en: "Temp to Perm",
    ja: "紹介予定派遣",
    img: "service-temp-to-perm.jpg",
    crumbs: [
      [
        "service/",
        "事業内容"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("service/temp-to-perm/", meta);

export default function ServiceTempToPermPage() {
  return (
    <PageShell route="service/temp-to-perm/" meta={meta}>
      <section className="section">
        <div className="container sv-hero">
          <div className="sv-hero__img fade">
            <img src="/assets/img/sv-temp-to-perm.jpg" alt="" loading="lazy" />
          </div>
          <div className="fade">
            <h2>派遣から始める、納得感のある採用と働き方</h2>
            <p>
              エモリスリンクの紹介予定派遣は、一定期間の派遣就業を経て、企業様・求職者様双方の合意のもとで直接雇用（正社員・契約社員など）へ切り替えるサービスです。
            </p>
            <ul className="check-list">
              <li>
                <strong>企業様にとっては：</strong>
                実際の業務を通じて、能力や人柄を見極めてから採用できます。
              </li>
              <li>
                <strong>求職者様にとっては：</strong>
                職場の雰囲気や仕事内容を体感してから、安心して入社を決められます。
              </li>
            </ul>
            <p>採用後のミスマッチを大幅に抑えることができます。</p>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container container--narrow">
          <h2 className="h2-line center fade">紹介予定派遣とは</h2>
          <div className="box fade">
            <p>紹介予定派遣とは、派遣期間（最長6か月）終了後に、企業様と求職者様が合意すれば直接雇用へ移行する仕組みです。</p>
            <ul className="check-list">
              <li>派遣期間中は株式会社エモリスリンクと雇用契約</li>
              <li>業務は派遣先企業様の指示のもとで実施</li>
              <li>合意後は正社員・契約社員として直接雇用</li>
            </ul>
            <p className="mb-0">「派遣」と「人材紹介」の両方の特長を持った働き方です。</p>
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
                <li>採用前に実務を通して適性を見極めたい</li>
                <li>採用後のミスマッチを減らしたい</li>
                <li>採用コストや時間を抑えたい</li>
              </ul>
            </div>
            <div className="need-card fade">
              <h3>
                <i className="bi bi-person" aria-hidden="true" />
                求職者様
              </h3>
              <ul className="check-list">
                <li>職場の雰囲気や業務内容を確認したい</li>
                <li>正社員・直接雇用を目指したい</li>
                <li>自分に合った職場で長く働きたい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <h2 className="h2-line center fade">紹介予定派遣のメリット</h2>
          <div className="feature-grid">
            <div className="feature fade">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <h3>ミスマッチの低減</h3>
              <p>実際の業務を通して判断できるため、採用後のギャップを防ぐことができます。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-clock" aria-hidden="true" />
              <h3>効率的な採用活動</h3>
              <p>無駄なコストや時間を抑えながら、納得感のある採用が可能です。</p>
            </div>
            <div className="feature fade">
              <i className="bi bi-shield-check" aria-hidden="true" />
              <h3>安心して働ける環境</h3>
              <p>派遣期間中はサポート体制があり、不安を解消しながら就業できます。</p>
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
          <p className="note">※その他各種職種・雇用形態についてもご相談ください。</p>
        </div>
      </section>
      <CtaJob />
      <ServiceNav />
    </PageShell>
  );
}
