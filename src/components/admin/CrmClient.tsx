"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

// 友だち・求職者管理／個別チャット／タグ管理の、画面で操作する部品（Linext から移植）。
// どれも管理画面の API に送ったあと、画面を読み込み直して最新の状態にする

type Opt = { id: number; label: string };

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return res.ok && data?.ok ? null : (data?.message ?? "保存できませんでした。");
  } catch {
    return "通信に失敗しました。";
  }
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(url: string, method: string, body: unknown, after?: () => void) {
    setBusy(true);
    setError("");
    const message = await send(url, method, body);
    setBusy(false);
    if (message) return setError(message), false;
    after?.();
    router.refresh();
    return true;
  }
  return { busy, error, run, setError };
}

const friendUrl = (id: string) => `/api/admin/friends/${id}/`;

// ステータス・対応状況のプルダウン
export function FieldSelect({
  id,
  field,
  value,
  options,
  empty,
  numeric = false,
}: {
  id: string;
  field: "status" | "assignee_id" | "chat_status" | "chat_assignee_id";
  value: string | number | null;
  options: { value: string | number; label: string }[];
  empty?: string;
  numeric?: boolean;
}) {
  const { busy, error, run } = useAction();
  return (
    <span className="adm-crm-select">
      <select
        value={value === null ? "" : String(value)}
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value;
          void run(friendUrl(id), "PATCH", { [field]: v === "" ? null : numeric ? Number(v) : v });
        }}
        aria-label={field}
      >
        {(empty !== undefined || value === null) && <option value="">{empty ?? "未設定"}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <small className="adm-crm-error">{error}</small>}
    </span>
  );
}

// タグの表示と付け外し（一覧のセル・詳細のタグ欄で共通）。
// 「＋」でタグ選びの小窓を開く。付けられるタグがなくても、その場で名前を入れて新しいタグを作って付けられる
const TAG_SWATCHES = ["#4B9C6B", "#1f6feb", "#e5484d", "#f59e0b", "#8b5cf6", "#0ea5a4", "#db2777", "#5a6a73"];

