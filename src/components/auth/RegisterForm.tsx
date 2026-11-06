"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { postJson } from "@/components/auth/api";
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

type History = { company: string; employment_type: string; period: string; job_type: string; content: string };
const EMPTY_HISTORY: History = { company: "", employment_type: "", period: "", job_type: "", content: "" };

function Row({ label, htmlFor, required, children }: { label: string; htmlFor?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="form__row">
      {htmlFor ? (
        <label className="form__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req">必須</span>}
        </label>
      ) : (
        <span className="form__label">
          {label}
          {required && <span className="req">必須</span>}
        </span>
      )}
      <div>{children}</div>
    </div>
  );
}

function Select({ id, name, options, label }: { id: string; name: string; options: string[]; label: string }) {
  return (
    <select id={id} name={name} defaultValue="" aria-label={label}>
      <option value="">未選択</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// スタッフ登録フォーム（next-app の staff-register と同じ項目）。登録するとスタッフ情報が DB に保存され、ログイン状態になる
export function RegisterForm({ privacy }: { privacy: ReactNode }) {
  const [days, setDays] = useState<string[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [historyCount, setHistoryCount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: string) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const changeCount = (value: string) => {
    setHistoryCount(value);
    setHistories(Array.from({ length: HISTORY_COUNT_MAP[value] ?? 0 }, () => ({ ...EMPTY_HISTORY })));
  };
  const updateHistory = (i: number, field: keyof History, value: string) =>
    setHistories((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    if (get("password") !== get("password2")) return setMessage("パスワードが一致しません。");

    setBusy(true);
    setMessage("");
    const result = await postJson("/api/auth/register/", {
      referrer: get("referrer"),
      name: get("name"),
      name_k: get("name_k"),
      mail: get("mail"),
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
      weekend_holiday: days.join(","),
      period: get("period"),
      desired_start_date: get("desired_start_date"),
      desired_job_type: get("desired_job_type"),
      work_histories: histories,
      password: String(fd.get("password") ?? ""),
      consent1: fd.get("consent1") === "on",
      consent2: fd.get("consent2") === "on",
    });
    if (result.ok) {
      window.location.assign("/mypage/?registered=1");
      return;
    }
    setMessage(result.message);
    setBusy(false);
    window.scrollTo({ top: document.getElementById("register-form")?.offsetTop ?? 0, behavior: "smooth" });
  }

  return (
    <form id="register-form" className="form form--wide" onSubmit={onSubmit}>
      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}

      <h2 className="form__group">基本情報</h2>
      <Row label="紹介者" htmlFor="r-referrer">
        <input id="r-referrer" type="text" name="referrer" placeholder="紹介者がいる場合はお名前をご入力ください" />
      </Row>
      <Row label="お名前" htmlFor="r-name" required>
        <input id="r-name" type="text" name="name" autoComplete="name" required />
      </Row>
      <Row label="フリガナ" htmlFor="r-name-k">
        <input id="r-name-k" type="text" name="name_k" placeholder="例：ヤマダ タロウ" />
      </Row>
      <Row label="メールアドレス" htmlFor="r-mail" required>
        <input id="r-mail" type="email" name="mail" autoComplete="email" required />
        <p className="form__help">ログインID になります。</p>
      </Row>
      <Row label="電話番号" htmlFor="r-tel" required>
        <input id="r-tel" type="tel" name="phone_number" autoComplete="tel" placeholder="例：090-1234-5678" required />
      </Row>
      <Row label="正社員求人の紹介">
        <fieldset className="choices">
          <label>
            <input type="radio" name="accept_fulltime_job" value="yes" />
            受け付ける
          </label>
          <label>
            <input type="radio" name="accept_fulltime_job" value="no" defaultChecked />
            受け付けない
          </label>
        </fieldset>
      </Row>
      <Row label="性別" htmlFor="r-gender">
        <Select id="r-gender" name="gender" options={GENDER_OPTIONS} label="性別" />
      </Row>
      <Row label="生年月日" htmlFor="r-birthday">
        <input id="r-birthday" type="date" name="birthday" autoComplete="bday" />
      </Row>
      <Row label="郵便番号" htmlFor="r-postal">
        <input id="r-postal" type="text" name="postal_code" autoComplete="postal-code" inputMode="numeric" placeholder="例：123-4567" />
      </Row>
      <Row label="都道府県" htmlFor="r-pref">
        <Select id="r-pref" name="prefecture" options={PREFECTURE_OPTIONS} label="都道府県" />
      </Row>
      <Row label="住所" htmlFor="r-address">
        <input id="r-address" type="text" name="address" autoComplete="street-address" />
      </Row>

      <h2 className="form__group">希望条件</h2>
      <Row label="最低ご希望時給（円）" htmlFor="r-wage">
        <input id="r-wage" type="number" name="min_hourly_wage" min={0} inputMode="numeric" placeholder="例：1300" />
      </Row>
      <Row label="勤務可能時間帯" htmlFor="r-slot">
        <input id="r-slot" type="text" name="time_slot" placeholder="例：9〜18" />
      </Row>
      <Row label="勤務可能週日数" htmlFor="r-weekly">
        <Select id="r-weekly" name="weekly_preference" options={WEEKLY_OPTIONS} label="勤務可能週日数" />
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
        <Select id="r-period" name="period" options={PERIOD_OPTIONS} label="勤務可能期間" />
      </Row>
      <Row label="勤務開始希望日" htmlFor="r-start">
        <input id="r-start" type="date" name="desired_start_date" />
      </Row>
      <Row label="希望職種" htmlFor="r-job">
        <input id="r-job" type="text" name="desired_job_type" list="r-job-list" />
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
              {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
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

      <h2 className="form__group">ログイン用パスワード</h2>
      <Row label="パスワード" htmlFor="r-password" required>
        <input id="r-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
        <p className="form__help">英大文字・英小文字・数字を含む8文字以上</p>
      </Row>
      <Row label="パスワード（確認）" htmlFor="r-password2" required>
        <input id="r-password2" type="password" name="password2" autoComplete="new-password" minLength={8} required />
      </Row>

      <h2 className="form__group">個人情報の取り扱いについて</h2>
      {privacy}
      <p className="form__agree">
        <label>
          <input type="checkbox" name="consent1" required />
          個人情報の取り扱いに同意します
        </label>
      </p>
      <h2 className="form__group">秘密保持のお願い</h2>
      <p>就業先企業・業務内容に関する情報は第三者に開示・漏洩しないようお願いいたします。</p>
      <p className="form__agree">
        <label>
          <input type="checkbox" name="consent2" required />
          秘密保持事項に同意します
        </label>
      </p>

      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "登録中…" : "登録する"}
        </button>
      </div>
      <ul className="auth-links">
        <li>
          <Link href="/login/">すでに登録済みの方はログイン</Link>
        </li>
      </ul>
    </form>
  );
}
