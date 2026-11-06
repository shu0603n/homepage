"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatRecruitSalary, formatSalary } from "@/components/jobs/format";
import type { JobCard, JobsData, RecruitCard } from "@/lib/jobs";

// 案件一覧の検索・絞り込み・ページ送り（next-app の customer-project-list と同じ条件）

const PER_PAGE = 10;
const PAYMENT_OPTIONS = ["～1300円", "1300円～1500円", "1500円～"];
const QUICK_TAGS = ["未経験者歓迎", "シフト自由", "週2・3日からOK", "扶養内勤務OK", "社会保険完備"];
const EMPLOYMENT_TYPES = ["正社員", "派遣"] as const;
type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
const CONTRACT_NAMES: Record<EmploymentType, string[]> = { 正社員: ["正社員", "紹介"], 派遣: ["派遣", "紹介予定派遣"] };

type Item = JobCard | RecruitCard;

function matchesPayment(salary: number | null, option: string): boolean {
  if (!salary) return false;
  if (option === PAYMENT_OPTIONS[0]) return salary < 1300;
  if (option === PAYMENT_OPTIONS[1]) return salary >= 1300 && salary < 1500;
  return salary >= 1500;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chips({ label, options, selected, onToggle }: { label: string; options: readonly string[]; selected: readonly string[]; onToggle: (v: string) => void }) {
  return (
    <div className="jobs-filter__group">
      <span className="jobs-filter__label">{label}</span>
      <div className="jobs-filter__chips">
        {options.map((o) => (
          <button key={o} type="button" className={`chip${selected.includes(o) ? " is-on" : ""}`} aria-pressed={selected.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ item }: { item: Item }) {
  const isJob = item.kind === "project";
  const href = isJob ? `/jobs/${item.id}/` : `/jobs/recruit/${item.id}/`;
  const title = isJob ? item.title : item.title;
  const badge = isJob ? (item.status === "終了間近" ? "終了間近" : item.isNew ? "新着" : "募集中") : "人材紹介";
  const salary = isJob ? formatSalary(item) : formatRecruitSalary(item);
  const desc = (item.description ?? "").replace(/\s+/g, " ").slice(0, 120);
  const tags = item.tags.slice(0, 3);
  return (
    <Link className="job-card" href={href}>
      <div className="job-card__body">
        <p className="job-card__badges">
          <span className={`badge badge--${badge === "終了間近" ? "warn" : badge === "新着" ? "new" : "ok"}`}>{badge}</span>
          {item.priority && <span className="badge badge--pick">PICKUP!</span>}
        </p>
        <h3 className="job-card__title">{title}</h3>
        <p className="job-card__tags">
          {isJob && item.contractName && <span className="tag tag--main">{item.contractName}</span>}
          {tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </p>
        {isJob && item.location && <p className="job-card__meta">📍 {item.location}</p>}
        {!isJob && item.clientName && <p className="job-card__meta">🏢 {item.clientName}</p>}
        {salary && <p className="job-card__salary">💴 {salary}</p>}
        {isJob && item.transportation && <p className="job-card__meta">交通費 {item.transportation}</p>}
        {desc && <p className="job-card__desc">{desc}</p>}
      </div>
      <div className="job-card__img" aria-hidden="true">
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="job-card__noimg" />}
      </div>
    </Link>
  );
}

export function JobsExplorer({ data }: { data: JobsData }) {
  const [keyword, setKeyword] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [payments, setPayments] = useState<string[]>([]);
  const [types, setTypes] = useState<EmploymentType[]>([...EMPLOYMENT_TYPES]);
  const [page, setPage] = useState(1);

  const items = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const jobs = data.jobs.filter((j) => {
      if (k && ![j.title, j.location, j.description].some((s) => s?.toLowerCase().includes(k))) return false;
      if (tags.length && !tags.every((t) => j.tags.includes(t))) return false;
      if (periods.length && !(j.periodName && periods.includes(j.periodName))) return false;
      if (payments.length && !payments.some((p) => matchesPayment(j.salary, p))) return false;
      if (types.length < EMPLOYMENT_TYPES.length && !types.some((t) => CONTRACT_NAMES[t].includes(j.contractName ?? ""))) return false;
      return true;
    });
    // 人材紹介の案件は雇用形態・期間・時給の情報を持たないため、キーワードとタグだけで絞り込む
    const recruits = data.recruits.filter((r) => {
      if (k && !(r.title.toLowerCase().includes(k) || r.description?.toLowerCase().includes(k) || r.tags.some((t) => t.toLowerCase().includes(k)))) return false;
      return tags.every((t) => r.tags.includes(t));
    });
    const all: Item[] = [...jobs, ...recruits];
    return [...all.filter((i) => i.priority), ...all.filter((i) => !i.priority)];
  }, [data, keyword, tags, periods, payments, types]);

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const shown = items.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const filtered = tags.length > 0 || periods.length > 0 || payments.length > 0 || types.length < EMPLOYMENT_TYPES.length || keyword.trim() !== "";

  const change = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="jobs">
      <div className="jobs-filter">
        <label className="jobs-filter__search">
          <span className="visually-hidden">キーワード</span>
          <input type="search" placeholder="キーワード（職種・勤務地・業務内容など）" value={keyword} onChange={(e) => change(setKeyword)(e.target.value)} />
        </label>
        <Chips label="雇用形態" options={EMPLOYMENT_TYPES} selected={types} onToggle={(v) => change(setTypes)(toggle(types, v as EmploymentType))} />
        <Chips label="タグ" options={QUICK_TAGS} selected={tags} onToggle={(v) => change(setTags)(toggle(tags, v))} />
        {data.periods.length > 0 && <Chips label="期間" options={data.periods} selected={periods} onToggle={(v) => change(setPeriods)(toggle(periods, v))} />}
        <Chips label="時給" options={PAYMENT_OPTIONS} selected={payments} onToggle={(v) => change(setPayments)(toggle(payments, v))} />
        {filtered && (
          <button
            type="button"
            className="auth-links__btn"
            onClick={() => {
              setKeyword("");
              setTags([]);
              setPeriods([]);
              setPayments([]);
              setTypes([...EMPLOYMENT_TYPES]);
              setPage(1);
            }}
          >
            絞り込みをクリア
          </button>
        )}
      </div>

      <p className="jobs__count" role="status">
        {items.length} 件の求人
      </p>
      {shown.length === 0 ? (
        <p className="jobs__empty">条件に一致する求人が見つかりませんでした。</p>
      ) : (
        <div className="jobs__list">
          {shown.map((item) => (
            <Card key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pager" aria-label="ページ送り">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>
            ← 前へ
          </button>
          <span>
            {current} / {totalPages}
          </span>
          <button type="button" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
            次へ →
          </button>
        </nav>
      )}
    </div>
  );
}
