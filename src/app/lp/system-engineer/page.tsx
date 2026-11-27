import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SalaryCheck, Worries } from "@/components/lp/SeLpClient";
import { PageShell } from "@/components/site/PageShell";
import { LP_SE_APPLY } from "@/lib/lp";
import { buildMetadata } from "@/lib/metadata";

// Meta 広告「システムエンジニア（経験者）」の行き先のページ（LP）。広告の画像と同じ見た目で始め、
// 共感 → 原因 → 給与チェック → 理由 → 年収 → 働き方 → 入社祝い金 → 流れ → よくある質問 → 応募 と読み進めてもらう。
// 画面下（スマホ）・右端（PC）のタブは、このページだけ「エンジニア応募」「入社祝い金20万円」に固定（components/site/Promo.tsx）。
// 通常の募集ページ（/system-engineer/）と内容が重なるため、検索結果には出さない
const meta = {
  title: "システムエンジニア（経験者）募集｜あなたの市場価値、その給与で本当に合っていますか？",
  description: "札幌のシステムエンジニア（正社員・経験者）募集。月給35万〜55万円、初年度年収最大80万円UP実績、前給保証制度、案件自由選択制、月平均残業5時間以内、年間休日125日、フルリモート相談可。公式HPからの応募で入社祝い金20万円。",
  section: "recruit",
  ogImage: "lp/se-og.jpg",
} as const;

export const metadata: Metadata = { ...buildMetadata("lp/system-engineer/", meta), robots: { index: false, follow: true } };

function Cta({ children, sub = "約1分でかんたん入力・在職中の方も歓迎" }: { children?: ReactNode; sub?: string }) {
  return (
    <div className="lpse-cta">
      <Link className="lpse-btn" href={LP_SE_APPLY}>
        {children ?? "今すぐ応募する"}
        <i className="bi bi-chevron-right" aria-hidden="true" />
      </Link>
      <p className="lpse-cta__sub">{sub}</p>
    </div>
  );
}

function Head({ en, children, lead }: { en: string; children: ReactNode; lead?: ReactNode }) {
  return (
    <div className="lpse-head fade">
      <span className="lpse-head__en">{en}</span>
      <h2>{children}</h2>
      {lead && <p className="lpse-head__lead">{lead}</p>}
    </div>
  );
}

