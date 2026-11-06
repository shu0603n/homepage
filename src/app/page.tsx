import type { CSSProperties } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { buildMetadata } from "@/lib/metadata";
import { Arrow } from "@/components/site/Arrow";
import { MapList } from "@/components/site/MapList";
import { IsoMap } from "@/components/site/IsoMap";
import { MapPins } from "@/components/site/MapPins";

const meta = {
  bodyClass: "home",
  description: "札幌・大通の株式会社エモリスリンクは、人材派遣・人材紹介・紹介予定派遣・業務委託・システムエンジニアリング（SES）・システム開発・WEBデザイン・WEBマーケティングを提供。人材とITの両面から、人と企業をつなぎます。"
} as const;

export const metadata: Metadata = buildMetadata("", meta);

export default function HomePage() {
  return (
    <PageShell route="" meta={meta}>
      <section className="kv" aria-label="メインビジュアル">
        <div className="kv__media">
          <video className="kv__video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
            <source src="/assets/video/hero.mov" type="video/mp4" />
          </video>
        </div>
        <p className="kv__bigword" aria-hidden="true">
          <span>EMORIS LINK — EMPATHY × NOURISH × LINK —</span>
          <span>EMORIS LINK — EMPATHY × NOURISH × LINK —</span>
        </p>
        <div className="kv__inner">
          <p className="kv__eyebrow">
            <span className="kv__eyebrow-line" aria-hidden="true" />
            Empathy × Nourish × Link
          </p>
          <h1 className="kv__catch">
            <span className="kv__line">
              <span>人と技術の力で、</span>
            </span>
            {" "}
            <span className="kv__line">
              <span>
                働くを
                <em>もっと自由に。</em>
              </span>
            </span>
          </h1>
          <p className="kv__lead">
            札幌・大通を拠点に、人材サービスとITサービスで
            <br className="pc-only" />
            企業の成長と、一人ひとりの働き方を支えています。
          </p>
          <div className="kv__btns">
            <Link className="btn btn--white magnetic" href="/service/">事業内容を見る</Link>
            <Link className="btn btn--outline magnetic" href="/recruit/">採用情報</Link>
          </div>
        </div>
        <div className="kv__bar">
          <Link className="kv__news" href="/news/company-established/">
            <span className="kv__news-label">News</span>
            <time dateTime="2026-02-05">2026.02.05</time>
            <span className="kv__news-title">株式会社エモリスリンクを設立しました。</span>
            <Arrow />
          </Link>
          <a className="kv__scroll" href="#concept">
            <span>Scroll</span>
            <i aria-hidden="true" />
          </a>
        </div>
      </section>
      <section className="section concept" id="concept" aria-labelledby="concept-title">
        <div className="container">
          <div className="sec-head sec-head--center">
            <p className="sec-head__en" aria-hidden="true">Concept</p>
            <h2 className="sec-head__title split" id="concept-title">社名に込めた、3つの想い。</h2>
            <p className="sec-head__lead fade">
              株式会社エモリスリンクは、人材サービスとITサービスを通じて、
              <br className="pc-only" />
              人と企業をつなぐ架け橋となることを目指しています。
            </p>
          </div>
          <div className="equation">
            <div className="equation__line" aria-hidden="true">
              <span className="equation__pulse" />
              <span className="equation__pulse" />
              <span className="equation__pulse" />
            </div>
            <article className="word-card tilt" style={{ "--c1": "#ff6fb1", "--c2": "#ffb36b", "--n": "0" } as CSSProperties}>
              <span className="word-card__letter" aria-hidden="true">E</span>
              <h3 className="word-card__title">
                Empathy
                <small>思いやり・共感</small>
              </h3>
              <p>
                人や企業の想いに寄り添う。
                <br />
                すべては相手を想うことから始まります。
              </p>
            </article>
            <span className="equation__op" style={{ "--n": "0" } as CSSProperties} aria-hidden="true">
              <i />
            </span>
            <article className="word-card tilt" style={{ "--c1": "#8fd65a", "--c2": "#3aafb9", "--n": "1" } as CSSProperties}>
              <span className="word-card__letter" aria-hidden="true">N</span>
              <h3 className="word-card__title">
                Nourish
                <small>育む</small>
              </h3>
              <p>
                一人ひとりの可能性を育み、
                <br />
                価値へと変えていきます。
              </p>
            </article>
            <span className="equation__op" style={{ "--n": "1" } as CSSProperties} aria-hidden="true">
              <i />
            </span>
            <article className="word-card tilt" style={{ "--c1": "#1fa0d8", "--c2": "#004968", "--n": "2" } as CSSProperties}>
              <span className="word-card__letter" aria-hidden="true">L</span>
              <h3 className="word-card__title">
                Link
                <small>つなぐ</small>
              </h3>
              <p>
                人と企業、想いと価値、
                <br />
                現在と未来をつなぐ存在に。
              </p>
            </article>
          </div>
          <p className="equation__result">
            <span className="equation__eq" aria-hidden="true">
              <i />
              <i />
            </span>
            <strong className="equation__word" data-text="EMORIS LINK">EMORIS LINK</strong>
          </p>
        </div>
      </section>
      <section className="section map" aria-labelledby="map-title">
        <div className="map__inner">
          <div className="map__side">
            <p className="sec-head__en" aria-hidden="true">Link Map</p>
            <h2 className="sec-head__title split" id="map-title">
              札幌・大通から、
              <br />
              人と企業をつなぐ。
            </h2>
            <p className="fade">
              本社を起点に、人材とITの7つの領域へ。
              <br />
              ピンや一覧を選ぶと、それぞれの事業をご覧いただけます。
            </p>
            <ol className="map__list">
              <MapList />
            </ol>
          </div>
          <div className="map__stage">
            <div className="map__canvas fade">
              <IsoMap />
              <div className="map__pins">
                <MapPins />
              </div>
            </div>
            <div className="map-card" id="map-card" aria-live="polite">
              <span className="map-card__no" />
              <p className="map-card__en" />
              <h3 className="map-card__title" />
              <p className="map-card__text" />
              <a className="map-card__link" href="#">
                <span />
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="svc" id="service" aria-labelledby="service-title">
        <div className="svc__head">
          <div>
            <p className="sec-head__en sec-head__en--light" aria-hidden="true">Service</p>
            <h2 className="sec-head__title split" id="service-title">
              人と企業をつなぎ、
              <br />
              価値と成長を生み出す。
            </h2>
          </div>
          <div className="svc__ctrl">
            <p className="svc__count" aria-hidden="true">
              <span className="svc__now">01</span>
              <span className="svc__total">/ 04</span>
            </p>
            <button className="car-btn car-btn--prev" type="button" aria-label="前のサービスへ" aria-controls="svc-track">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="car-btn car-btn--next" type="button" aria-label="次のサービスへ" aria-controls="svc-track">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="carousel" role="region" aria-roledescription="カルーセル" aria-label="主なサービス">
          <p className="visually-hidden carousel__status" aria-live="polite" />
          <div className="carousel__viewport">
            <div className="carousel__track" id="svc-track">
              <Link className="svc-panel" href="/service/staffing/">
                <div className="svc-panel__img">
                  <img src="/assets/img/hero-staffing.jpg" alt="" loading="lazy" />
                </div>
                <div className="svc-panel__body">
                  <span className="svc-panel__num">01</span>
                  {" "}
                  <span className="svc-panel__en">Staffing</span>
                  <h3 className="svc-panel__title">人材派遣</h3>
                  <p className="svc-panel__catch">即戦力を、必要なときに。</p>
                  <p className="svc-panel__text">企業の状況やフェーズに合わせて、即戦力人材を柔軟にご提供。現場の生産性向上と安定運営を支援します。</p>
                  <span className="svc-panel__more">
                    詳しく見る
                    <Arrow />
                  </span>
                </div>
              </Link>
              <Link className="svc-panel" href="/service/recruitment/">
                <div className="svc-panel__img">
                  <img src="/assets/img/service-recruitment.jpg" alt="" loading="lazy" />
                </div>
                <div className="svc-panel__body">
                  <span className="svc-panel__num">02</span>
                  {" "}
                  <span className="svc-panel__en">Recruitment</span>
                  <h3 className="svc-panel__title">人材紹介</h3>
                  <p className="svc-panel__catch">未来を創る出会いを。</p>
                  <p className="svc-panel__text">スキルだけでなく、企業文化や成長ビジョンとの適合性まで見極めた人材をご紹介します。</p>
                  <span className="svc-panel__more">
                    詳しく見る
                    <Arrow />
                  </span>
                </div>
              </Link>
              <Link className="svc-panel" href="/service/ses/">
                <div className="svc-panel__img">
                  <img src="/assets/img/service-ses.jpg" alt="" loading="lazy" />
                </div>
                <div className="svc-panel__body">
                  <span className="svc-panel__num">03</span>
                  {" "}
                  <span className="svc-panel__en">System Engineering</span>
                  <h3 className="svc-panel__title">システムエンジニアリング</h3>
                  <p className="svc-panel__catch">技術力を、必要な現場へ。</p>
                  <p className="svc-panel__text">経験豊富なエンジニアがプロジェクトに参画し、開発・運用・改善までをサポートします。</p>
                  <span className="svc-panel__more">
                    詳しく見る
                    <Arrow />
                  </span>
                </div>
              </Link>
              <Link className="svc-panel" href="/service/system-development/">
                <div className="svc-panel__img">
                  <img src="/assets/img/service-dev.jpg" alt="" loading="lazy" />
                </div>
                <div className="svc-panel__body">
                  <span className="svc-panel__num">04</span>
                  {" "}
                  <span className="svc-panel__en">System Development</span>
                  <h3 className="svc-panel__title">システム開発</h3>
                  <p className="svc-panel__catch">構想を、確かな仕組みに。</p>
                  <p className="svc-panel__text">企画・設計から開発・運用まで一貫対応。拡張性と実用性を兼ね備えたシステムで成長を支えます。</p>
                  <span className="svc-panel__more">
                    詳しく見る
                    <Arrow />
                  </span>
                </div>
              </Link>
            </div>
          </div>
          <div className="carousel__foot">
            <div className="carousel__progress" aria-hidden="true">
              <span className="carousel__fill" />
              <span className="carousel__timer" />
            </div>
            <ol className="carousel__dots">
              <li>
                <button type="button" data-go="0">人材派遣</button>
              </li>
              <li>
                <button type="button" data-go="1">人材紹介</button>
              </li>
              <li>
                <button type="button" data-go="2">システムエンジニアリング</button>
              </li>
              <li>
                <button type="button" data-go="3">システム開発</button>
              </li>
            </ol>
          </div>
        </div>
        <div className="svc-more">
          <p className="svc-more__title">その他のサービス</p>
          <ul className="chips">
            <li>
              <Link href="/service/temp-to-perm/">紹介予定派遣</Link>
            </li>
            <li>
              <Link href="/service/outsourcing/">業務委託</Link>
            </li>
            <li>
              <Link href="/service/web-design/">WEBデザイン</Link>
            </li>
            <li>
              <Link href="/service/web-marketing/">WEBマーケティング</Link>
            </li>
          </ul>
          <Link className="btn btn--white magnetic" href="/service/">サービス一覧へ</Link>
        </div>
      </section>
      <section className="section corp" aria-labelledby="corp-title">
        <div className="container">
          <div className="corp__panel">
            <div className="corp__head">
              <div>
                <p className="sec-head__en sec-head__en--light" aria-hidden="true">Company</p>
                <h2 className="sec-head__title split" id="corp-title">
                  確かな基盤で、
                  <br />
                  長く続く信頼を。
                </h2>
              </div>
              <div className="corp__lead fade">
                <p>
                  エモリスリンクは、メイホーグループの経営基盤を活かしながら、札幌に本社を置く地域密着型企業として、迅速で柔軟な意思決定を実現しています。
                </p>
                <Link className="text-arrow text-arrow--light" href="/company/about/">
                  会社概要を見る
                  <Arrow />
                </Link>
              </div>
            </div>
            <ul className="facts" data-count-group>
              <li className="fact fade">
                <i className="bi bi-calendar2-check" aria-hidden="true" />
                <span className="fact__label">設立</span>
                <span className="fact__value">
                  <b data-count="2026">2026</b>
                  年2月
                </span>
              </li>
              <li className="fact fade">
                <i className="bi bi-bank" aria-hidden="true" />
                <span className="fact__label">資本金</span>
                <span className="fact__value">
                  <b data-count="3000">3,000</b>
                  万円
                </span>
              </li>
              <li className="fact fade">
                <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
                <span className="fact__label">サービス領域</span>
                <span className="fact__value">
                  <b data-count="8">8</b>
                  領域
                </span>
              </li>
              <li className="fact fade">
                <i className="bi bi-diagram-3" aria-hidden="true" />
                <span className="fact__label">メイホーグループ</span>
                <span className="fact__value">
                  <b data-count="24">24</b>
                  社
                </span>
                <small>※グループ概要に掲載の企業数</small>
              </li>
            </ul>
            <div className="licenses">
              <div className="license fade">
                <span className="license__icon">
                  <i className="bi bi-shield-check" aria-hidden="true" />
                </span>
                <div>
                  <p className="license__name">労働者派遣事業許可</p>
                  <p className="license__no">派01-301612</p>
                </div>
              </div>
              <div className="license fade">
                <span className="license__icon">
                  <i className="bi bi-shield-check" aria-hidden="true" />
                </span>
                <div>
                  <p className="license__name">有料職業紹介事業許可</p>
                  <p className="license__no">01-ユ-300946</p>
                </div>
              </div>
              <Link className="license license--group fade" href="/company/group-overview/">
                <img src="/assets/img/logo-meihogroup.png" alt="メイホーグループ" loading="lazy" />
                <span>
                  グループ概要を見る
                  <Arrow />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section message-sec" aria-labelledby="message-title">
        <div className="container message-sec__grid">
          {/* 写真：assets/img/message.jpg（同じ名前で上書きすれば差し替わる。推奨 1200×1500px／4:5 縦長） */}
          <figure className="message-sec__visual">
            <span className="message-sec__frame" aria-hidden="true" />
            <div className="message-sec__photo">
              <img src="/assets/img/message.jpg" alt="" width={1200} height={1500} loading="lazy" />
            </div>
          </figure>
          <div>
            <p className="sec-head__en" aria-hidden="true">Message</p>
            <p className="message-sec__mission fade">Mission</p>
            <h2 className="message-sec__quote split" id="message-title">
              人と企業をつなぎ、
              <br />
              関わるすべての人の
              <br />
              幸せを追求する。
            </h2>
            <p className="fade">
              人と企業をつなぐ仕事には、人の人生や企業の未来を変える力がある。だからこそ私たちは、単に仕事を紹介するだけの会社ではなく、人の可能性を広げ、企業の成長を支え、社会へ価値を生み出す存在でありたいと考えています。
            </p>
            <p className="message-sec__sign fade">
              代表取締役社長
              <strong>真浦 健人</strong>
            </p>
            <Link className="btn magnetic fade" href="/company/message/">代表メッセージを読む</Link>
          </div>
        </div>
      </section>
      {/* Recruit の画像は public/assets/img/top-recruit/ に置いています（現在は仮画像）。
  同じファイル名で上書きすれば差し替わります。推奨サイズ：
    main.jpg              … 1600×1200px（4:3 横長）チームや職場の様子
    job-engineer.jpg      … 1600×900px （16:9 横長）システムエンジニアの仕事風景（文字は写真の下に置くので構図は自由。人物は中央付近だとスマホの 3:2 でも切れにくい）
    job-coordinator.jpg   … 1600×900px （16:9 横長）コーディネーターの仕事風景（文字は写真の下に置くので構図は自由。人物は中央付近だとスマホの 3:2 でも切れにくい）
    life-1.jpg〜life-6.jpg …  600×800px （3:4 縦長）オフィス・社員・働く様子 */}
      <section className="section recruit-top" aria-labelledby="recruit-title">
        <div className="container">
          <div className="recruit-top__head">
            <div className="recruit-top__text">
              <p className="sec-head__en" aria-hidden="true">Recruit</p>
              <h2 className="sec-head__title split" id="recruit-title">未来をつなぐ仕事を。</h2>
              <p className="fade">
                決まりきったレールより、まだ形のない地図のほうが面白い。
                <br />
                正解をなぞるのではなく、自分たちで正解をつくっていく。
                <br />
                そんな挑戦を、一緒に楽しめる仲間を探しています。
              </p>
              <Link className="btn magnetic fade" href="/recruit/">採用情報を見る</Link>
            </div>
            <figure className="recruit-top__visual">
              <div className="recruit-top__photo fade">
                <img src="/assets/img/top-recruit/main.jpg" alt="" width={1600} height={1200} loading="lazy" />
              </div>
              <div className="recruit-top__badge" aria-hidden="true">
                <svg viewBox="0 0 200 200">
                  <defs>
                    <path id="hiring-circle" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
                  </defs>
                  <text>
                    <textPath href="#hiring-circle" textLength="474" lengthAdjust="spacing">WE&apos;RE HIRING ・ JOIN EMORISLINK ・</textPath>
                  </text>
                </svg>
                <img src="/assets/img/logo-mark.png" alt="" />
              </div>
            </figure>
          </div>
          <div className="job-row">
            <Link className="job-item tilt fade" href="/system-engineer/">
              {/* 写真は一旦なし（戻すときはこのコメントを外す）<div class="job-item__photo"><img src="{{root}}assets/img/top-recruit/job-engineer.jpg" alt="" width="1600" height="900" loading="lazy"></div> */}
              <div className="job-item__head">
                <span className="job-item__tag">IT Solution</span>
                <h3 className="job-item__title">システムエンジニア</h3>
              </div>
              <div className="job-item__body">
                <dl className="job-item__facts">
                  <div>
                    <dt>月給</dt>
                    <dd>
                      35〜55
                      <small>万円</small>
                    </dd>
                  </div>
                  <div>
                    <dt>月平均残業</dt>
                    <dd>
                      5
                      <small>h以内</small>
                    </dd>
                  </div>
                  <div>
                    <dt>年間休日</dt>
                    <dd>
                      125
                      <small>日</small>
                    </dd>
                  </div>
                </dl>
                <ul className="job-item__tags">
                  <li>案件選択 自由</li>
                  <li>フルリモート相談可</li>
                  <li>前給保証制度</li>
                </ul>
              </div>
              <span className="job-item__more">
                募集要項を見る
                <Arrow />
              </span>
            </Link>
            <Link className="job-item tilt fade" href="/coordinator/">
              {/* 写真は一旦なし（戻すときはこのコメントを外す）<div class="job-item__photo"><img src="{{root}}assets/img/top-recruit/job-coordinator.jpg" alt="" width="1600" height="900" loading="lazy"></div> */}
              <div className="job-item__head">
                <span className="job-item__tag">Business Solution</span>
                <h3 className="job-item__title">人材コーディネーター</h3>
              </div>
              <div className="job-item__body">
                <dl className="job-item__facts">
                  <div>
                    <dt>月給</dt>
                    <dd>
                      23〜30
                      <small>万円</small>
                    </dd>
                  </div>
                  <div>
                    <dt>月平均残業</dt>
                    <dd>
                      20
                      <small>h以下</small>
                    </dd>
                  </div>
                  <div>
                    <dt>年間休日</dt>
                    <dd>
                      125
                      <small>日</small>
                    </dd>
                  </div>
                </dl>
                <ul className="job-item__tags">
                  <li>未経験OK</li>
                  <li>土日祝休み</li>
                  <li>転勤なし</li>
                </ul>
              </div>
              <span className="job-item__more">
                募集要項を見る
                <Arrow />
              </span>
            </Link>
          </div>
        </div>
        <div className="life-strip" aria-hidden="true">
          <div className="life-strip__track">
            <img src="/assets/img/top-recruit/life-1.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-2.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-3.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-4.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-5.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-6.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-1.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-2.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-3.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-4.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-5.jpg" alt="" width={600} height={800} loading="lazy" />
            <img src="/assets/img/top-recruit/life-6.jpg" alt="" width={600} height={800} loading="lazy" />
          </div>
        </div>
      </section>
      <section className="section news-sec" aria-labelledby="news-title">
        <div className="container news-sec__grid">
          <div>
            <p className="sec-head__en" aria-hidden="true">News</p>
            <h2 className="sec-head__title" id="news-title">お知らせ</h2>
            <Link className="text-arrow" href="/news/">
              お知らせ一覧
              <Arrow />
            </Link>
          </div>
          <ul className="news-list fade">
            <li>
              <Link href="/news/company-established/">
                <time dateTime="2026-02-05">2026.02.05</time>
                <span className="news-list__cat">お知らせ</span>
                <span className="title">株式会社エモリスリンクを設立しました。</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
