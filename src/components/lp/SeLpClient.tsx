"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LP_SE_APPLY } from "@/lib/lp";

// システムエンジニアの広告用ページ（LP）の、画面で操作する部品（モヤモヤのチェック・給与のチェック）

// モヤモヤと、エモリスリンクでの答え（答えはこのページで示している制度・実績・社員の声の範囲だけ。数字を作らない）
const WORRIES: { worry: string; answer: React.ReactNode; tag: string; icon: string }[] = [
  { worry: "案件は会社が決める。やりたい技術に関われない", tag: "案件自由選択制", icon: "bi-hand-index-thumb", answer: <>案件は<strong>自分で選べます</strong>。会社都合のアサインはありません</> },
  { worry: "スキルや単価が上がっても、給与はほとんど変わらない", tag: "高い還元率", icon: "bi-graph-up-arrow", answer: <>スキルを<strong>きちんと給与に還元</strong>。初年度 年収<strong>最大80万円UP</strong>の実績も</> },
  { worry: "評価の基準が見えず、何を頑張れば上がるのか分からない", tag: "キャリア相談", icon: "bi-chat-heart", answer: <>気軽に相談でき、<strong>改善点や今後の方向性</strong>を一緒に考えます</> },
  { worry: "残業が多く、勉強や家族との時間が取れない", tag: "残業 月平均5時間以内", icon: "bi-house-heart", answer: <>月平均残業<strong>5時間以内</strong>。勉強や家族との時間も取れます<small>（常駐先により異なります）</small></> },
  { worry: "テストや運用ばかりで、上流工程に進めない", tag: "上流工程に挑戦", icon: "bi-diagram-3", answer: <>案件を選べるから、<strong>上流工程</strong>にも挑戦できます</> },
  { worry: "転職したいけど、給与が下がるのが怖い", tag: "前給保証制度", icon: "bi-shield-check", answer: <><strong>前給保証制度</strong>で、転職前の給与を下回りません</> },
];

