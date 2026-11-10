import Link from "next/link";
import type { Metadata } from "next";
import { Marquee } from "@/components/site/Marquee";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";

const meta = {
  title: "システムエンジニア募集",
  description: "札幌のシステムエンジニア求人。株式会社エモリスリンクは案件選択自由・前給保証制度・月平均残業5時間以内・フルリモート相談可・年間休日125日。月給35万円〜55万円、大通駅徒歩5分、学歴不問。",
  section: "recruit",
  hero: {
    en: "System Engineer",
    ja: "システムエンジニア",
    img: "hero-engineer.jpg",
    crumbs: [
      [
        "recruit/",
        "採用情報"
      ]
    ]
  }
} as const;

export const metadata: Metadata = buildMetadata("system-engineer/", meta);

export default function SystemEngineerPage() {
  return (
    <PageShell route="system-engineer/" meta={meta}>
      <Marquee items={["案件選択 自由","前給保証制度あり","月平均残業 5時間以内","フルリモート相談可","年間休日 125日","産休・育休実績あり","大通駅 徒歩5分","学歴不問"]} />
      <section className="section section--gray">
        <div className="container">
          <div className="kpis" data-count-group>
            <div className="kpi fade">
              <div className="kpi__num">
                ¥<b data-count="80">80</b>
                <small>万</small>
              </div>
              <div className="kpi__label">初年度 年収UP実績あり</div>
            </div>
            <div className="kpi fade">
              <div className="kpi__num">
                <b data-count="5">5</b>
                <small>h</small>
              </div>
              <div className="kpi__label">月平均残業時間</div>
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
                <b data-count="100">100</b>
                <small>%</small>
              </div>
              <div className="kpi__label">案件選択の自由度</div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">About the Job</span>
          </div>
          <h2 className="catch fade">
            「エンジニアファースト」が
            <br />
            ここには根づいている
          </h2>
          <div className="fade mb-48">
            <p>
              2021年の創業以来、エンジニアが納得して働ける場所づくりを追求してきた当社。
              <br />
              業界でも高い還元率を誇り、スキルに見合った報酬・自由な案件選択・充実したワークライフバランス——すべてが揃っています。
              <br />
              「もっとスキルを身につけたい」「納得の環境で理想を叶えたい」そんな想いに応えます。
            </p>
          </div>
          <div className="points">
            <div className="point fade">
              <i className="bi bi-compass" aria-hidden="true" />
              <span className="point__en">Freedom</span>
              <h3>
                案件は自分で選ぶ。
                <br />
                会社都合のアサインは一切なし。
              </h3>
              <p>
                スキルや希望・働き方に合わせて案件を自由に選択できます。「この技術を伸ばしたい」「上流工程を経験したい」——あなたの意思がキャリアを動かします。
              </p>
            </div>
            <div className="point fade">
              <i className="bi bi-graph-up-arrow" aria-hidden="true" />
              <span className="point__en">Growth</span>
              <h3>
                要件定義から運用まで。
                <br />
                上流工程も経験できる環境。
              </h3>
              <p>
                大手企業のプライム案件をメインに、Java・JavaScriptを使ったWeb系システム開発を行っています。要件定義・基本設計などの上流工程も担当でき、着実にレベルアップできます。
              </p>
            </div>
            <div className="point fade">
              <i className="bi bi-house-heart" aria-hidden="true" />
              <span className="point__en">Balance</span>
              <h3>
                フルリモート対応。
                <br />
                定時退社が当たり前の文化。
              </h3>
              <p>
                フルリモート・ハイブリッドなど多様な働き方に対応。月平均残業は5時間以内で定時退社が基本です。プライベートも大切にしながら、長くキャリアを積み上げられます。
              </p>
            </div>
            <div className="point fade">
              <i className="bi bi-chat-dots" aria-hidden="true" />
              <span className="point__en">Support</span>
              <h3>
                月次面談で伴走。
                <br />
                いつでも相談できる環境。
              </h3>
              <p>
                入社後はスキルや希望を丁寧にヒアリングし、最適なプロジェクトを選定。案件参画後も月1回の定期面談で、次のチャレンジについて話し合います。一人で悩む必要はありません。
              </p>
            </div>
            <div className="point fade">
              <i className="bi bi-stars" aria-hidden="true" />
              <span className="point__en">Innovation</span>
              <h3>
                AI案件にも挑戦できる。
                <br />
                最前線の技術に触れる機会。
              </h3>
              <p>
                生成AI・LLMを活用したサービス開発など、業界最先端の案件にも参画可能。Python・Vue.js・Azureなどを使った実践経験で、市場価値を大きく高められます。
              </p>
            </div>
            <div className="point fade">
              <i className="bi bi-diagram-3" aria-hidden="true" />
              <span className="point__en">Career</span>
              <h3>
                組織を作る側にも。
                <br />
                新事業提案制度を活用できる。
              </h3>
              <p>
                スタートアップフェーズにある当社では、社内提案制度を通じて新事業の立ち上げにも携われます。技術を磨きながら、組織づくりにも関わりたい方に最適な環境です。
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section section--gray">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">Salary &amp; Benefits</span>
          </div>
          <h2 className="catch fade">
            努力とスキルを、
            <br />
            きちんと収入に還元する。
          </h2>
          <div className="salary">
            <div className="salary__main fade">
              <span className="label-en">Monthly Salary</span>
              <p className="salary__amount">
                35万円 〜 55万円
                {" "}
                <small>／月</small>
              </p>
              <p className="note">
                ※給与は経験・スキルを考慮して決定
                <br />
                ※固定残業（30時間分）含む。超過分は別途支給
              </p>
              <ul className="tag-list">
                <li>実務経験 5年以下：月給 35万円〜</li>
                <li>実務経験 5年以上：月給 40万円〜</li>
                <li>高スキル / シニアクラス：月給 50万円〜 実績あり</li>
              </ul>
            </div>
            <ul className="salary__cases fade">
              <li>
                <span>30歳 / 入社1年目</span>
                <strong>年収 430万円</strong>
              </li>
              <li>
                <span>32歳 / 入社2年目</span>
                <strong>年収 530万円</strong>
              </li>
              <li>
                <span>36歳 / 入社3年目</span>
                <strong>年収 620万円</strong>
              </li>
            </ul>
          </div>
          <div className="guarantee fade">
            <i className="bi bi-shield-check" aria-hidden="true" />
            <div>
              <h3>前給保証制度あり</h3>
              <p>転職前の給与を下回らない安心の制度。初年度で年収80万円UPの実績もあります。</p>
            </div>
          </div>
          <ul className="tag-list fade">
            <li>昇給 年1回（3月）</li>
            <li>待機期間中も給与変動なし</li>
            <li>時間外手当・役職手当</li>
            <li>資格取得支援制度</li>
            <li>技術書購入補助</li>
          </ul>
        </div>
      </section>
      <section className="section section--navy">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">Project Examples</span>
          </div>
          <h2 className="catch fade text-white">
            多彩な案件で、
            <br />
            スキルの幅を広げられる。
          </h2>
          <p className="fade mb-48">
            保険・製造・公共・AIなど幅広い業界のプライム案件に参画できます。
            <br />
            要件定義から運用保守まで、希望とスキルに合わせた工程を担当できます。
          </p>
          <div className="projects">
            <div className="project fade">
              <span className="project__cat">保険・金融</span>
              <h3>保険会社向け契約管理システムの再構築</h3>
              <ul>
                <li>Java</li>
                <li>Spring</li>
                <li>Oracle</li>
              </ul>
            </div>
            <div className="project fade">
              <span className="project__cat">製造・IoT</span>
              <h3>製造業向け IoTデバイス管理プラットフォーム開発</h3>
              <ul>
                <li>Python</li>
                <li>FastAPI</li>
                <li>React</li>
                <li>AWS</li>
              </ul>
            </div>
            <div className="project fade">
              <span className="project__cat">公共・自治体</span>
              <h3>自治体向け電子申請ポータルの開発</h3>
              <ul>
                <li>PHP</li>
                <li>Laravel</li>
                <li>MySQL</li>
              </ul>
            </div>
            <div className="project fade">
              <span className="project__cat">Web サービス</span>
              <h3>Web サービスの運用・改修</h3>
              <ul>
                <li>PHP</li>
                <li>Laravel</li>
                <li>Vue.js</li>
              </ul>
            </div>
            <div className="project fade">
              <span className="project__cat">モビリティ</span>
              <h3>車載系アプリの設計・開発</h3>
              <ul>
                <li>Python</li>
                <li>React</li>
                <li>PostgreSQL</li>
              </ul>
            </div>
            <div className="project fade">
              <span className="project__cat">AI・最先端</span>
              <h3>生成 AI サービス開発</h3>
              <ul>
                <li>AI / LLM</li>
                <li>Python</li>
                <li>Vue.js</li>
                <li>Azure</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="sec-title fade">
            <span className="en">Work Conditions</span>
          </div>
          <h2 className="catch fade">働きやすさのすべてが揃っている。</h2>
          <div className="conditions">
            <div className="condition fade">
              <h3>
                <i className="bi bi-clock" aria-hidden="true" />
                勤務時間・休日
              </h3>
              <ul>
                <li>9:00〜18:00（実働8時間 / 休憩60分）</li>
                <li>完全週休2日制（土・日）＋祝日</li>
                <li>年間休日 125日</li>
                <li>年末年始・夏季・GW 休暇あり</li>
                <li>月平均残業 5時間以内・原則定時退社</li>
                <li>有給休暇</li>
                <li>産前・産後休暇、育児休暇（取得・復職実績あり）</li>
              </ul>
            </div>
            <div className="condition fade">
              <h3>
                <i className="bi bi-geo-alt" aria-hidden="true" />
                勤務地・アクセス
              </h3>
              <ul>
                <li>自社内 または 札幌市内（中央区）クライアント先</li>
                <li>地下鉄 大通駅 徒歩5分</li>
                <li>JR・地下鉄 さっぽろ駅 徒歩5分</li>
                <li>転居を伴う転勤なし</li>
                <li>フルリモート相談可</li>
                <li>勤務地は希望を考慮して決定</li>
              </ul>
            </div>
            <div className="condition fade">
              <h3>
                <i className="bi bi-person-check" aria-hidden="true" />
                応募資格
              </h3>
              <ul>
                <li>学歴不問</li>
                <li>
                  いずれかの言語経験がある方
                  <small>Java / Python / PHP / JavaScript / C# / Ruby / Go / Swift 等</small>
                </li>
                <li>第二新卒・ブランクの方も歓迎</li>
                <li>業界未経験でも知識・経験を活かせる方</li>
              </ul>
            </div>
            <div className="condition fade">
              <h3>
                <i className="bi bi-heart-pulse" aria-hidden="true" />
                社会保険・福利厚生
              </h3>
              <ul>
                <li>健康保険・厚生年金・雇用保険・労災保険完備</li>
                <li>交通費全額支給・副業可</li>
                <li>服装・髪型自由</li>
                <li>試用期間 3ヶ月（本採用と同条件）</li>
                <li>技術書購入補助 / 資格取得支援制度</li>
                <li>社内新規事業提案制度（MVP受賞で事業化）</li>
                <li>慶弔見舞金・定期健康診断</li>
              </ul>
            </div>
          </div>
          <div className="perks">
            <div className="perk fade">
              <i className="bi bi-calendar-check" aria-hidden="true" />
              <strong>
                年間休日
                <br />
                125日
              </strong>
              <span>完全週休2日＋祝日</span>
            </div>
            <div className="perk fade">
              <i className="bi bi-laptop" aria-hidden="true" />
              <strong>
                リモート
                <br />
                ワーク可
              </strong>
              <span>フルリモート相談可</span>
            </div>
            <div className="perk fade">
              <i className="bi bi-award" aria-hidden="true" />
              <strong>
                資格取得
                <br />
                支援制度
              </strong>
              <span>技術書購入補助あり</span>
            </div>
            <div className="perk fade">
              <i className="bi bi-balloon-heart" aria-hidden="true" />
              <strong>
                産休・育休
                <br />
                実績あり
              </strong>
              <span>復職実績も豊富</span>
            </div>
            <div className="perk fade">
              <i className="bi bi-person-badge" aria-hidden="true" />
              <strong>
                服装・髪型
                <br />
                自由
              </strong>
              <span>自分らしく働ける</span>
            </div>
            <div className="perk fade">
              <i className="bi bi-lightbulb" aria-hidden="true" />
              <strong>
                新事業
                <br />
                提案制度
              </strong>
              <span>アイデアが事業に</span>
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
              <h3>エントリー</h3>
              <p>約1分でカンタン入力。いつでも応募可能。</p>
            </li>
            <li>
              <span className="flow__num">2</span>
              <h3>書類選考</h3>
              <p>迅速に結果をご連絡。学歴不問。</p>
            </li>
            <li>
              <span className="flow__num">3</span>
              <h3>1次面接（Web）</h3>
              <p>オンラインで気軽に。平日19時以降も対応。</p>
            </li>
            <li>
              <span className="flow__num">4</span>
              <h3>2次面接</h3>
              <p>弊社にご来社いただき、実施。</p>
            </li>
            <li>
              <span className="flow__num">5</span>
              <h3>内定</h3>
              <p>最短2週間で内定。入社日も相談可能。</p>
            </li>
          </ol>
          <ul className="flow-notes fade">
            <li>応募から内定まで2〜4週間を予定</li>
            <li>在職中の方も大歓迎・入社日は要相談</li>
            <li>平日19時以降の面接にも対応</li>
            <li>遠方の方はWeb面接で対応します</li>
            <li>「給与」「働き方」の質問も大歓迎</li>
            <li>リラックスしてお越しください</li>
          </ul>
        </div>
      </section>
      <section className="section apply">
        <div className="container fade">
          <span className="label-en">Entry</span>
          <h2>
            “エンジニアファースト”の当社で、
            <br />
            理想のキャリアを叶えよう。
          </h2>
          <p>
            スキルを磨きたい、収入を上げたい、自分らしく働きたい。
            <br />
            そんな想いを、ここで実現させてください。
            <br />
            まずはお気軽にエントリーをどうぞ。
          </p>
          <Link className="btn btn--white" href="/job-seekers/?job=engineer">今すぐ応募する</Link>
        </div>
      </section>
    </PageShell>
  );
}