export function TagEditor({ id, tags, available, readOnly = false }: { id: string; tags: { id: number; name: string; color: string }[]; available: { id: number; name: string; color: string; manual: boolean }[]; readOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [q, setQ] = useState("");
  const [color, setColor] = useState(TAG_SWATCHES[0]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const left = available.filter((t) => t.manual && !tags.some((x) => x.id === t.id));
  const word = q.trim();
  const shown = word ? left.filter((t) => t.name.toLowerCase().includes(word.toLowerCase())) : left;
  const exists = available.some((t) => t.name === word) || tags.some((t) => t.name === word);

  // 小窓は画面に固定して出す（表の枠で切れないように）。外を押す・Esc・スクロールで閉じる
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const w = Math.min(280, window.innerWidth - 24);
      setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 330), left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) });
    };
    place();
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = (e: Event) => !popRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  async function call(url: string, method: string, body: unknown): Promise<{ ok: boolean; id?: number; message?: string }> {
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: number; message?: string } | null;
      return res.ok && data?.ok ? { ok: true, id: data.id } : { ok: false, message: data?.message ?? "保存できませんでした。" };
    } catch {
      return { ok: false, message: "通信に失敗しました。" };
    }
  }

  async function attach(tagId: number) {
    setBusy(true);
    setError("");
    const r = await call(`${friendUrl(id)}tags/`, "POST", { tag_id: tagId });
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "");
    setQ("");
    setOpen(false);
    router.refresh();
  }

  async function detach(tagId: number) {
    setBusy(true);
    setError("");
    const r = await call(`${friendUrl(id)}tags/`, "DELETE", { tag_id: tagId });
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "");
    router.refresh();
  }

  async function createAndAttach() {
    if (!word || exists) return;
    setBusy(true);
    setError("");
    const made = await call("/api/admin/tags/", "POST", { name: word, color, category_id: null, is_manual_allowed: true, auto_trigger: null });
    if (!made.ok || !made.id) {
      setBusy(false);
      return setError(made.message ?? "タグを作れませんでした。");
    }
    await attach(made.id);
  }

  return (
    <div className="adm-ftags">
      {tags.map((t) => (
        <span key={t.id} className="adm-ftag" style={{ background: t.color }}>
          {t.name}
          {!readOnly && (
            <button type="button" aria-label={`${t.name} を外す`} disabled={busy} onClick={() => detach(t.id)}>
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <button
          ref={btnRef}
          type="button"
          className={`adm-ftags__plus${open ? " is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="タグを付ける"
          aria-expanded={open}
          title="タグを付ける"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      )}
      {open && pos && (
        <div ref={popRef} className="adm-tagpop" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label="タグを付ける">
          <input
            autoFocus
            value={q}
            maxLength={100}
            placeholder="タグを探す・新しく作る"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const hit = shown.find((t) => t.name === word) ?? (shown.length === 1 ? shown[0] : null);
              if (hit) void attach(hit.id);
              else void createAndAttach();
            }}
          />
          <div className="adm-tagpop__list">
            {shown.map((t) => (
              <button key={t.id} type="button" className="adm-tagpop__item" disabled={busy} onClick={() => attach(t.id)}>
                <span className="adm-tagpop__dot" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
            {shown.length === 0 && <p className="adm-tagpop__empty">{left.length === 0 ? "付けられるタグがまだありません。上の欄に名前を入れると、新しく作って付けられます。" : "一致するタグがありません。"}</p>}
          </div>
          {word && !exists && (
            <div className="adm-tagpop__new">
              <div className="adm-tagpop__swatches" role="radiogroup" aria-label="新しいタグの色">
                {TAG_SWATCHES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={color === c ? "is-on" : ""} style={{ background: c }} onClick={() => setColor(c)} />
                ))}
              </div>
              <button type="button" className="adm-tagpop__create" disabled={busy} onClick={createAndAttach}>
                <span className="adm-ftag" style={{ background: color }}>
                  {word}
                </span>
                を作って付ける
              </button>
            </div>
          )}
          {error && <small className="adm-crm-error">{error}</small>}
          <a className="adm-tagpop__manage" href="/admin/?tab=linetags">
            <i className="bi bi-gear" aria-hidden="true" /> タグ管理（色・カテゴリ・自動付与）
          </a>
        </div>
      )}
      {tags.length === 0 && readOnly && <span className="adm-muted">－</span>}
      {error && !open && <small className="adm-crm-error">{error}</small>}
    </div>
  );
}

// 基本情報（プロフィール）の入力欄
export function ProfileForm({ id, fields, values }: { id: string; fields: { key: string; label: string }[]; values: Record<string, string> }) {
  const { busy, error, run } = useAction();
  const [saved, setSaved] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const profile = Object.fromEntries(fields.map((f) => [f.key, String(fd.get(f.key) ?? "")]));
    setSaved(false);
    if (await run(friendUrl(id), "PATCH", { profile })) setSaved(true);
  }
  return (
    <form className="adm-profile" onSubmit={onSubmit}>
      {fields.map((f) => (
        <label key={f.key}>
          <span>{f.label}</span>
          <input name={f.key} defaultValue={values[f.key] ?? ""} />
        </label>
      ))}
      <div className="adm-profile__foot">
        <button type="submit" className="adm-chipbtn adm-chipbtn--primary" disabled={busy}>
          <i className="bi bi-save" aria-hidden="true" />
          {busy ? "保存中…" : "保存"}
        </button>
        {saved && <span className="adm-ok">保存しました。</span>}
        {error && <span className="adm-crm-error">{error}</span>}
      </div>
    </form>
  );
}

// スタッフ登録との連携（連携済みなら内容の反映、未連携なら検索して連携）
export function StaffLinker({ id, staff }: { id: string; staff: { id: number; name: string | null } | null }) {
  const { busy, error, run, setError } = useAction();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ id: number; name: string | null; name_k: string | null; phone_number: string | null; mail: string | null; linked: boolean }[] | null>(null);

  if (staff) {
    return (
      <div className="adm-staffbox is-linked">
        <i className="bi bi-person-check-fill" aria-hidden="true" />
        <span>
          スタッフ登録と連携済み：<strong>{staff.name ?? "（氏名なし）"}</strong>（ID {staff.id}）
        </span>
        <button type="button" className="adm-chipbtn" disabled={busy} onClick={() => run(friendUrl(id), "PATCH", { fill_from_staff: true })}>
          <i className="bi bi-download" aria-hidden="true" />
          スタッフ登録の内容を反映
        </button>
        {error && <small className="adm-crm-error">{error}</small>}
      </div>
    );
  }
  async function search(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/admin/staff-search/?q=${encodeURIComponent(q)}`);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; rows?: typeof rows; message?: string } | null;
    if (!res.ok || !data?.ok) return setError(data?.message ?? "探せませんでした。");
    setRows(data.rows ?? []);
  }
  return (
    <div className="adm-staffbox">
      <p>
        <i className="bi bi-person-x" aria-hidden="true" /> スタッフ登録とは未連携です。該当するスタッフを探して連携できます（スタッフの LINE 連携として保存され、空いている項目に登録内容を反映します）。
      </p>
      <form onSubmit={search} className="adm-staffbox__search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="氏名・フリガナ・電話番号・メール・スタッフ ID" />
        <button type="submit" className="adm-chipbtn">
          <i className="bi bi-search" aria-hidden="true" />
          探す
        </button>
      </form>
      {rows && (
        <ul className="adm-staffbox__rows">
          {rows.length === 0 && <li className="adm-muted">見つかりませんでした。</li>}
          {rows.map((r) => (
            <li key={r.id}>
              <span>
                <strong>{r.name ?? "（氏名なし）"}</strong>
                <small>
                  ID {r.id}・{r.name_k ?? ""}・{r.phone_number ?? ""}・{r.mail ?? ""}
                </small>
              </span>
              {r.linked ? (
                <span className="adm-muted">別の LINE と連携済み</span>
              ) : (
                <button type="button" className="adm-chipbtn adm-chipbtn--primary" disabled={busy} onClick={() => run(`${friendUrl(id)}staff/`, "POST", { staff_id: r.id })}>
                  この人と連携
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <small className="adm-crm-error">{error}</small>}
    </div>
  );
}

// 個別チャットの内部メモ
export function NotesPanel({ id, notes }: { id: string; notes: { id: number; body: string; at: string; by: string }[] }) {
  const { busy, error, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <div className="adm-notes">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) void run(`${friendUrl(id)}notes/`, "POST", { body }, () => setBody(""));
        }}
      >
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={5000} placeholder="内部メモ（相手には送信されません）" />
        <button type="submit" className="adm-chipbtn" disabled={busy || !body.trim()}>
          メモを追加
        </button>
      </form>
      {error && <small className="adm-crm-error">{error}</small>}
      {notes.length === 0 ? (
        <p className="adm-muted">内部メモはありません。</p>
      ) : (
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <p>{n.body}</p>
              <small>
                {n.by}・{n.at}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- タグ管理 ----------

export type TagFormValue = { id?: number; name: string; description: string; color: string; category_id: number | null; is_manual_allowed: boolean; auto_trigger: string | null };

export function TagDialog({ initial, categories, triggers, trigger }: { initial?: TagFormValue; categories: Opt[]; triggers: { key: string; label: string }[]; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const blank: TagFormValue = { name: "", description: "", color: "#4B9C6B", category_id: null, is_manual_allowed: true, auto_trigger: null };
  const [v, setV] = useState<TagFormValue>(initial ?? blank);
  const { busy, error, run } = useAction();
  const set = (patch: Partial<TagFormValue>) => setV((cur) => ({ ...cur, ...patch }));
  return (
    <>
      <span onClick={() => (setV(initial ?? blank), setOpen(true))}>{trigger}</span>
      {open && (
        <div className="adm-dialog" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form
            className="adm-dialog__box"
            onSubmit={(e) => {
              e.preventDefault();
              void run(initial?.id ? `/api/admin/tags/${initial.id}/` : "/api/admin/tags/", initial?.id ? "PATCH" : "POST", v, () => setOpen(false));
            }}
          >
            <h2>{initial?.id ? "タグを編集" : "新規タグ作成"}</h2>
            <label>
              <span>タグ名</span>
              <input value={v.name} onChange={(e) => set({ name: e.target.value })} required maxLength={100} />
            </label>
            <label>
              <span>説明</span>
              <textarea value={v.description} onChange={(e) => set({ description: e.target.value })} rows={2} maxLength={1000} />
            </label>
            <label>
              <span>色</span>
              <span className="adm-dialog__color">
                <input type="color" value={v.color} onChange={(e) => set({ color: e.target.value })} />
                <input value={v.color} onChange={(e) => set({ color: e.target.value })} pattern="#[0-9a-fA-F]{6}" />
                <span className="adm-ftag" style={{ background: v.color }}>
                  {v.name || "見本"}
                </span>
              </span>
            </label>
            <label>
              <span>カテゴリ</span>
              <select value={v.category_id ?? ""} onChange={(e) => set({ category_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">カテゴリなし</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-dialog__check">
              <input type="checkbox" checked={v.is_manual_allowed} onChange={(e) => set({ is_manual_allowed: e.target.checked })} />
              手動での付与を許可する
            </label>
            <label>
              <span>自動付与ルール（付けるタイミング）</span>
              <select value={v.auto_trigger ?? ""} onChange={(e) => set({ auto_trigger: e.target.value || null })}>
                <option value="">なし（手動のみ）</option>
                {triggers.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="adm-crm-error">{error}</p>}
            <div className="adm-dialog__foot">
              <button type="button" className="adm-chipbtn" onClick={() => setOpen(false)}>
                キャンセル
              </button>
              <button type="submit" className="adm-chipbtn adm-chipbtn--primary" disabled={busy}>
                {busy ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function TagActiveToggle({ id, active }: { id: number; active: boolean }) {
  const { busy, run } = useAction();
  return (
    <button type="button" className="adm-linkbtn" disabled={busy} onClick={() => run(`/api/admin/tags/${id}/`, "PATCH", { is_active: !active })}>
      {active ? "無効にする" : "有効にする"}
    </button>
  );
}

export function CategoryManager({ categories }: { categories: { id: number; name: string; sort_order: number; count: number }[] }) {
  const { busy, error, run } = useAction();
  const [name, setName] = useState("");
  return (
    <div className="adm-cats">
      <ul>
        {categories.map((c) => (
          <CategoryRow key={c.id} c={c} busy={busy} run={run} />
        ))}
        {categories.length === 0 && <li className="adm-muted">カテゴリはまだありません。</li>}
      </ul>
      <form
        className="adm-cats__add"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void run("/api/admin/tag-categories/", "POST", { name, sort_order: categories.length }, () => setName(""));
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="新しいカテゴリ名" maxLength={100} />
        <button type="submit" className="adm-chipbtn" disabled={busy || !name.trim()}>
          追加
        </button>
      </form>
      {error && <small className="adm-crm-error">{error}</small>}
    </div>
  );
}

function CategoryRow({ c, busy, run }: { c: { id: number; name: string; sort_order: number; count: number }; busy: boolean; run: (u: string, m: string, b: unknown) => Promise<boolean> }) {
  const [name, setName] = useState(c.name);
  const [order, setOrder] = useState(c.sort_order);
  const dirty = name !== c.name || order !== c.sort_order;
  return (
    <li>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} aria-label="カテゴリ名" />
      <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} aria-label="並び順" className="adm-cats__order" />
      <small>{c.count}個のタグ</small>
      <button type="button" className="adm-chipbtn" disabled={busy || !dirty || !name.trim()} onClick={() => run("/api/admin/tag-categories/", "PATCH", { id: c.id, name, sort_order: order })}>
        保存
      </button>
      <button
        type="button"
        className="adm-linkbtn is-danger"
        disabled={busy}
        onClick={() => window.confirm(`カテゴリ「${c.name}」を削除しますか？（中のタグは「カテゴリなし」になります）`) && run("/api/admin/tag-categories/", "DELETE", { id: c.id })}
      >
        削除
      </button>
    </li>
  );
}
