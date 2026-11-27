"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LP_SE_APPLY } from "@/lib/lp";

// システムエンジニアの広告用ページ（LP）の、画面で操作する部品（モヤモヤのチェック・給与のチェック）

const WORRIES = [
  "案件は会社が決める。やりたい技術に関われない",
  "スキルや単価が上がっても、給与はほとんど変わらない",
  "評価の基準が見えず、何を頑張れば上がるのか分からない",
  "残業が多く、勉強や家族との時間が取れない",
  "テストや運用ばかりで、上流工程に進めない",
  "転職したいけど、給与が下がるのが怖い",
];

// こんなモヤモヤ、ありませんか？（押すとチェックが付く。1つでも付くと、次への一言が出る）
export function Worries() {
  const [checked, setChecked] = useState<boolean[]>(() => WORRIES.map(() => false));
  const n = checked.filter(Boolean).length;
  return (
    <div className="lpse-worry">
      <ul className="lpse-worry__list">
        {WORRIES.map((w, i) => (
          <li key={w} className="fade" style={{ ["--d" as string]: `${i * 0.06}s` }}>
            <button type="button" className={`lpse-worry__item${checked[i] ? " is-on" : ""}`} aria-pressed={checked[i]} onClick={() => setChecked((cur) => cur.map((c, k) => (k === i ? !c : c)))}>
              <span className="lpse-worry__box" aria-hidden="true">
                <i className="bi bi-check-lg" />
              </span>
              {w}
            </button>
          </li>
        ))}
      </ul>
      <p className="lpse-worry__hint" aria-live="polite">
        {n === 0 ? (
          <>当てはまるものを押してみてください</>
        ) : (
          <>
            <strong>{n}つ</strong>当てはまりました。<span>そのモヤモヤ、あなたの実力不足ではないかもしれません。</span>
          </>
        )}
      </p>
    </div>
  );
}

// 経験に応じた月給の下限（求人の条件どおり。5年以下：35万円〜、5年以上：40万円〜、高スキル：50万円〜。上限 55万円）
const LEVELS = [
  { key: "junior", label: "実務経験 5年以下", base: 35 },
  { key: "middle", label: "実務経験 5年以上", base: 40 },
  { key: "senior", label: "高スキル・シニア", base: 50 },
] as const;

// 数字をなめらかに動かす
function useTween(target: number, ms = 600) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (target - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// あなたの市場価値をチェック（経験と今の月給から、当社での月給の目安と、年収の差を出す）
export function SalaryCheck() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]["key"]>("junior");
  const [now, setNow] = useState(28);
  const base = LEVELS.find((l) => l.key === level)!.base;
  const diff = Math.max(0, (base - now) * 12);
  const shownBase = useTween(base);
  const shownDiff = useTween(diff);
  return (
    <div className="lpse-check">
      <div className="lpse-check__form">
        <fieldset>
          <legend>
            <span className="lpse-check__step">1</span>エンジニアとしての経験は？
          </legend>
          <div className="lpse-check__levels">
            {LEVELS.map((l) => (
              <label key={l.key} className={level === l.key ? "is-on" : undefined}>
                <input type="radio" name="lpse-level" value={l.key} checked={level === l.key} onChange={() => setLevel(l.key)} />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <span className="lpse-check__step">2</span>いまの月給（額面）は？
          </legend>
          <div className="lpse-check__range">
            <input type="range" min={18} max={55} step={1} value={now} onChange={(e) => setNow(Number(e.target.value))} aria-label="いまの月給（万円）" style={{ ["--p" as string]: `${((now - 18) / (55 - 18)) * 100}%` }} />
            <output>
              <b>{now}</b>万円
            </output>
          </div>
        </fieldset>
      </div>
      <div className="lpse-check__result" aria-live="polite">
        <p className="lpse-check__label">エモリスリンクでの月給の目安</p>
        <p className="lpse-check__big">
          <b>{shownBase}</b>万円〜<small>（上限 55万円）</small>
        </p>
        {diff > 0 ? (
          <p className="lpse-check__up">
            <i className="bi bi-graph-up-arrow" aria-hidden="true" />
            年収で <b>+{shownDiff}</b>万円〜 の可能性
          </p>
        ) : (
          <p className="lpse-check__up is-keep">
            <i className="bi bi-shield-check" aria-hidden="true" />
            <span>
              <b>前給保証制度</b>で、今の給与を下回りません
            </span>
          </p>
        )}
        <p className="lpse-check__note">※ 目安です。給与は経験・スキルをもとに面接で決めます（固定残業30時間分を含み、超過分は別途支給）。</p>
        <Link className="lpse-btn lpse-btn--sm" href={LP_SE_APPLY}>
          この条件で話を聞いてみる
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
