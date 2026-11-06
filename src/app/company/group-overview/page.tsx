import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CompanyNav } from "@/components/partials/CompanyNav";

const meta = {
  title: "グループ概要",
  description: "株式会社エモリスリンクが属するメイホーグループのグループ概要。グループ経営企画、人材関連サービス事業、建設関連サービス事業、建設事業、介護事業のグループ各社をご紹介します。",
  section: "company",
  hero: {
    en: "Group",
    ja: "グループ概要",
    img: "hero-company.jpg",
    crumbs: [
      [
        "company/",
        "企業情報"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("company/group-overview/", meta);

export default function CompanyGroupOverviewPage() {
  return (
    <PageShell route="company/group-overview/" meta={meta}>
      <section className="section">
        <div className="container with-side">
          <div>
            <h2 className="page-catch fade">変わる勇気が、未来を変える</h2>
            <figure className="page-figure fade">
              <img src="/assets/img/company-group.png" alt="メイホーグループ" loading="lazy" />
            </figure>
            <div className="group-block fade">
              <h2>グループ経営企画</h2>
              <ul className="group-logos">
                <li>
                  <a href="https://meihoholdings.co.jp/service/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-1.png" alt="" loading="lazy" />
                    株式会社メイホーホールディングス
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="group-block fade">
              <h2>人材関連サービス事業</h2>
              <ul className="group-logos">
                <li>
                  <a href="https://www.meihoattivo.co.jp/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-2.png" alt="" loading="lazy" />
                    株式会社メイホーアティーボ
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.staffad.co.jp/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-3.png" alt="" loading="lazy" />
                    株式会社スタッフアドバンス
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.meihoguardia.co.jp/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-4.png" alt="" loading="lazy" />
                    株式会社メイホーガーディア
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
                <li>
                  <a href="https://meiho-aphivat.com/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-5.png" alt="" loading="lazy" />
                    Meiho Aphivat Co.,Ltd
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.resonagate.co.jp/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-6.png" alt="" loading="lazy" />
                    株式会社レゾナゲート
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
                <li>
                  <a href="https://meihoarcs.co.jp/" target="_blank" rel="noopener">
                    <img src="/assets/img/group-7.png" alt="" loading="lazy" />
                    株式会社メイホーアークス
                    <span className="ext">LINK ↗</span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="group-block fade">
              <h2>建設関連サービス事業</h2>
              <ul className="group-names">
                <li>株式会社メイホーエンジニアリング</li>
                <li>株式会社オースギ</li>
                <li>株式会社エイコー技術コンサルタント</li>
                <li>株式会社地域コンサルタント</li>
                <li>株式会社エスジー技術コンサルタント</li>
                <li>株式会社ノース技研</li>
                <li>株式会社安芸建設コンサルタント</li>
                <li>株式会社フジ土木設計</li>
                <li>株式会社未来政策研究所</li>
              </ul>
            </div>
            <div className="group-block fade">
              <h2>建設事業</h2>
              <ul className="group-names">
                <li>株式会社東組</li>
                <li>株式会社愛木</li>
                <li>株式会社有坂建設</li>
                <li>株式会社三川土建</li>
                <li>今田建設株式会社</li>
                <li>ハーミット株式会社</li>
                <li>天野建設株式会社</li>
              </ul>
            </div>
            <div className="group-block fade">
              <h2>介護事業</h2>
              <ul className="group-names">
                <li>株式会社アルト</li>
              </ul>
            </div>
          </div>
          <CompanyNav />
        </div>
      </section>
    </PageShell>
  );
}
