import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { CompanyNav } from "@/components/partials/CompanyNav";

const meta = {
  title: "企業理念",
  description: "株式会社エモリスリンクの企業理念「人を想い、つなぎ、価値を循環させる。」人を起点に考え、企業と働く人の双方にとって納得できる関係と、長く続く価値を創り続けます。",
  section: "company",
  hero: {
    en: "Philosophy",
    ja: "企業理念",
    img: "company-philosophy.jpg",
    crumbs: [
      [
        "company/",
        "企業情報"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("company/philosophy/", meta);

export default function CompanyPhilosophyPage() {
  return (
    <PageShell route="company/philosophy/" meta={meta}>
      <section className="section">
        <div className="container with-side">
          <div>
            <h2 className="page-catch fade">人を想い、つなぎ、価値を循環させる。</h2>
            <h3 className="h2-line">私たちの考え方</h3>
            <div className="message fade">
              <p>
                私たちは、
                <br />
                人と企業をつなぐ存在として、
                <br />
                これまで数多くの現場と向き合ってきました。
              </p>
              <p>
                人材派遣・人材紹介といった
                <br />
                「人と仕事を結ぶ」領域を軸に、
                <br />
                システムエンジニアリング、システム開発、
                <br />
                そしてWebデザインやWebマーケティングによる価値創出まで、
                <br />
                事業の形は変わっても、
                <br />
                私たちが大切にしてきた考え方は変わりません。
              </p>
              <p>
                それは、
                <br />
                <strong className="emphasis">人を起点に考えること</strong>
                {" "}
                です。
              </p>
              <p>
                企業には、それぞれの想いと課題があり、
                <br />
                働く人には、それぞれの可能性と人生があります。
                <br />
                どちらか一方だけを見るのではなく、
                <br />
                双方にとって無理のない、納得できる関係を築くこと。
                <br />
                その積み重ねこそが、
                <br />
                信頼と成長を生み出すと私たちは考えています。
              </p>
              <p>
                人を想い、可能性を育み、
                <br />
                人と企業、想いと価値をつなぎ、
                <br />
                その先にある未来へと循環させていく。
              </p>
              <p>
                私たちはこれからも、
                <br />
                目の前の一人ひとり、一社一社と誠実に向き合いながら、
                <br />
                長く続く価値を創り続けていきます。
              </p>
            </div>
          </div>
          <CompanyNav />
        </div>
      </section>
    </PageShell>
  );
}