export default function SystemEngineerLp() {
  return (
    <PageShell route="lp/system-engineer/" meta={meta} special>
      <div className="lpse">
        {/* ファーストビュー：広告と同じ写真・言葉・色で始める（広告から来た人が「さっきの広告だ」と分かるように）。
            写真の左側が空いているので、そこに見出し・特徴・給与・応募ボタンを載せる（ロゴは上のヘッダーにあるので載せない） */}
        <section className="lpse-fv">
          <picture className="lpse-fv__bg">
            <source media="(max-width: 767px)" srcSet="/assets/img/lp/se-hero-sp.webp" width={800} height={767} />
            <img src="/assets/img/lp/se-hero.webp" width={1808} height={870} alt="" fetchPriority="high" />
          </picture>
          <div className="lpse-fv__inner">
            <div className="lpse-fv__copy">
              <p className="lpse-fv__kicker">
                <span>エンジニア経験者</span>のあなたへ
              </p>
              <h1 className="lpse-fv__title">
                <span className="lpse-fv__line">あなたの市場価値、</span>
                <span className="lpse-fv__line is-hot">
                  その<em>給与</em>で
                </span>
                <span className="lpse-fv__line">本当に合っていますか？</span>
              </h1>
              <ul className="lpse-fv__badges">
                <li className="is-pink">
                  <i className="bi bi-buildings" aria-hidden="true" />
                  上場
                  <br />
                  グループ
                </li>
                <li className="is-green">
                  <i className="bi bi-code-slash" aria-hidden="true" />
                  案件
                  <br />
                  自由選択制
                </li>
                <li className="is-blue">
                  <i className="bi bi-coin" aria-hidden="true" />
                  前給保証
                  <br />
                  制度あり
                </li>
              </ul>
              <p className="lpse-fv__job">
                <span>経験者採用</span>システムエンジニア（正社員）
              </p>
              <div className="lpse-fv__pay">
                <p>
                  <small>月給</small>
                  <b>35</b>万円〜<b>55</b>万円
                </p>
                <p>
                  <small>初年度 年収UP実績</small>
                  最大<b>80</b>万円UP
                </p>
              </div>
              <Cta />
            </div>
          </div>
          {/* 入社祝い金のシール（写真の右下） */}
          <p className="lpse-fv__seal">
            <small>公式HPからの応募限定</small>
            入社祝い金
            <span>
              <b>20</b>万円
            </span>
          </p>
          <a className="lpse-scroll" href="#worry">
            <span>あなたの「今」と比べてみませんか？</span>
            <i className="bi bi-chevron-double-down" aria-hidden="true" />
          </a>
        </section>

        {/* 共感：こんなモヤモヤ、ありませんか？ */}
        <section className="lpse-sec" id="worry">
          <div className="lpse-wrap">
            <Head en="Check">
              エンジニアとして頑張っているのに、
              <br />
              <mark>こんなモヤモヤ</mark>ありませんか？
            </Head>
            <Worries />
          </div>
        </section>

        {/* 原因：働く場所の仕組み */}
        <section className="lpse-sec lpse-sec--tint">
          <div className="lpse-wrap">
            <Head en="Why" lead="同じスキルでも、働く会社の仕組みが違えば、給与も働き方も変わります。">
              給与が上がらないのは、
              <br />
              <mark>会社の仕組み</mark>のせいかもしれません。
            </Head>
            <div className="lpse-compare fade">
              <div className="lpse-compare__col is-before">
                <p className="lpse-compare__title">よくある働き方</p>
                <ul>
                  <li>案件は会社の都合で決まる</li>
                  <li>単価が上がっても、給与への還元は見えない</li>
                  <li>転職すると、給与が下がるかもしれない</li>
                  <li>残業が当たり前</li>
                </ul>
              </div>
              <div className="lpse-compare__arrow" aria-hidden="true">
                <i className="bi bi-arrow-right" />
              </div>
              <div className="lpse-compare__col is-after">
                <p className="lpse-compare__title">エモリスリンク</p>
                <ul>
                  <li>
                    案件は<strong>自分で選ぶ</strong>。会社都合のアサインはなし
                  </li>
                  <li>
                    業界でも高い還元率。スキルを<strong>きちんと給与に</strong>
                  </li>
                  <li>
                    <strong>前給保証制度</strong>で、転職前の給与を下回らない
                  </li>
                  <li>
                    月平均残業<strong>5時間以内</strong>。定時退社が基本
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 給与チェック */}
        <section className="lpse-sec" id="check">
          <div className="lpse-wrap">
            <Head en="Market Value" lead="経験と今の月給を選ぶだけ。当社での月給の目安が分かります。">
              あなたの<mark>市場価値</mark>、
              <br />
              チェックしてみましょう。
            </Head>
            <div className="fade">
              <SalaryCheck />
            </div>
          </div>
        </section>

        {/* 選ばれる3つの理由（広告の3つの丸と同じ） */}
        <section className="lpse-sec lpse-sec--tint">
          <div className="lpse-wrap">
            <Head en="Reasons">
              エンジニアが
              <br className="sp-only" />
              <mark>納得して働ける</mark>3つの理由
            </Head>
            <div className="lpse-reasons">
              <article className="lpse-reason fade is-pink">
                <span className="lpse-reason__num">01</span>
                <span className="lpse-reason__icon">
                  <i className="bi bi-buildings" aria-hidden="true" />
                </span>
                <h3>上場グループの安定基盤</h3>
                <p>上場グループの一員として、安定した経営基盤のもとで働けます。大手企業のプライム案件がメインです。</p>
              </article>
              <article className="lpse-reason fade is-green" style={{ ["--d" as string]: ".1s" }}>
                <span className="lpse-reason__num">02</span>
                <span className="lpse-reason__icon">
                  <i className="bi bi-code-slash" aria-hidden="true" />
                </span>
                <h3>案件自由選択制</h3>
                <p>スキルや希望・働き方に合わせて、案件を自分で選べます。「この技術を伸ばしたい」「上流工程を経験したい」——あなたの意思がキャリアを動かします。</p>
              </article>
              <article className="lpse-reason fade is-blue" style={{ ["--d" as string]: ".2s" }}>
                <span className="lpse-reason__num">03</span>
                <span className="lpse-reason__icon">
                  <i className="bi bi-coin" aria-hidden="true" />
                </span>
                <h3>前給保証制度あり</h3>
                <p>転職前の給与を下回らない安心の制度。待機期間中も給与は変わりません。初年度で年収80万円UPの実績もあります。</p>
              </article>
            </div>
          </div>
        </section>

        {/* 途中の応募 */}
        <section className="lpse-band">
          <div className="lpse-wrap fade">
            <p className="lpse-band__lead">まずは話を聞くだけでもOK。</p>
            <p className="lpse-band__title">
              「給与」「働き方」の質問も大歓迎です。
            </p>
            <Cta sub="平日19時以降・Web面接にも対応しています" />
          </div>
        </section>

        {/* 年収 */}
        <section className="lpse-sec">
          <div className="lpse-wrap">
            <Head en="Salary" lead="努力とスキルを、きちんと収入に還元します。">
              月給<mark>35万円〜55万円</mark>。
              <br />
              初年度 年収<mark>最大80万円UP</mark>の実績。
            </Head>
            <div className="lpse-salary">
              <ul className="lpse-salary__bands fade">
                <li>
                  <span>実務経験 5年以下</span>
                  <strong>
                    月給<b>35</b>万円〜
                  </strong>
                </li>
                <li>
                  <span>実務経験 5年以上</span>
                  <strong>
                    月給<b>40</b>万円〜
                  </strong>
                </li>
                <li>
                  <span>高スキル・シニアクラス</span>
                  <strong>
                    月給<b>50</b>万円〜
                  </strong>
                </li>
              </ul>
              <div className="lpse-salary__cases fade" data-count-group>
                <p className="lpse-salary__title">年収の例</p>
                {(
                  [
                    ["30歳 / 入社1年目", 430],
                    ["32歳 / 入社2年目", 530],
                    ["36歳 / 入社3年目", 620],
                  ] as const
                ).map(([who, yen]) => (
                  <div key={who} className="lpse-bar">
                    <span className="lpse-bar__who">{who}</span>
                    <span className="lpse-bar__track">
                      <span className="lpse-bar__fill" style={{ ["--w" as string]: `${(yen / 650) * 100}%` }} />
                    </span>
                    <strong>
                      <b data-count={yen}>{yen}</b>万円
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            <p className="lpse-note">※ 給与は経験・スキルを考慮して決定します。固定残業（30時間分）を含み、超過分は別途支給。昇給は年1回（3月）。</p>
          </div>
        </section>

        {/* 働き方（広告の4つのマスと同じ） */}
        <section className="lpse-sec lpse-sec--tint">
          <div className="lpse-wrap">
            <Head en="Work Style" lead="プライベートも大切にしながら、長くキャリアを積み上げられます。">
              <mark>定時退社</mark>が当たり前の働き方。
            </Head>
            <div className="lpse-tiles" data-count-group>
              <div className="lpse-tile fade is-pink">
                <i className="bi bi-clock" aria-hidden="true" />
                <span>月平均残業</span>
                <strong>
                  <b data-count="5">5</b>時間以内
                </strong>
              </div>
              <div className="lpse-tile fade is-green" style={{ ["--d" as string]: ".08s" }}>
                <i className="bi bi-calendar3" aria-hidden="true" />
                <span>年間休日</span>
                <strong>
                  <b data-count="125">125</b>日
                </strong>
              </div>
              <div className="lpse-tile fade is-blue" style={{ ["--d" as string]: ".16s" }}>
                <i className="bi bi-laptop" aria-hidden="true" />
                <span>フルリモート</span>
                <strong>相談可</strong>
              </div>
              <div className="lpse-tile fade is-purple" style={{ ["--d" as string]: ".24s" }}>
                <i className="bi bi-train-front" aria-hidden="true" />
                <span>大通駅・さっぽろ駅</span>
                <strong>
                  徒歩<b data-count="5">5</b>分
                </strong>
              </div>
            </div>
            <ul className="lpse-chips fade">
              <li>完全週休2日（土日祝）</li>
              <li>転居を伴う転勤なし</li>
              <li>産休・育休の取得・復職実績あり</li>
              <li>資格取得支援・技術書購入補助</li>
              <li>服装・髪型自由</li>
              <li>副業可</li>
              <li>交通費全額支給</li>
            </ul>
          </div>
        </section>

        {/* 案件 */}
        <section className="lpse-sec">
          <div className="lpse-wrap">
            <Head en="Projects" lead="要件定義から運用保守まで、希望とスキルに合わせた工程を担当できます。">
              <mark>選べる案件</mark>で、スキルの幅を広げる。
            </Head>
            <div className="lpse-projects">
              {(
                [
                  ["保険・金融", "保険会社向け契約管理システムの再構築", ["Java", "Spring", "Oracle"]],
                  ["製造・IoT", "製造業向け IoT デバイス管理プラットフォーム開発", ["Python", "FastAPI", "React", "AWS"]],
                  ["公共・自治体", "自治体向け電子申請ポータルの開発", ["PHP", "Laravel", "MySQL"]],
                  ["Web サービス", "Web サービスの運用・改修", ["PHP", "Laravel", "Vue.js"]],
                  ["モビリティ", "車載系アプリの設計・開発", ["Python", "React", "PostgreSQL"]],
                  ["AI・最先端", "生成 AI サービス開発", ["AI / LLM", "Python", "Vue.js", "Azure"]],
                ] as const
              ).map(([cat, title, tech], i) => (
                <article key={title} className="lpse-project fade" style={{ ["--d" as string]: `${(i % 3) * 0.08}s` }}>
                  <span className="lpse-project__cat">{cat}</span>
                  <h3>{title}</h3>
                  <ul>
                    {tech.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="lpse-note">
              応募資格：学歴不問。Java / Python / PHP / JavaScript / C# / Ruby / Go / Swift などいずれかの言語の実務経験がある方。第二新卒・ブランクのある方も歓迎です。
            </p>
          </div>
        </section>

        {/* 入社祝い金 */}
        <section className="lpse-bonus">
          <span className="lpse-blob lpse-blob--4" aria-hidden="true" />
          <div className="lpse-wrap fade">
            <p className="lpse-ribbon">
              <i className="bi bi-gift" aria-hidden="true" />
              公式HPからの応募限定
            </p>
            <p className="lpse-bonus__title">いま応募すると</p>
            <p className="lpse-bonus__amount">
              入社祝い金<b>20</b>
              <span>万円</span>
            </p>
            <p className="lpse-bonus__text">このページ（公式HP）から応募して入社された方に、入社祝い金をお贈りします。詳しくは面接でご案内します。</p>
            <Cta>応募して入社祝い金を受け取る</Cta>
          </div>
        </section>

        {/* 流れ */}
        <section className="lpse-sec">
          <div className="lpse-wrap">
            <Head en="Flow" lead="応募から内定まで2〜4週間が目安。在職中の方も、入社日は相談できます。">
              応募から内定まで<mark>最短2週間</mark>。
            </Head>
            <ol className="lpse-flow">
              {(
                [
                  ["エントリー", "約1分でかんたん入力。いつでも応募できます。"],
                  ["書類選考", "すばやく結果をご連絡します。学歴不問。"],
                  ["1次面接（Web）", "オンラインで気軽に。平日19時以降も対応。"],
                  ["2次面接", "弊社（大通駅 徒歩5分）にお越しいただきます。"],
                  ["内定", "最短2週間で内定。入社日もご相談ください。"],
                ] as const
              ).map(([t, d], i) => (
                <li key={t} className="fade" style={{ ["--d" as string]: `${i * 0.08}s` }}>
                  <span className="lpse-flow__num">{i + 1}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* よくある質問 */}
        <section className="lpse-sec lpse-sec--tint">
          <div className="lpse-wrap">
            <Head en="FAQ">よくある質問</Head>
            <div className="lpse-faq fade">
              {(
                [
                  ["在職中でも応募できますか？", "はい、大歓迎です。面接は平日19時以降やWebでも対応しており、入社日もご相談いただけます。"],
                  ["前給保証制度とは何ですか？", "転職前の給与を下回らないようにする制度です。待機期間中も給与は変わりません。"],
                  ["案件は本当に自分で選べますか？", "はい。入社後にスキルや希望を丁寧にお聞きし、最適な案件を一緒に選びます。会社都合のアサインはありません。参画後も月1回の面談で次のチャレンジを相談できます。"],
                  ["フルリモートで働けますか？", "フルリモート・ハイブリッドなど、多様な働き方に対応しています。案件によって異なるため、面接でご希望をお聞かせください。"],
                  ["どのくらいの経験が必要ですか？", "いずれかの言語での実務経験があれば応募できます。学歴は問いません。第二新卒やブランクのある方も歓迎です。"],
                  ["入社祝い金はどうすればもらえますか？", "このページ（公式HP）から応募し、入社された方が対象です。詳しくは面接でご案内します。"],
                ] as const
              ).map(([q, a]) => (
                <details key={q}>
                  <summary>
                    <span className="lpse-faq__q">Q</span>
                    {q}
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                  </summary>
                  <p>
                    <span className="lpse-faq__a">A</span>
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 最後の応募 */}
        <section className="lpse-final">
          <span className="lpse-blob lpse-blob--5" aria-hidden="true" />
          <div className="lpse-wrap fade">
            <p className="lpse-final__lead">エンジニア経験者のあなたへ</p>
            <h2>
              あなたのスキルに、
              <br />
              <mark>見合う給与</mark>と働き方を。
            </h2>
            <p className="lpse-final__text">スキルを磨きたい、収入を上げたい、自分らしく働きたい。その想いを、エモリスリンクで叶えてください。</p>
            <Cta />
            <p className="lpse-final__link">
              <Link href="/system-engineer/">募集要項をくわしく見る</Link>
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
