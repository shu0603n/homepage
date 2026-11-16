"use client";

import { useEffect, useState, type RefObject } from "react";

// 登録フォームの「入力状況」ゲージ。画面の下に小さく固定して、必須項目がいくつ入力済みかを見せる。
// すべて入力すると「登録ボタンへ」に変わり、押すとボタンの位置まで移動する（ボタンは光って弾む：.btn.is-ready）。
// 登録ボタンが画面に見えている間は、ボタンに重ならないよう隠す
export function RegisterProgress({ formRef }: { formRef: RefObject<HTMLFormElement | null> }) {
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [nearSubmit, setNearSubmit] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    const count = () => {
      const fields = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[required], select[required], textarea[required]")];
      const filled = fields.filter((el) => (el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : el.value.trim() !== "")).length;
      setTotal(fields.length);
      setDone(filled);
      submit?.classList.toggle("is-ready", fields.length > 0 && filled === fields.length);
    };
    count();
    form.addEventListener("input", count);
    form.addEventListener("change", count);

    const io = submit ? new IntersectionObserver(([en]) => setNearSubmit(en.isIntersecting), { rootMargin: "0px 0px -40px 0px" }) : null;
    if (submit) io?.observe(submit);
    return () => {
      form.removeEventListener("input", count);
      form.removeEventListener("change", count);
      io?.disconnect();
    };
  }, [formRef]);

  if (total === 0) return null;
  const complete = done === total;
  const percent = Math.round((done / total) * 100);

  const goSubmit = () => {
    const submit = formRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
    submit?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className={`reg-progress${complete ? " is-complete" : ""}${nearSubmit ? " is-away" : ""}`} aria-hidden={nearSubmit}>
      {complete ? (
        <button type="button" className="reg-progress__done" onClick={goSubmit} tabIndex={nearSubmit ? -1 : 0}>
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          すべて入力できました！登録ボタンへ
          <i className="bi bi-arrow-down" aria-hidden="true" />
        </button>
      ) : (
        <div className="reg-progress__body" role="status">
          <p className="reg-progress__text">
            <span className="reg-progress__count">
              必須項目 <strong>{done}</strong> / {total}
            </span>
            <span className="reg-progress__rest">あと {total - done} 項目</span>
          </p>
          <div className="reg-progress__bar" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