// こんなモヤモヤ、ありませんか？（押すとチェックが付く。チェックしたモヤモヤごとに、エモリスリンクでの答えが出る）
export function Worries() {
  const [checked, setChecked] = useState<boolean[]>(() => WORRIES.map(() => false));
  const picked = WORRIES.filter((_, i) => checked[i]);
  const pickedKey = picked.map((w) => w.worry).join("|");
  useEffect(() => {
    if (pickedKey) saveLp({ worries: pickedKey.split("|") });
    else saveLp({ worries: [] });
  }, [pickedKey]);
  const n = picked.length;
  return (
    <div className="lpse-worry">
      <ul className="lpse-worry__list">
        {WORRIES.map((w, i) => (
          <li key={w.worry} className="fade" style={{ ["--d" as string]: `${i * 0.06}s` }}>
            <button type="button" className={`lpse-worry__item${checked[i] ? " is-on" : ""}`} aria-pressed={checked[i]} onClick={() => setChecked((cur) => cur.map((c, k) => (k === i ? !c : c)))}>
              <span className="lpse-worry__box" aria-hidden="true">
                <i className="bi bi-check-lg" />
              </span>
              {w.worry}
            </button>
          </li>
        ))}
      </ul>
      <div className="lpse-worry__result" aria-live="polite">
        {n === 0 ? (
          <p className="lpse-worry__hint">
            <i className="bi bi-hand-index" aria-hidden="true" /> 当てはまるものを押してみてください
          </p>
        ) : (
          <div className="lpse-worry__card" >
            <p className="lpse-worry__count">
              <strong>{n}つ</strong>当てはまりました
            </p>
            <p className="lpse-worry__lead">
              あなた自身の問題ではなく、
              <br />
              <mark>会社の仕組み</mark>のせいかもしれません。
            </p>
            <p className="lpse-worry__sub">
              エモリスリンクなら、チェックした<strong>{n}つ</strong>のモヤモヤにこう応えます
            </p>
            <ul className="lpse-worry__answers">
              {picked.map((w) => (
                <li key={w.worry}>
                  <span className="lpse-worry__icon" aria-hidden="true">
                    <i className={`bi ${w.icon}`} />
                  </span>
                  <span>
                    <span className="lpse-worry__tag">{w.tag}</span>
                    <span className="lpse-worry__answer">{w.answer}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link className="lpse-btn lpse-btn--sm" href={LP_SE_APPLY}>
              このモヤモヤを相談してみる
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- LP で入力した内容を、応募フォームの「お問い合わせ」へ引き継ぐ（同じタブの sessionStorage。lib/behavior.ts が読む） ----------
const LP_KEY = "lpse-answers";
function saveLp(part: Record<string, unknown>) {
  try {
    const cur = JSON.parse(sessionStorage.getItem(LP_KEY) || "{}");
    sessionStorage.setItem(LP_KEY, JSON.stringify({ ...cur, ...part }));
  } catch {
    // 保存できない環境（プライベートモードなど）では引き継がない
  }
}

const AGES = ["20代前半", "20代後半", "30代前半", "30代後半", "40代", "50代以上"] as const;
const YEARS = [
  { key: "~3", label: "3年未満", min: 0 },
  { key: "3-5", label: "3〜5年", min: 3 },
  { key: "5-10", label: "5〜10年", min: 5 },
  { key: "10~", label: "10年以上", min: 10 },
] as const;
const PHASES = ["要件定義", "基本設計", "詳細設計", "製造（実装）", "テスト", "運用・保守", "PM・PL"] as const;
const UPSTREAM = new Set<string>(["要件定義", "基本設計", "PM・PL"]);
const LANGS = ["Java", "C#", "Python", "PHP", "JavaScript / TypeScript", "Go", "Ruby", "C / C++", "COBOL", "Kotlin / Swift", "SQL", "その他"] as const;

// 月給の下限の目安（求人の条件どおり。5年未満：35万円〜、5年以上：40万円〜、高スキル：50万円〜。上限 55万円）
// 高スキルの目安は「10年以上」かつ「上流工程（要件定義・基本設計）か PM・PL の経験あり」。実際の給与は面接で決める
function estimate(years: number, phases: string[]) {
  if (years >= 10 && phases.some((p) => UPSTREAM.has(p))) return { base: 50, rank: "高スキル・シニアクラス" };
  if (years >= 5) return { base: 40, rank: "実務経験 5年以上" };
  return { base: 35, rank: "実務経験 5年未満" };
}

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

// あなたの市場価値をチェック（年齢・経験・工程・言語・今の月給から、当社での月給の目安と年収の差を出す）
export function SalaryCheck() {
  const [age, setAge] = useState<string | null>(null);
  const [years, setYears] = useState<(typeof YEARS)[number]["key"]>("3-5");
  const [phases, setPhases] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [now, setNow] = useState(28);
  const [touched, setTouched] = useState(false);
  const y = YEARS.find((v) => v.key === years)!;
  const { base, rank } = estimate(y.min, phases);
  const diff = Math.max(0, (base - now) * 12);
  const shownBase = useTween(base);
  const shownDiff = useTween(diff);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  // 触ったあとは、入力のたびに引き継ぎ用に保存する
  useEffect(() => {
    if (touched) saveLp({ check: { age, years: y.label, phases, langs, now, base } });
  }, [touched, age, y.label, phases, langs, now, base]);
  const touch = <T,>(fn: (v: T) => void) => (v: T) => {
    setTouched(true);
    fn(v);
  };
  return (
    <div className="lpse-check">
      <div className="lpse-check__form">
        <fieldset>
          <legend>
            <span className="lpse-check__step">1</span>年齢は？
          </legend>
          <div className="lpse-check__chips">
            {AGES.map((v) => (
              <label key={v} className={age === v ? "is-on" : undefined}>
                <input type="radio" name="lpse-age" value={v} checked={age === v} onChange={() => touch(setAge)(v)} />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <span className="lpse-check__step">2</span>エンジニアとしての経験年数は？
          </legend>
          <div className="lpse-check__chips">
            {YEARS.map((v) => (
              <label key={v.key} className={years === v.key ? "is-on" : undefined}>
                <input type="radio" name="lpse-years" value={v.key} checked={years === v.key} onChange={() => touch(setYears)(v.key)} />
                {v.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <span className="lpse-check__step">3</span>経験のある工程は？<small>（いくつでも）</small>
          </legend>
          <div className="lpse-check__chips is-multi">
            {PHASES.map((v) => (
              <label key={v} className={phases.includes(v) ? "is-on" : undefined}>
                <input type="checkbox" value={v} checked={phases.includes(v)} onChange={() => touch(setPhases)(toggle(phases, v))} />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <span className="lpse-check__step">4</span>使える言語は？<small>（いくつでも）</small>
          </legend>
          <div className="lpse-check__chips is-multi">
            {LANGS.map((v) => (
              <label key={v} className={langs.includes(v) ? "is-on" : undefined}>
                <input type="checkbox" value={v} checked={langs.includes(v)} onChange={() => touch(setLangs)(toggle(langs, v))} />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <span className="lpse-check__step">5</span>いまの月給（額面）は？
          </legend>
          <div className="lpse-check__range">
            <input type="range" min={18} max={55} step={1} value={now} onChange={(e) => touch(setNow)(Number(e.target.value))} aria-label="いまの月給（万円）" style={{ ["--p" as string]: `${((now - 18) / (55 - 18)) * 100}%` }} />
            <output>
              <b>{now}</b>万円
            </output>
          </div>
        </fieldset>
      </div>
      <div className="lpse-check__result" aria-live="polite">
        <p className="lpse-check__label">エモリスリンクでの月給の目安</p>
        <p className="lpse-check__rank">{rank}</p>
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
        {(phases.length > 0 || langs.length > 0) && (
          <ul className="lpse-check__tags">
            {[...phases, ...langs].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <p className="lpse-check__note">※ 目安です。給与は経験・スキルをもとに面接で決めます（固定残業30時間分を含み、超過分は別途支給）。</p>
        <Link className="lpse-btn lpse-btn--sm" href={LP_SE_APPLY} onClick={() => saveLp({ check: { age, years: y.label, phases, langs, now, base } })}>
          この条件で話を聞いてみる
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </Link>
        <p className="lpse-check__carry">
          <i className="bi bi-magic" aria-hidden="true" /> 入力した内容は、応募フォームに自動で入ります
        </p>
      </div>
    </div>
  );
}
