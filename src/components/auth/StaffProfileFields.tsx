"use client";

import { useState, type ReactNode } from "react";
import type { StaffProfile, WorkHistory } from "@/lib/auth/staff";
import {
  DAYS_OF_WEEK,
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  HISTORY_COUNT_MAP,
  HISTORY_COUNT_OPTIONS,
  JOB_TYPE_OPTIONS,
  MAX_HISTORIES,
  PERIOD_OPTIONS,
  PREFECTURE_OPTIONS,
  WEEKLY_OPTIONS,
  WORK_JOB_TYPE_OPTIONS,
} from "@/lib/staff-options";

const EMPTY_HISTORY: WorkHistory = { company: "", employment_type: "", period: "", job_type: "", content: "" };

export function Row({ label, htmlFor, required, children }: { label: string; htmlFor?: string; required?: boolean; children: ReactNode }) {
  const mark = required && <span className="req">必須</span>;
  return (
    <div className="form__row">
      {htmlFor ? (
        <label className="form__label" htmlFor={htmlFor}>
          {label}
          {mark}
        </label>
      ) : (
        <span className="form__label">
          {label}
          {mark}
        </span>
      )}
      <div>{children}</div>
    </div>
  );
}

function Select({ id, name, options, label, defaultValue }: { id: string; name: string; options: string[]; label: string; defaultValue: string }) {
  // 既に保存されている値が選択肢にない場合も、その値を残して選べるようにする
  const list = defaultValue && !options.includes(defaultValue) ? [defaultValue, ...options] : options;
  return (
    <select id={id} name={name} defaultValue={defaultValue} aria-label={label}>
      <option value="">未選択</option>
      {list.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

type Defaults = Partial<Omit<StaffProfile, "mail">>;

function historyCountLabel(n: number): string {
  if (n <= 0) return "";
  return n >= 3 ? "3社以上" : `${n}社`;
}

// スタッフ登録とマイページの編集で共通の入力項目（基本情報・希望条件・職務履歴）。
// 勤務可能曜日と職歴は、hidden の weekend_holiday（カンマ区切り）と work_histories（JSON）として送信される
export function StaffProfileFields({ defaults = {}, leading, afterKana }: { defaults?: Defaults; leading?: ReactNode; afterKana?: ReactNode }) {
  // 新規登録では「受け付ける」が初期値。編集時は保存されている値を表示する
  const acceptFulltime = defaults.accept_fulltime_job ?? true;
  const [days, setDays] = useState<string[]>(defaults.weekend_days ?? []);
  const [histories, setHistories] = useState<WorkHistory[]>(defaults.work_histories ?? []);
  const [historyCount, setHistoryCount] = useState(historyCountLabel(defaults.work_histories?.length ?? 0));

  const toggleDay = (d: string) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const changeCount = (value: string) => {
    setHistoryCount(value);
    const n = HISTORY_COUNT_MAP[value] ?? 0;
    // 件数を変えても、入力済みの職歴はできるだけ残す
    setHistories((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? { ...EMPTY_HISTORY }));
  };
  const updateHistory = (i: number, field: keyof WorkHistory, value: string) =>
    setHistories((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));

  return (
    <>
      <input type="hidden" name="weekend_holiday" value={days.join(",")} />
      <input type="hidden" name="work_histories" value={JSON.stringify(histories)} />

      <h2 className="form__group">基本情報</h2>
      {leading}
      <Row label="お名前" htmlFor="r-name" required>
        <input id="r-name" type="text" name="name" autoComplete="name" defaultValue={defaults.name} required />
      </Row>
      <Row label="フリガナ" htmlFor="r-name-k">
        <input id="r-name-k" type="text" name="name_k" placeholder="例：ヤマダ タロウ" defaultValue={defaults.name_k} />
      </Row>
      {afterKana}
      <Row label="電話番号" htmlFor="r-tel" required>
        <input id="r-tel" type="tel" name="phone_number" autoComplete="tel" placeholder="例：090-1234-5678" defaultValue={defaults.phone_number} required />
      </Row>
      <Row label="正社員求人の紹介">
        <fieldset className="choices">
          <label>
            <input type="radio" name="accept_fulltime_job" value="yes" defaultChecked={acceptFulltime} />
            受け付ける
          </label>
          <label>
            <input type="radio" name="accept_fulltime_job" value="no" defaultChecked={!acceptFulltime} />
            受け付けない
          </label>
        </fieldset>
      </Row>
      <Row label="性別" htmlFor="r-gender">
        <Select id="r-gender" name="gender" options={GENDER_OPTIONS} label="性別" defaultValue={defaults.gender ?? ""} />
      </Row>
      <Row label="生年月日" htmlFor="r-birthday">
        <input id="r-birthday" type="date" name="birthday" autoComplete="bday" defaultValue={defaults.birthday} />
      </Row>
      <Row label="郵便番号" htmlFor="r-postal">
        <input id="r-postal" type="text" name="postal_code" autoComplete="postal-code" inputMode="numeric" placeholder="例：123-4567" defaultValue={defaults.postal_code} />
      </Row>
      <Row label="都道府県" htmlFor="r-pref">
        <Select id="r-pref" name="prefecture" options={PREFECTURE_OPTIONS} label="都道府県" defaultValue={defaults.prefecture ?? ""} />
      </Row>
      <Row label="住所" htmlFor="r-address">
        <input id="r-address" type="text" name="address" autoComplete="street-address" defaultValue={defaults.address} />
      </Row>

      <h2 className="form__group">希望条件</h2>
      <Row label="最低ご希望時給（円）" htmlFor="r-wage">
        <input id="r-wage" type="number" name="min_hourly_wage" min={0} inputMode="numeric" placeholder="例：1300" defaultValue={defaults.min_hourly_wage} />
      </Row>
      <Row label="勤務可能時間帯" htmlFor="r-slot">
        <input id="r-slot" type="text" name="time_slot" placeholder="例：9〜18" defaultValue={defaults.time_slot} />
      </Row>
      <Row label="勤務可能週日数" htmlFor="r-weekly">
        <Select id="r-weekly" name="weekly_preference" options={WEEKLY_OPTIONS} label="勤務可能週日数" defaultValue={defaults.weekly_preference ?? ""} />
      </Row>
      <Row label="勤務可能曜日">
        <fieldset className="choices">
          {DAYS_OF_WEEK.map((d) => (
            <label key={d}>
              <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} />
              {d}
            </label>
          ))}
        </fieldset>
      </Row>
      <Row label="勤務可能期間" htmlFor="r-period">
        <Select id="r-period" name="period" options={PERIOD_OPTIONS} label="勤務可能期間" defaultValue={defaults.period ?? ""} />
      </Row>
      <Row label="勤務開始希望日" htmlFor="r-start">
        <input id="r-start" type="date" name="desired_start_date" defaultValue={defaults.desired_start_date} />
      </Row>
      <Row label="希望職種" htmlFor="r-job">
        <input id="r-job" type="text" name="desired_job_type" list="r-job-list" defaultValue={defaults.desired_job_type} />
        <datalist id="r-job-list">
          {JOB_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </Row>

      <h2 className="form__group">職務履歴</h2>
      <Row label="職務履歴は何社ございますか？" htmlFor="r-hcount">
        <select id="r-hcount" value={historyCount} onChange={(e) => changeCount(e.target.value)}>
          <option value="">未選択</option>
          {HISTORY_COUNT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Row>
      {histories.map((h, i) => (
        <div className="history-card" key={i}>
          <div className="history-card__head">
            <strong>職歴 {i + 1}</strong>
            <button type="button" className="auth-links__btn" onClick={() => setHistories((prev) => prev.filter((_, idx) => idx !== i))}>
              削除
            </button>
          </div>
          <Row label="会社名" htmlFor={`h-company-${i}`}>
            <input id={`h-company-${i}`} type="text" value={h.company} onChange={(e) => updateHistory(i, "company", e.target.value)} />
          </Row>
          <Row label="雇用形態" htmlFor={`h-type-${i}`}>
            <select id={`h-type-${i}`} value={h.employment_type} onChange={(e) => updateHistory(i, "employment_type", e.target.value)}>
              <option value="">未選択</option>
              {(h.employment_type && !EMPLOYMENT_TYPE_OPTIONS.includes(h.employment_type) ? [h.employment_type, ...EMPLOYMENT_TYPE_OPTIONS] : EMPLOYMENT_TYPE_OPTIONS).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Row>
          <Row label="就業期間" htmlFor={`h-period-${i}`}>
            <input id={`h-period-${i}`} type="text" value={h.period} placeholder="例：2020/01〜2022/03" onChange={(e) => updateHistory(i, "period", e.target.value)} />
          </Row>
          <Row label="職種" htmlFor={`h-job-${i}`}>
            <input id={`h-job-${i}`} type="text" list="h-job-list" value={h.job_type} onChange={(e) => updateHistory(i, "job_type", e.target.value)} />
          </Row>
          <Row label="業務内容" htmlFor={`h-content-${i}`}>
            <textarea id={`h-content-${i}`} rows={3} value={h.content} onChange={(e) => updateHistory(i, "content", e.target.value)} />
          </Row>
        </div>
      ))}
      <datalist id="h-job-list">
        {WORK_JOB_TYPE_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      {historyCount !== "" && historyCount !== "なし" && histories.length < MAX_HISTORIES && (
        <p>
          <button type="button" className="auth-links__btn" onClick={() => setHistories((prev) => [...prev, { ...EMPTY_HISTORY }])}>
            ＋ 職歴を追加
          </button>
        </p>
      )}
    </>
  );
}

// フォームの内容を API に送る形（共通項目）に変換する
export function readProfileFields(fd: FormData) {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  let histories: unknown = [];
  try {
    histories = JSON.parse(String(fd.get("work_histories") ?? "[]"));
  } catch {
    histories = [];
  }
  return {
    name: get("name"),
    name_k: get("name_k"),
    phone_number: get("phone_number"),
    accept_fulltime_job: get("accept_fulltime_job") === "yes",
    gender: get("gender"),
    birthday: get("birthday"),
    postal_code: get("postal_code"),
    prefecture: get("prefecture"),
    address: get("address"),
    min_hourly_wage: get("min_hourly_wage"),
    time_slot: get("time_slot"),
    weekly_preference: get("weekly_preference"),
    weekend_holiday: get("weekend_holiday"),
    period: get("period"),
    desired_start_date: get("desired_start_date"),
    desired_job_type: get("desired_job_type"),
    work_histories: histories,
  };
}
