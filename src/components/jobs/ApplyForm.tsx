"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";

const DAYS_OFF = ["月", "火", "水", "木", "金", "土", "日", "祝"];

type Target = { kind: "project"; id: number } | { kind: "recruit"; id: number };

// 応募フォーム。氏名・連絡先などはログイン中のスタッフ情報が使われるため、入力するのは希望条件だけ
export function ApplyForm({ target, applicantName }: { target: Target; applicantName: string | null }) {
  const [days, setDays] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    const result = await postJson("/api/applications/", {
      ...(target.kind === "project" ? { project_id: target.id } : { recruit_project_id: target.id }),
      desired_time: fd.get("desired_time"),
      days_off: days,
      other_days_off: fd.get("other_days_off"),
      other_inquiries: fd.get("other_inquiries"),
    });
    setBusy(false);
    if (result.ok) return setDone(true);
    setMessage(result.message);
  }

  if (done) {
    return (
      <div className="form form--auth" id="apply">
        <p className="form__status is-ok" role="status">
          応募が完了しました。担当者より順次ご連絡いたします。
        </p>
      </div>
    );
  }

  return (
    <form className="form form--auth" id="apply" onSubmit={onSubmit}>
      <h2 className="form__group">この案件に応募する</h2>
      <p className="form__note">{applicantName ? `${applicantName} 様の登録情報で応募します。` : "ご登録の情報で応募します。"}</p>
      <div className="form__row">
        <label className="form__label" htmlFor="a-time">
          シフト希望時間
        </label>
        <div>
          <input id="a-time" type="text" name="desired_time" maxLength={20} placeholder="例：9:00〜17:00" />
        </div>
      </div>
      <div className="form__row">
        <span className="form__label">休み希望</span>
        <fieldset className="choices">
          {DAYS_OFF.map((d) => (
            <label key={d}>
              <input type="checkbox" checked={days.includes(d)} onChange={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))} />
              {d}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="form__row">
        <label className="form__label" htmlFor="a-other-days">
          その他の休み希望
        </label>
        <div>
          <input id="a-other-days" type="text" name="other_days_off" maxLength={255} />
        </div>
      </div>
      <div className="form__row">
        <label className="form__label" htmlFor="a-memo">
          備考
        </label>
        <div>
          <textarea id="a-memo" name="other_inquiries" rows={4} maxLength={2000} />
        </div>
      </div>
      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "送信中…" : "応募する"}
        </button>
      </div>
    </form>
  );
}
