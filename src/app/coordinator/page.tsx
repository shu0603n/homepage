import Link from "next/link";
import type { Metadata } from "next";
import { Marquee } from "@/components/site/Marquee";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "人材コーディネーター募集",
  description: "札幌の人材コーディネーター求人。株式会社エモリスリンクは未経験OK・土日祝休み・年間休日125日・月平均残業20時間以下・転勤なし。月給23万円〜30万円、想定年収300万円〜390万円。",
  section: "recruit",
  hero: {
    en: "Coordinator",
    ja: "人材コーディネーター",
    img: "hero-coordinator.jpg",
    crumbs: [
      [
        "recruit/",
        "採用情報"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("coordinator/", meta);

export default function CoordinatorPage() {
  return (
    <PageShell route="coordinator/" meta={meta}>
      <Marquee items={["未経験OK","土日祝休み","20〜30代が活躍","残業少なめ（20h以下）","年間休日125日","転勤なし"]} />
      <section className="section section--gray">
        <div className="container">
          <div className="kpis" data-count-group>
            <div className="kpi fade">
              <div className="kpi__num kpi__num--range">
                <b data-count="300">300</b>〜<b data-count="390">390</b>
                <small>万</small>
              </div>
              <div className="kpi__label">想定年収</div>
            </div>
            <div className="kpi fade">
              <div className="kpi__num kpi__num--range">
                <b data-count="23">23</b>〜<b data-count="30">30</b>
                <small>万</small>
              </div>
              <div className="kpi__label">月給</div>
            </div>
            <div className="kpi fade">
              <div className="kpi__num">
                <b data-count="125">125</b>
                <small>日</small>
              </div>
              <div className="kpi__label">年間休日</div>
            </div>
            <div className="kpi fade">
              <div className="kpi__num">
                <b data-count="20">20</b>
                <small>h以下</small>
              </div>
              <div className="kpi__label">月平均残業</div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">About the Job</span>
          </div>
          <h2 className="catch fade">人と企業をつなぐ、コーディネーター職</h2>
          <div className="fade mb-48">
            <p>
              派遣コーディネーターとして、クライアント企業とスタッフ双方の間に立ち、最適なマッチングや就業後のフォローを行うポジションです。
              <br />
              未経験からでも挑戦でき、コミュニケーション力を活かして活躍できます。
            </p>
          </div>
          <div className="points points--3">
            <div className="point fade">
              <i className="bi bi-building" aria-hidden="true" />
              <span className="point__en">Client</span>
              <h3>企業への人材提案・ヒアリング</h3>
              <p>クライアントの人材ニーズをヒアリングし、最適な人材紹介や提案を行います。</p>
            </div>
            <div className="point fade">
              <i className="bi bi-people" aria-hidden="true" />
              <span className="point__en">Staff</span>
              <h3>スタッフ面談・配属調整</h3>
              <p>スタッフとの面談を通じて希望や適性を把握し、配属先の選定や調整を行います。</p>
            </div>
            <div className="point fade">
              <i className="bi bi-chat-heart" aria-hidden="true" />
              <span className="point__en">Support</span>
              <h3>就業後フォロー</h3>
              <p>就業後のスタッフフォローや相談対応など、継続的なサポートを行います。</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">Salary &amp; Benefits</span>
          </div>
          <h2 className="catch fade">未経験からでも安心してスタートできる給与体系</h2>
          <div className="salary salary--single">
            <div className="salary__main fade">
              <div className="salary__pair">
                <div>
                  <span className="label-en">Monthly Salary</span>
                  <p className="salary__caption">月給</p>
                  <p className="salary__amount">23万円 〜 30万円</p>
                </div>
                <div>
                  <span className="label-en">Annual Income</span>
                  <p className="salary__caption">想定年収</p>
                  <p className="salary__amount">300万円 〜 390万円</p>
                </div>
              </div>
              <p className="note">
                ※経験・スキルにより決定
                <br />
                ※試用期間2ヶ月（条件同一）
              </p>
            </div>
          </div>
          <ul className="tag-list fade">
            <li>昇給 年1回</li>
            <li>交通費支給</li>
            <li>社会保険完備</li>
            <li>健康診断</li>
            <li>服装自由</li>
          </ul>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">Work Conditions</span>
          </div>
          <h2 className="catch fade">働きやすい環境で長く活躍できる</h2>
          <div className="conditions">
            <div className="condition fade">
              <h3>
                <i className="bi bi-clock" aria-hidden="true" />
                勤務時間
              </h3>
              <ul>
                <li>09:00〜18:00</li>
                <li>月平均残業 20時間以下</li>
              </ul>
            </div>
            <div className="condition fade">
              <h3>
                <i className="bi bi-calendar-check" aria-hidden="true" />
                休日
              </h3>
              <ul>
                <li>土日祝休み</li>
                <li>年間休日125日</li>
                <li>GW・夏季・年末年始休暇</li>
                <li>産休・育休あり</li>
              </ul>
            </div>
            <div className="condition fade">
              <h3>
                <i className="bi bi-geo-alt" aria-hidden="true" />
                勤務地
              </h3>
              <ul>
                <li>北海道札幌市中央区</li>
                <li>転勤なし</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--navy">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">Selection Flow</span>
            <span className="ja">採用フロー</span>
          </div>
          <ol className="flow fade">
            <li>
              <span className="flow__num">1</span>
              <h3>書類選考</h3>
            </li>
            <li>
              <span className="flow__num">2</span>
              <h3>一次面接</h3>
            </li>
            <li>
              <span className="flow__num">3</span>
              <h3>二次面接</h3>
              <p>対面必須</p>
            </li>
            <li>
              <span className="flow__num">4</span>
              <h3>内定</h3>
            </li>
          </ol>
        </div>
      </section>
      <section className="section apply">
        <div className="container fade">
          <span className="label-en">Entry</span>
          <h2>人と企業をつなぐ仕事で、キャリアを築く</h2>
          <p>
            未経験からでも挑戦可能な人材コーディネーター職です。
            <br />
            コミュニケーション力を活かし、地域に貢献できる仕事です。
          </p>
          <Link className="btn btn--white" href="/job-seekers/?job=coordinator">今すぐ応募する</Link>
        </div>
      </section>
    </PageShell>
  );
}
