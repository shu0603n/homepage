"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LP_SE_APPLY, LP_SE_PATH } from "@/lib/lp";
import { EMORIS_AGENT_URL, SHOW_EMORIS_AGENT } from "@/lib/site";

// 右端のタブ（PC）／画面下のバー（スマホ）。PC では1つのタブだけが伸びて文字を見せ、数秒ごとに順番に入れ替わる（lib/behavior.ts）。
// システムエンジニアの広告用ページ（LP）だけは、「エンジニア応募」と「入社祝い金20万円」の2つに固定する
export function Promo() {
  const lp = usePathname() === LP_SE_PATH;
  return (
    <aside className={`promo${lp ? " promo--lp" : ""}`} aria-label={lp ? "応募" : "キャンペーン・お知らせ"}>
      {/* タブ。スマホでは、この中を横にスライドするカルーセルにする（PC では display: contents で無いのと同じ） */}
      <div className="promo__track">
        {lp ? (
          <div className="promo__item promo__item--apply">
            {/* 押すとすぐ応募フォームへ（バナーは開かない） */}
            <Link className="promo__tab" href={LP_SE_APPLY}>
              <span className="promo__tab-label">
                <span className="promo__tab-text">エンジニア応募</span>
              </span>
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="promo__item promo__item--haken">
              <button className="promo__tab" type="button" aria-expanded="false" aria-controls="promo-panel-haken">
                <span className="promo__tab-label">
                  <span className="promo__tab-text">派遣求人を見る</span>
                </span>
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
            </div>
            {/* EMORIS AGENT のリリースまで非表示（lib/site.ts の SHOW_EMORIS_AGENT） */}
            {SHOW_EMORIS_AGENT && (
              <div className="promo__item promo__item--agent">
                <button className="promo__tab" type="button" aria-expanded="false" aria-controls="promo-panel-agent">
                  <span className="promo__tab-label">
                    <span className="promo__tab-text">正社員求人情報</span>
                  </span>
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
        <div className="promo__item promo__item--bonus">
          <button className="promo__tab" type="button" aria-expanded="false" aria-controls="promo-panel-bonus">
            <span className="promo__tab-label">
              <span className="promo__tab-text">
                入社祝い金<b>20</b>万円
              </span>
            </span>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* バナー。タブのカルーセル（横スクロールの枠）の外に置く：iPhone の Safari では、横スクロールの枠の中にある
          全画面表示（position: fixed）の要素が枠で切り取られて見えなくなるため */}
      {!lp && (
        <div className="promo__panel promo__panel--haken" id="promo-panel-haken" hidden>
          <div className="promo__sheet">
            <Link className="promo__banner" href="/jobs/">
              <img src="/assets/img/floating-banner-haken.jpg" alt="あなたに合う派遣求人をチェック 派遣求人を見る 勤務地・職種・条件から探せる 未経験OK・高時給・駅チカ求人 詳細はこちら" width={1200} height={627} />
            </Link>
            <button className="promo__close" type="button" aria-label="派遣求人のバナーを閉じる">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {!lp && SHOW_EMORIS_AGENT && (
        <div className="promo__panel promo__panel--agent" id="promo-panel-agent" hidden>
          <div className="promo__sheet">
            <a className="promo__banner" href={EMORIS_AGENT_URL} target="_blank" rel="noopener">
              <img src="/assets/img/floating-banner-agent.jpg" alt="幅広い業界・職種から、あなたに合う仕事が見つかる。EMORIS AGENT 登録・利用はすべて無料 無料で会員登録する（新しいタブで開きます）" width={800} height={418} />
            </a>
            <button className="promo__close" type="button" aria-label="EMORIS AGENT のバナーを閉じる">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <div className="promo__panel promo__panel--bonus" id="promo-panel-bonus" hidden>
        <div className="promo__sheet">
          {/* LP では、バナーから応募フォームへ直接進む */}
          <Link className="promo__banner" href={lp ? LP_SE_APPLY : "/system-engineer/"}>
            <img src="/assets/img/floating-banner.jpg" alt={`公式HP経由で応募いただいた方限定 入社祝い金20万円 経験者システムエンジニア ${lp ? "応募はこちら" : "詳細・応募はこちら"}`} width={800} height={418} />
          </Link>
          <button className="promo__close" type="button" aria-label="入社祝い金のバナーを閉じる">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
