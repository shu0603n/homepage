"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Celebration } from "@/components/auth/Celebration";
import { loadLiffSdk } from "@/components/auth/LineAutoLogin";
import { checkAnswer, FILE_MAX, FILE_TYPES, FILES_TOTAL_MAX, type AnswerValue, type PublicField } from "@/lib/forms-def";

// フォームの回答ページの中身（/jobs/forms/<slug>/。管理画面の「フォーム管理」で作ったもの。仕組みは lib/admin/forms.ts）。
// LINE ログイン必須のフォームは、LIFF で LINE にログインしてから回答する（LINE アプリ内なら自動でログイン）
type Line = { stage: "off" } | { stage: "loading" } | { stage: "login" } | { stage: "ready"; idToken: string; name: string | null; picture: string | null } | { stage: "error"; message: string };

const INPUT_TYPE: Record<string, string> = { PHONE: "tel", EMAIL: "email", NUMBER: "text", DATE: "date", TIME: "time" };
const AUTOCOMPLETE: Record<string, string> = { PHONE: "tel", EMAIL: "email", ADDRESS: "street-address" };

export function PublicForm({ slug, fields, lineRequired, preview }: { slug: string; fields: PublicField[]; lineRequired: boolean; preview: boolean }) {
  const [line, setLine] = useState<Line>(lineRequired ? { stage: "loading" } : { stage: "off" });
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [files, setFiles] = useState<Record<number, File | null>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ text: string | null } | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const liffRef = useRef<Awaited<ReturnType<typeof loadLiffSdk>> | null>(null);

  // LINE ログイン（LIFF）。ID トークンが切れていたらログインし直す
  useEffect(() => {
    if (!lineRequired) return;
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    let cancelled = false;
    (async () => {
      try {
        if (!liffId) throw new Error("LIFF not configured");
        const liff = await loadLiffSdk();
        await liff.init({ liffId });
        liffRef.current = liff;
        if (cancelled) return;
        const inLine = liff.isInClient() || / Line\//.test(navigator.userAgent);
        const decoded = liff.getDecodedIDToken?.();
        const idToken = liff.getIDToken();
        if (!liff.isLoggedIn() || !idToken || (decoded?.exp && decoded.exp * 1000 <= Date.now() + 60_000)) {
          if (liff.isLoggedIn()) liff.logout?.();
          if (inLine && !preview) return liff.login({ redirectUri: window.location.href });
          return setLine({ stage: "login" });
        }
        setLine({ stage: "ready", idToken, name: decoded?.name ?? null, picture: decoded?.picture ?? null });
      } catch (error) {
        console.error("LIFF init failed:", error);
        if (!cancelled) setLine({ stage: "error", message: "LINE との接続に失敗しました。時間をおいて、ページを開き直してください。" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lineRequired, preview]);

  const set = (id: number, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setErrors((e) => (e[id] ? Object.fromEntries(Object.entries(e).filter(([k]) => Number(k) !== id)) : e));
  };

  function fileError(f: PublicField, file: File | null | undefined): string | null {
    if (!file) return f.required ? "ファイルを添付してください" : null;
    if (!FILE_TYPES.includes(file.type)) return "PDF・JPEG・PNG・WebP のファイルを添付してください";
    if (file.size > FILE_MAX) return "ファイルは 4MB 以下にしてください";
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (preview) return setMessage("プレビューのため送信できません（公開すると回答できるようになります）。");
    if (lineRequired && line.stage !== "ready") return setMessage("LINE でログインしてから回答してください。");
    const errs: Record<number, string> = {};
    for (const f of fields) {
      const m = f.type === "FILE" ? fileError(f, files[f.id]) : checkAnswer(f, answers[f.id]);
      if (m) errs[f.id] = m;
    }
    const total = Object.values(files).reduce((n, x) => n + (x?.size ?? 0), 0);
    if (total > FILES_TOTAL_MAX) return setMessage("添付ファイルの合計は 4.5MB 以下にしてください。");
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setMessage("入力内容をご確認ください。");
      const first = fields.find((f) => errs[f.id]);
      if (first) document.getElementById(`pf-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setMessage("");
    const body = new FormData();
    body.set("payload", JSON.stringify({ answers, idToken: line.stage === "ready" ? line.idToken : undefined, website: honeypot.current?.value ?? "" }));
    for (const [id, file] of Object.entries(files)) if (file) body.set(`file_${id}`, file);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}/`, { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; errors?: Record<number, string>; done?: string | null } | null;
      if (res.ok && data?.ok) {
        setDone({ text: data.done ?? null });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (res.status === 401 && liffRef.current) {
        // LINE のログインが切れていた：ログインし直してもらう
        liffRef.current.logout?.();
        setLine({ stage: "login" });
      }
      if (data?.errors) setErrors(data.errors);
      setMessage(data?.message ?? "送信できませんでした。時間をおいて再度お試しください。");
    } catch {
      setMessage("通信に失敗しました。電波の良いところで、もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="form form--auth pf-done" role="status">
        <Celebration message="ご回答ありがとうございました！" />
        <span className="pf-done__check" aria-hidden="true">
          <i className="bi bi-check-lg" />
        </span>
        <h2>送信しました</h2>
        <p>{done.text || "ご回答ありがとうございました。内容を確認のうえ、必要に応じて担当者よりご連絡いたします。"}</p>
      </div>
    );
  }

  return (
    <form className="form form--wide pf" onSubmit={onSubmit} noValidate>
      {preview && (
        <p className="pf-preview">
          <i className="bi bi-eye" aria-hidden="true" /> プレビュー（非公開）：管理者だけが見ています。公開すると、この URL から回答できるようになります。
        </p>
      )}
      {lineRequired && <LineBox line={line} onLogin={() => liffRef.current?.login({ redirectUri: window.location.href })} />}

      {fields.map((f) =>
        f.type === "DESCRIPTION" ? (
          <div key={f.id} className="pf-desc">
            {f.label}
          </div>
        ) : (
          <div key={f.id} className="form__row" id={`pf-${f.id}`}>
            <div>
              {f.type === "CONSENT" || CHOICE_GROUP.includes(f.type) ? (
                <span className="form__label">
                  {f.label}
                  {f.required && <span className="req">必須</span>}
                </span>
              ) : (
                <label className="form__label" htmlFor={`pf-in-${f.id}`}>
                  {f.label}
                  {f.required && <span className="req">必須</span>}
                </label>
              )}
            </div>
            <div>
              <FieldInput f={f} value={answers[f.id]} file={files[f.id] ?? null} invalid={!!errors[f.id]} onChange={(v) => set(f.id, v)} onFile={(file) => (setFiles((x) => ({ ...x, [f.id]: file })), setErrors((e) => ({ ...e, [f.id]: fileError(f, file) ?? "" })))} />
              {f.help && <p className="form__help">{f.help}</p>}
              {errors[f.id] && (
                <span className="form__error" role="alert">
                  {errors[f.id]}
                </span>
              )}
            </div>
          </div>
        ),
      )}

      <div className="pf-hp" aria-hidden="true">
        <label>
          ウェブサイト
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="form__actions">
        <button className="btn" type="submit" disabled={busy || (lineRequired && line.stage !== "ready" && !preview)}>
          {busy ? "送信しています…" : "送信する"}
        </button>
      </div>
      {message && (
        <p className="form__status is-ng" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

const CHOICE_GROUP = ["SINGLE_CHOICE", "MULTI_CHOICE"];

function LineBox({ line, onLogin }: { line: Line; onLogin: () => void }) {
  if (line.stage === "loading")
    return (
      <p className="pf-line">
        <span className="line-auto-login__spinner" aria-hidden="true" /> LINE のログインを確認しています…
      </p>
    );
  if (line.stage === "error") return <p className="form__status is-ng">{line.message}</p>;
  if (line.stage === "login")
    return (
      <div className="pf-line pf-line--login">
        <p>このフォームは、LINE でログインしてから回答していただきます。</p>
        <button type="button" className="pf-line__btn" onClick={onLogin}>
          <i className="bi bi-line" aria-hidden="true" /> LINE でログインして回答する
        </button>
      </div>
    );
  if (line.stage !== "ready") return null;
  return (
    <p className="pf-line pf-line--ok">
      {line.picture ? <img src={line.picture} alt="" referrerPolicy="no-referrer" /> : <i className="bi bi-line" aria-hidden="true" />}
      <span>
        <strong>{line.name ?? "LINE"}</strong> さんとして回答します
      </span>
    </p>
  );
}

function FieldInput({ f, value, file, invalid, onChange, onFile }: { f: PublicField; value: AnswerValue | undefined; file: File | null; invalid: boolean; onChange: (v: AnswerValue) => void; onFile: (f: File | null) => void }) {
  const id = `pf-in-${f.id}`;
  const text = typeof value === "string" ? value : "";
  const common = { id, "aria-invalid": invalid || undefined, required: f.required };
  switch (f.type) {
    case "LONG_TEXT":
      return <textarea {...common} value={text} maxLength={5000} onChange={(e) => onChange(e.target.value)} />;
    case "ADDRESS":
      return <textarea {...common} className="pf-short" value={text} maxLength={500} autoComplete="street-address" onChange={(e) => onChange(e.target.value)} />;
    case "SINGLE_CHOICE":
      return (
        <fieldset className="choices" aria-invalid={invalid || undefined}>
          {f.options.map((o) => (
            <label key={o}>
              <input type="radio" name={`pf-${f.id}`} value={o} checked={text === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </fieldset>
      );
    case "MULTI_CHOICE": {
      const sel = Array.isArray(value) ? value : [];
      return (
        <fieldset className="choices" aria-invalid={invalid || undefined}>
          {f.options.map((o) => (
            <label key={o}>
              <input type="checkbox" value={o} checked={sel.includes(o)} onChange={(e) => onChange(e.target.checked ? [...sel, o] : sel.filter((x) => x !== o))} />
              {o}
            </label>
          ))}
        </fieldset>
      );
    }
    case "SELECT":
      return (
        <select {...common} value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="">選択してください</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "CONSENT":
      return (
        <label className="pf-consent">
          <input type="checkbox" checked={text === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "")} />
          同意する
        </label>
      );
    case "FILE":
      return (
        <div className="pf-file">
          <label className={`pf-file__drop${file ? " is-set" : ""}`}>
            <input
              key={file ? "set" : "none"}
              id={id}
              type="file"
              accept={FILE_TYPES.join(",")}
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <i className={`bi ${file ? "bi-file-earmark-check" : "bi-cloud-arrow-up"}`} aria-hidden="true" />
            <span>{file ? `${file.name}（${Math.max(1, Math.round(file.size / 1024))}KB）` : "ファイルを選ぶ（PDF・画像、4MB まで）"}</span>
          </label>
          {file && (
            <button type="button" className="pf-file__clear" onClick={() => onFile(null)}>
              添付をやめる
            </button>
          )}
        </div>
      );
    default:
      return (
        <input
          {...common}
          type={INPUT_TYPE[f.type] ?? "text"}
          inputMode={f.type === "NUMBER" ? "decimal" : f.type === "PHONE" ? "tel" : undefined}
          autoComplete={AUTOCOMPLETE[f.type]}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
