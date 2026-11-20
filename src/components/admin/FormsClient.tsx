"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { FORM_NOTIFY_TO } from "@/lib/form-notify-to";
import { AUTH_MODES, BRANCH_TYPES, CHOICE_TYPES, FIELD_TYPE_LABEL, FIELD_TYPES, isInputType, OTHER_KEY, PROFILE_TARGETS, SLUG_RE, type AuthMode, type FieldLogic, type FieldType } from "@/lib/forms-def";

// フォーム管理の、画面で操作する部品（フォームの作成・編集、URL のコピー、QR コード、公開の切り替え、削除）

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; id?: number; sheet?: string; message?: string }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: number; sheet?: string; message?: string } | null;
    return res.ok && data?.ok ? { ok: true, id: data.id, sheet: data.sheet } : { ok: false, message: data?.message ?? "保存できませんでした。" };
  } catch {
    return { ok: false, message: "通信に失敗しました。" };
  }
}

// ---------- URL のコピー・QR コード ----------

export function CopyUrlButton({ url, label = "URL をコピー" }: { url: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`adm-chipbtn${done ? " is-done" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt("この URL をコピーしてください", url);
        }
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
    >
      <i className={`bi ${done ? "bi-check2" : "bi-link-45deg"}`} aria-hidden="true" />
      {done ? "コピーしました" : label}
    </button>
  );
}

export function QrButton({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: "#0b2a3c", light: "#ffffff" } }).then(setSrc, () => setSrc(""));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, url]);
  return (
    <>
      <button type="button" className="adm-chipbtn" onClick={() => setOpen(true)}>
        <i className="bi bi-qr-code" aria-hidden="true" />
        QR コード
      </button>
      {open && (
        <div className="adm-dialog" role="dialog" aria-modal="true" aria-label="QR コード" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="adm-dialog__box adm-qr">
            <h2>{name}</h2>
            {src ? <img src={src} alt={`${name} の QR コード`} width={260} height={260} /> : <span className="adm-qr__wait" />}
            <p className="adm-qr__url">{url}</p>
            <div className="adm-dialog__foot">
              <button type="button" className="adm-chipbtn" onClick={() => setOpen(false)}>
                閉じる
              </button>
              {src && (
                <a className="adm-chipbtn adm-chipbtn--primary" href={src} download={`QR_${name}.png`}>
                  <i className="bi bi-download" aria-hidden="true" />
                  画像を保存
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- 一覧での操作 ----------

export function PublishToggle({ id, published }: { id: number; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="adm-switchwrap">
      <button
        type="button"
        role="switch"
        aria-checked={published}
        className={`adm-switch${published ? " is-on" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const r = await send(`/api/admin/forms/${id}/`, "PATCH", { is_published: !published });
          setBusy(false);
          if (!r.ok) return setError(r.message ?? "");
          router.refresh();
        }}
      >
        <span className="adm-switch__knob" />
        <span className="adm-switch__label">{published ? "公開中" : "非公開"}</span>
      </button>
      {error && <small className="adm-crm-error">{error}</small>}
    </span>
  );
}

export function DeleteFormButton({ id, title, answers }: { id: number; title: string; answers: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="adm-linkbtn is-danger"
        title={answers > 0 ? "回答があるフォームは削除できません（非公開にしてください）" : undefined}
        disabled={answers > 0}
        onClick={async () => {
          if (!window.confirm(`フォーム「${title}」を削除します。よろしいですか？`)) return;
          const r = await send(`/api/admin/forms/${id}/`, "DELETE");
          if (!r.ok) return setError(r.message ?? "");
          router.refresh();
        }}
      >
        削除
      </button>
      {error && <small className="adm-crm-error">{error}</small>}
    </>
  );
}

export function DeleteSubmissionButton({ id, formId }: { id: number; formId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span>
      <button
        type="button"
        className="adm-chipbtn is-danger"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("この回答を削除します（添付ファイルも消えます）。元に戻せません。よろしいですか？")) return;
          setBusy(true);
          const r = await send(`/api/admin/forms/submissions/${id}/`, "DELETE");
          setBusy(false);
          if (!r.ok) return setError(r.message ?? "");
          router.replace(`/admin/forms/${formId}/answers/`);
          router.refresh();
        }}
      >
        <i className="bi bi-trash3" aria-hidden="true" />
        この回答を削除
      </button>
      {error && <small className="adm-crm-error">{error}</small>}
    </span>
  );
}

// ---------- フォームの作成・編集 ----------

export type SheetSummary = { title: string | null; sheet_name: string; columns: number };
const sheetText = (x: SheetSummary) => `「${x.title ?? "スプレッドシート"}」のシート「${x.sheet_name}」・${x.columns}列`;

// uid：セクションの目印（分岐の行き先）。next：セクションの「このセクションのあと」。branchOn・branches：「回答に応じてセクションに移動」
type Draft = {
  key: string;
  id: number | null;
  uid: string;
  type: FieldType;
  label: string;
  help: string;
  required: boolean;
  opts: Opt[]; // 選択肢（1つずつ。target＝その答えのときの行き先）
  other: boolean; // 「その他」（回答者が自由に入力）を出す
  otherTarget: string;
  profile_key: string;
  next: string;
  branchOn: boolean;
  fresh?: boolean;
};
type Opt = { k: string; text: string; target: string };

export type BuilderInitial = {
  id: number | null;
  title: string;
  slug: string;
  description: string;
  purpose: string;
  auth_mode: AuthMode;
  is_published: boolean;
  done_message: string;
  on_submit_status: string;
  on_submit_tag_ids: number[];
  notify: boolean; // 回答があったらメールで知らせる
  first_next: string; // 最初のセクションのあとの行き先
  fields: { id: number | null; uid?: string; type: FieldType; label: string; help: string | null; required: boolean; options: string[]; profile_key: string | null; logic?: FieldLogic | null }[];
  answers: number;
};

let seq = 0;
const newKey = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;
const newUid = () => Math.random().toString(36).slice(2, 10);
const newOpt = (text = "", target = ""): Opt => ({ k: newKey(), text, target });
const blank = (type: FieldType): Draft => ({ key: newKey(), id: null, uid: newUid(), type, label: "", help: "", required: false, opts: CHOICE_TYPES.includes(type) ? [newOpt(), newOpt()] : [], other: false, otherTarget: "", profile_key: "", next: "", branchOn: false, fresh: true });
const randomSlug = () => `form-${Math.random().toString(36).slice(2, 8)}`;

export function FormBuilder({
  initial,
  tags,
  statuses,
  publicBase,
  template,
  fromTemplate,
  templateId,
  sheet,
  templateSheet,
}: {
  initial: BuilderInitial;
  tags: { id: number; name: string; color: string }[];
  statuses: { key: string; label: string }[];
  publicBase: string;
  template?: { id: number | null; name: string; description: string }; // テンプレートを作る・直すとき
  fromTemplate?: string; // テンプレートから新しいフォームを作るとき：そのテンプレートの名前
  templateId?: number; // テンプレートから作るとき：そのテンプレートの ID
  sheet?: SheetSummary | null; // このフォームのスプレッドシート連携（「テンプレートとして保存」で一緒に入れられる）
  templateSheet?: SheetSummary | null; // テンプレートに入っているスプレッドシート連携の設定
}) {
  const router = useRouter();
  const isTemplate = template !== undefined;
  const [tplName, setTplName] = useState(template?.name ?? "");
  const [tplDesc, setTplDesc] = useState(template?.description ?? "");
  const [saveAs, setSaveAs] = useState<{ name: string; description: string; withSheet: boolean } | null>(null);
  // テンプレートから作るとき：スプレッドシート連携を same＝同じシートに書く／new＝新しく作る（列の設定だけ）／none＝引き継がない
  const [sheetMode, setSheetMode] = useState<"same" | "new" | "none">("same");
  // テンプレートを直すとき：入っているスプレッドシート連携の設定を残すか
  const [keepTplSheet, setKeepTplSheet] = useState(true);
  const [saveAsBusy, setSaveAsBusy] = useState(false);
  const [saveAsError, setSaveAsError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug || (initial.id === null ? randomSlug() : ""));
  const [description, setDescription] = useState(initial.description);
  const [purpose, setPurpose] = useState(initial.purpose);
  const [auth, setAuth] = useState<AuthMode>(initial.auth_mode);
  const [published, setPublished] = useState(initial.is_published);
  const [doneMessage, setDoneMessage] = useState(initial.done_message);
  const [status, setStatus] = useState(initial.on_submit_status);
  const [tagIds, setTagIds] = useState<number[]>(initial.on_submit_tag_ids);
  const [notify, setNotify] = useState(initial.notify);
  const [fields, setFields] = useState<Draft[]>(() =>
    initial.fields.length > 0
      ? initial.fields.map((f) => ({
          key: f.id !== null ? `f${f.id}` : newKey(),
          id: f.id,
          uid: f.uid || newUid(),
          type: f.type,
          label: f.label,
          help: f.help ?? "",
          required: f.required,
          opts: f.options.map((o) => newOpt(o, f.logic?.branches?.[o] ?? "")),
          other: f.logic?.other === true,
          otherTarget: f.logic?.branches?.[OTHER_KEY] ?? "",
          profile_key: f.profile_key ?? "",
          next: f.logic?.next ?? "",
          branchOn: Object.keys(f.logic?.branches ?? {}).length > 0,
        }))
      : [{ ...blank("SHORT_TEXT"), label: "お名前", required: true, profile_key: "name", fresh: false }],
  );
  const [firstNext, setFirstNext] = useState(initial.first_next);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      title,
      slug: slug.trim().toLowerCase(),
      description,
      purpose,
      auth_mode: auth,
      is_published: published,
      done_message: doneMessage,
      on_submit_status: auth === "line" ? status || null : null,
      on_submit_tag_ids: auth === "line" ? tagIds : [],
      notify,
      logic: { first_next: firstNext },
      fields: fields.map((f) => ({
        id: f.id,
        uid: f.uid,
        logic: {
          ...(f.type === "SECTION" && f.next ? { next: f.next } : {}),
          ...(f.other && (f.type === "SINGLE_CHOICE" || f.type === "MULTI_CHOICE") ? { other: true } : {}),
          ...(BRANCH_TYPES.includes(f.type) && f.branchOn
            ? {
                branches: Object.fromEntries([
                  ...f.opts.flatMap((o) => (o.target && o.text.trim() ? [[o.text.trim(), o.target]] : [])),
                  ...(f.other && f.type === "SINGLE_CHOICE" && f.otherTarget ? [[OTHER_KEY, f.otherTarget]] : []),
                ]),
              }
            : {}),
        },
        type: f.type,
        label: f.label,
        help: f.help,
        required: f.required,
        options: f.opts.map((o) => o.text.trim()).filter(Boolean),
        profile_key: auth === "line" || f.profile_key === "name" ? f.profile_key || null : null,
      })),
    }),
    [title, slug, description, purpose, auth, published, doneMessage, status, tagIds, fields, firstNext, notify],
  );
  // テンプレートに入れる中身（URL の名前・公開の有無は入れない）
  const templateData = useMemo(() => {
    const { slug: _slug, is_published: _pub, ...rest } = payload;
    void _slug;
    void _pub;
    return rest;
  }, [payload]);
  const snapshot = JSON.stringify(isTemplate ? { tplName, tplDesc, templateData, keepTplSheet } : payload);
  const [savedJson, setSavedJson] = useState(snapshot);
  const dirty = snapshot !== savedJson;

  // 保存しないまま画面を離れようとしたら確かめる
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (key: string, patch: Partial<Draft>) => setFields((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
    setMoved(fields[i].key);
    window.setTimeout(() => setMoved(null), 600);
  };

  async function save() {
    setError("");
    if (isTemplate) {
      setBusy(true);
      const body = { name: tplName, description: tplDesc, data: templateData, ...(templateSheet && !keepTplSheet ? { sheet: null } : {}) };
      const r = template.id === null ? await send("/api/admin/form-templates/", "POST", body) : await send(`/api/admin/form-templates/${template.id}/`, "PUT", body);
      setBusy(false);
      if (!r.ok || !r.id) return setError(r.message ?? "保存できませんでした。");
      setSavedJson(snapshot);
      router.replace(`/admin/forms/templates/${r.id}/?saved=${Date.now()}`);
      router.refresh();
      return;
    }
    if (!SLUG_RE.test(payload.slug)) return setError("URL の名前は、半角の英小文字・数字・ハイフンで 2〜60 文字にしてください（先頭は英数字）。");
    setBusy(true);
    const r =
      initial.id === null
        ? await send("/api/admin/forms/", "POST", { ...payload, ...(templateId && templateSheet ? { template_id: templateId, sheet_mode: sheetMode } : {}) })
        : await send(`/api/admin/forms/${initial.id}/`, "PUT", payload);
    setBusy(false);
    if (!r.ok || !r.id) return setError(r.message ?? "保存できませんでした。");
    setSavedJson(snapshot);
    router.replace(`/admin/forms/${r.id}/?saved=${Date.now()}${r.sheet && r.sheet !== "none" ? `&sheet=${r.sheet}` : ""}`);
    router.refresh();
  }

  async function saveAsTemplate() {
    if (!saveAs) return;
    setSaveAsBusy(true);
    setSaveAsError("");
    const r = await send("/api/admin/form-templates/", "POST", { name: saveAs.name, description: saveAs.description, data: templateData, ...(saveAs.withSheet && initial.id ? { sheet_from_form: initial.id } : {}) });
    setSaveAsBusy(false);
    if (!r.ok) return setSaveAsError(r.message ?? "保存できませんでした。");
    setNotice(`テンプレート「${saveAs.name}」を保存しました。新しいフォームを作るときに選べます。`);
    setSaveAs(null);
    window.setTimeout(() => setNotice(""), 6000);
  }

  // セクション（ページ）：区切りより前が「セクション 1」。区切りが先頭にあるときは、その区切りがセクション 1
  const sections = (() => {
    const list: { uid: string; pos: number; title: string }[] = fields[0]?.type === "SECTION" ? [] : [{ uid: "_start", pos: -1, title: "" }];
    fields.forEach((f, i) => f.type === "SECTION" && list.push({ uid: f.uid, pos: i, title: f.label }));
    return list;
  })();
  const hasSections = fields.some((f) => f.type === "SECTION");
  const sectionNo = (uid: string) => sections.findIndex((x) => x.uid === uid) + 1;
  // pos の位置から行ける先：それより後ろのセクションと「送信」
  const targets = (pos: number) => [
    ...sections.filter((x) => x.pos > pos).map((x) => ({ value: x.uid, label: `ページ ${sectionNo(x.uid)}${x.title ? `「${x.title.slice(0, 20)}」` : ""}へ移動` })),
    { value: "submit", label: "フォームを送信する（ここで終わり）" },
  ];
  const addPageFor = (key: string, optKey: string) => {
    const page = blank("SECTION");
    setFields((list) => [
      ...list.map((x) => (x.key !== key ? x : optKey === OTHER_KEY ? { ...x, otherTarget: page.uid } : { ...x, opts: x.opts.map((o) => (o.k === optKey ? { ...o, target: page.uid } : o)) })),
      page,
    ]);
  };
  const setOpt = (key: string, k: string, patch: Partial<Opt>) => setFields((list) => list.map((x) => (x.key === key ? { ...x, opts: x.opts.map((o) => (o.k === k ? { ...o, ...patch } : o)) } : x)));
  const [focusOpt, setFocusOpt] = useState<string | null>(null);
  // 選択肢を足す（after の行のうしろ。無ければ最後）。足した行に入力の印を移す
  const addOpt = (key: string, after?: string) => {
    const o = newOpt();
    setFields((list) => list.map((x) => (x.key !== key ? x : { ...x, opts: after ? x.opts.flatMap((y) => (y.k === after ? [y, o] : [y])) : [...x.opts, o] })));
    setFocusOpt(o.k);
  };
  // 選択肢の「次の動き」の選び方（行き先の選択欄の中身）
  const actionOptions = (i: number) => (
    <>
      <option value="">{hasSections ? "次のページへ進む（いつもどおり）" : "そのまま続ける（いつもどおり）"}</option>
      {targets(i).map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
      <option value="__new">＋ 新しいページを作って、そこへ移動</option>
    </>
  );
  // 「回答者の名前として使う」（誰でも回答可のフォーム）は、どれか1つに決めたら、ほかの質問には出さない
  const nameKey = auth === "open" ? fields.find((x) => x.profile_key === "name")?.key : undefined;
  // セクションの終わりに出す「このセクションのあと」
  const afterSection = (sec: { uid: string; pos: number }, isLast: boolean) => {
    const value = sec.uid === "_start" ? firstNext : (fields.find((f) => f.uid === sec.uid)?.next ?? "");
    const set = (v: string) => (sec.uid === "_start" ? setFirstNext(v) : setFields((list) => list.map((f) => (f.uid === sec.uid ? { ...f, next: v } : f))));
    return (
      <li key={`after-${sec.uid}`} className="adm-fb__after">
        <i className="bi bi-signpost-split" aria-hidden="true" />
        <span>ページ {sectionNo(sec.uid)} のあと</span>
        {isLast ? (
          <strong>フォームを送信する（最後のページ）</strong>
        ) : (
          <select value={value} onChange={(e) => set(e.target.value)} aria-label={`ページ ${sectionNo(sec.uid)} のあと`}>
            <option value="">次のページに進む</option>
            {targets(sec.pos)
              .filter((t) => sections.findIndex((x) => x.uid === t.value) !== sections.findIndex((x) => x.uid === sec.uid) + 1)
              .map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
          </select>
        )}
      </li>
    );
  };

  const url = `${publicBase}${payload.slug || "…"}/`;
  return (
    <div className="adm-stack adm-fb">
      {fromTemplate && (
        <p className="adm-alert is-ok adm-flash">
          <i className="bi bi-layers" aria-hidden="true" />
          <span>
            テンプレート「{fromTemplate}」の中身を入れました。自由に直してから「作成する」を押してください（テンプレート自体は変わりません）。
          </span>
        </p>
      )}
      {isTemplate && (
        <section className="adm-card adm-fb__tpl">
          <p className="adm-card__en">Template</p>
          <h2 className="adm-card__title">テンプレート</h2>
          <p className="adm-card__help">ここで作った質問と設定を、新しいフォームを作るときのもとにできます。URL の名前と公開は、フォームを作るときに決めます。</p>
          <div className="adm-fb__grid">
            <label>
              <span>テンプレートの名前</span>
              <input value={tplName} maxLength={100} onChange={(e) => setTplName(e.target.value)} placeholder="例：面談希望アンケート（基本形）" />
            </label>
            <label>
              <span>説明（管理画面だけに出します。任意）</span>
              <input value={tplDesc} maxLength={500} onChange={(e) => setTplDesc(e.target.value)} placeholder="例：友だち追加後に送る、いちばん基本の形" />
            </label>
          </div>
        </section>
      )}
      <section className="adm-card">
        <p className="adm-card__en">Settings</p>
        <h2 className="adm-card__title">{isTemplate ? "フォームの設定（このテンプレートから作るフォームに入ります）" : "フォームの設定"}</h2>
        <div className="adm-fb__grid">
          <label className="adm-fb__wide">
            <span>タイトル（回答ページの見出し）</span>
            <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="例：面談のご希望日アンケート" />
          </label>
          {!isTemplate && (
          <label className="adm-fb__wide">
            <span>URL の名前（半角の英小文字・数字・ハイフン）</span>
            <span className="adm-fb__slug">
              <small>{publicBase}</small>
              <input value={slug} maxLength={60} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="interview" />
              <small>/</small>
            </span>
            {initial.answers > 0 && <em className="adm-fb__note">URL の名前を変えると、前の URL（配った QR コードなど）では開けなくなります。</em>}
          </label>
          )}
          <label className="adm-fb__wide">
            <span>説明文（回答ページの上に出します。任意）</span>
            <textarea value={description} maxLength={5000} rows={3} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="adm-fb__wide">
            <span>用途メモ（管理画面だけに出します。任意）</span>
            <input value={purpose} maxLength={200} onChange={(e) => setPurpose(e.target.value)} placeholder="例：友だち追加後の初回アンケート" />
          </label>
          <label className="adm-fb__wide">
            <span>送信後のメッセージ（送信が終わった画面に出します。改行もそのまま出ます。任意）</span>
            <textarea
              value={doneMessage}
              maxLength={2000}
              rows={Math.min(8, Math.max(3, doneMessage.split("\n").length + 1))}
              onChange={(e) => setDoneMessage(e.target.value)}
              placeholder={"ご回答ありがとうございました。\n内容を確認のうえ、担当者よりご連絡いたします。"}
            />
          </label>
        </div>
      </section>

      {templateSheet && !isTemplate && (
        <section className="adm-card adm-fb__tplsheet">
          <p className="adm-card__en">Spreadsheet</p>
          <h2 className="adm-card__title">スプレッドシート連携（テンプレートから）</h2>
          <p className="adm-card__help">テンプレートに、スプレッドシート連携の設定が入っています（{sheetText(templateSheet)}）。作るフォームに引き継ぐかを選んでください。あとから「スプレッドシート連携」のタブで変えられます。</p>
          <div className="adm-fb__modes adm-fb__modes--3" role="radiogroup" aria-label="スプレッドシート連携の引き継ぎ">
            {(
              [
                ["same", "bi-link-45deg", "同じシートに書き込む", "テンプレートと同じスプレッドシート・シートに、同じ列の設定で書き込みます。"],
                ["new", "bi-file-earmark-plus", "新しいスプレッドシートを作る", "列の設定だけ引き継いで、このフォーム用のスプレッドシートを新しく作ります（見出しも書きます）。"],
                ["none", "bi-x-circle", "引き継がない", "スプレッドシートには書き込みません。"],
              ] as const
            ).map(([key, icon, label, help]) => (
              <button key={key} type="button" role="radio" aria-checked={sheetMode === key} className={`adm-fb__mode${sheetMode === key ? " is-on" : ""}`} onClick={() => setSheetMode(key)}>
                <i className={`bi ${icon}`} aria-hidden="true" />
                <strong>{label}</strong>
                <small>{help}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {templateSheet && isTemplate && (
        <section className={`adm-card adm-fb__tplsheet${keepTplSheet ? "" : " is-off"}`}>
          <p className="adm-card__en">Spreadsheet</p>
          <h2 className="adm-card__title">スプレッドシート連携（引き継ぐ設定）</h2>
          <div className="adm-sheet__target">
            <span className="adm-sheet__sicon" aria-hidden="true">
              <i className="bi bi-file-earmark-spreadsheet" />
            </span>
            <span>
              <strong>{sheetText(templateSheet)}</strong>
              <small>{keepTplSheet ? "このテンプレートからフォームを作るとき、引き継ぐかを選べます。" : "保存すると、テンプレートからこの設定を外します。"}</small>
            </span>
            <button type="button" className={`adm-chipbtn${keepTplSheet ? " is-danger" : ""}`} onClick={() => setKeepTplSheet(!keepTplSheet)}>
              {keepTplSheet ? "テンプレートから外す" : "外すのをやめる"}
            </button>
          </div>
        </section>
      )}

      <section className="adm-card">
        <p className="adm-card__en">Notification</p>
        <h2 className="adm-card__title">回答の通知</h2>
        <div className="adm-fb__notify">
          <button type="button" role="switch" aria-checked={notify} className={`adm-switch${notify ? " is-on" : ""}`} onClick={() => setNotify(!notify)}>
            <span className="adm-switch__knob" />
            <span className="adm-switch__label">{notify ? "通知メールを受け取る" : "通知しない"}</span>
          </button>
          <p>
            回答があるたびに、<strong>{FORM_NOTIFY_TO}</strong> へメールでお知らせします（回答の内容と、管理画面の回答ページへのリンク付き）。
          </p>
        </div>
      </section>

      <section className="adm-card">
        <p className="adm-card__en">Respondent</p>
        <h2 className="adm-card__title">回答者の確かめ方</h2>
        <div className="adm-fb__modes" role="radiogroup" aria-label="回答者の確かめ方">
          {AUTH_MODES.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={auth === m.key} className={`adm-fb__mode${auth === m.key ? " is-on" : ""}`} onClick={() => setAuth(m.key)}>
              <i className={`bi ${m.key === "line" ? "bi-line" : "bi-globe2"}`} aria-hidden="true" />
              <strong>{m.label}</strong>
              <small>{m.help}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="adm-card">
        <p className="adm-card__en">Questions</p>
        <h2 className="adm-card__title">
          質問<small>{fields.filter((f) => isInputType(f.type)).length}件{hasSections && `・${sections.length}ページ`}</small>
        </h2>
        {hasSections && (
          <p className="adm-card__help">
            回答ページでは1ページずつ表示し、「次へ」「戻る」で進みます。各ページの終わりで「ページのあと」の行き先を、単一選択・プルダウンの質問では「回答に応じた動き」で、答えごとに次のページ・別のページ・送信を決められます（Google フォームと同じ）。
          </p>
        )}
        <ol className="adm-fb__fields">
          {fields.map((f, i) => {
            // セクションの区切りの直前に、ひとつ前のセクションの「このセクションのあと」を出す
            const prev = f.type === "SECTION" && i > 0 ? [...sections].reverse().find((x) => x.pos < i) : undefined;
            return [
              prev ? afterSection(prev, false) : null,
            <li key={f.key} className={`adm-fb__field${f.type === "SECTION" ? " is-section" : ""}${f.fresh ? " is-new" : ""}${moved === f.key ? " is-moved" : ""}`}>
              <header>
                {f.type === "SECTION" ? (
                  <span className="adm-fb__secno">
                    <i className="bi bi-file-earmark-text" aria-hidden="true" /> ページ {sectionNo(f.uid)}
                  </span>
                ) : (
                  <span className="adm-fb__num">Q{fields.slice(0, i + 1).filter((x) => x.type !== "SECTION").length}</span>
                )}
                <select
                  value={f.type}
                  onChange={(e) => {
                    const type = e.target.value as FieldType;
                    update(f.key, { type, fresh: false, ...(CHOICE_TYPES.includes(type) && f.opts.length === 0 ? { opts: [newOpt(), newOpt()] } : {}) });
                  }}
                  aria-label="回答形式"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span className="adm-fb__tools">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="上へ" title="上へ">
                    <i className="bi bi-arrow-up" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="下へ" title="下へ">
                    <i className="bi bi-arrow-down" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setFields((list) => [...list.slice(0, i + 1), { ...f, key: newKey(), id: null, uid: newUid(), opts: f.opts.map((o) => newOpt(o.text, o.target)), profile_key: "", fresh: true }, ...list.slice(i + 1)])} aria-label="複製" title="複製">
                    <i className="bi bi-copy" aria-hidden="true" />
                  </button>
                  <button type="button" className="is-danger" onClick={() => setFields((list) => list.filter((x) => x.key !== f.key))} disabled={fields.length === 1} aria-label="削除" title="削除">
                    <i className="bi bi-trash3" aria-hidden="true" />
                  </button>
                </span>
              </header>
              {f.type === "SECTION" ? (
                <>
                  <label>
                    <span>ページのタイトル（ページの見出し。任意）</span>
                    <input value={f.label} maxLength={200} onChange={(e) => update(f.key, { label: e.target.value })} placeholder="例：ご経験について" />
                  </label>
                  <label>
                    <span>説明（任意）</span>
                    <textarea value={f.help} rows={2} maxLength={3000} onChange={(e) => update(f.key, { help: e.target.value })} />
                  </label>
                </>
              ) : f.type === "DESCRIPTION" ? (
                <label>
                  <span>説明文（回答ページにそのまま出します）</span>
                  <textarea value={f.label} rows={3} maxLength={2000} onChange={(e) => update(f.key, { label: e.target.value })} />
                </label>
              ) : (
                <>
                  <label>
                    <span>質問文</span>
                    <input value={f.label} maxLength={2000} onChange={(e) => update(f.key, { label: e.target.value })} placeholder={`例：${FIELD_TYPE_LABEL[f.type] === "日付" ? "面談のご希望日" : "ご希望の職種"}`} />
                  </label>
                  {CHOICE_TYPES.includes(f.type) && (() => {
                    const branchable = BRANCH_TYPES.includes(f.type);
                    const mark = f.type === "MULTI_CHOICE" ? "bi-square" : f.type === "SELECT" ? "bi-caret-down-square" : "bi-circle";
                    return (
                      <div className={`adm-fb__choices${branchable && f.branchOn ? " is-branch" : ""}`}>
                        <div className="adm-fb__choicehead">
                          <span>選択肢</span>
                          {branchable && (
                            <label className="adm-fb__check adm-fb__branchtoggle">
                              <input type="checkbox" checked={f.branchOn} onChange={(e) => update(f.key, { branchOn: e.target.checked })} />
                              回答に応じて次の動きを変える（分岐）
                            </label>
                          )}
                        </div>
                        {branchable && f.branchOn && !hasSections && (
                          <p className="adm-fb__branchnote">ページがまだ1つだけです。「次の動き」で「＋ 新しいページを作って、そこへ移動」を選ぶか、下の「＋ 次のページを追加」でページを足すと、答えごとに進むページを変えられます。</p>
                        )}
                        <ul className="adm-fb__opts">
                          {f.opts.map((o, j) => (
                            <li key={o.k} className="adm-fb__opt">
                              <i className={`bi ${mark} adm-fb__optmark`} aria-hidden="true" />
                              <input
                                value={o.text}
                                maxLength={200}
                                placeholder={`選択肢 ${j + 1}`}
                                autoFocus={focusOpt === o.k}
                                onChange={(e) => setOpt(f.key, o.k, { text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    addOpt(f.key, o.k);
                                  }
                                }}
                                aria-label={`選択肢 ${j + 1}`}
                              />
                              {branchable && f.branchOn && (
                                <select
                                  value={o.target}
                                  onChange={(e) => (e.target.value === "__new" ? addPageFor(f.key, o.k) : setOpt(f.key, o.k, { target: e.target.value }))}
                                  aria-label={`「${o.text || `選択肢 ${j + 1}`}」を選んだときの次の動き`}
                                >
                                  {actionOptions(i)}
                                </select>
                              )}
                              <button type="button" className="adm-fb__optdel" onClick={() => update(f.key, { opts: f.opts.filter((x) => x.k !== o.k) })} disabled={f.opts.length <= 1} aria-label="この選択肢を削除" title="削除">
                                <i className="bi bi-x-lg" aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                          {f.other && f.type !== "SELECT" && (
                            <li className="adm-fb__opt is-other">
                              <i className={`bi ${mark} adm-fb__optmark`} aria-hidden="true" />
                              <span className="adm-fb__othertext">
                                その他<small>（選ぶと、回答者が短い文で入力できます）</small>
                              </span>
                              {branchable && f.branchOn && (
                                <select value={f.otherTarget} onChange={(e) => (e.target.value === "__new" ? addPageFor(f.key, OTHER_KEY) : update(f.key, { otherTarget: e.target.value }))} aria-label="「その他」を選んだときの次の動き">
                                  {actionOptions(i)}
                                </select>
                              )}
                              <button type="button" className="adm-fb__optdel" onClick={() => update(f.key, { other: false, otherTarget: "" })} aria-label="「その他」を外す" title="削除">
                                <i className="bi bi-x-lg" aria-hidden="true" />
                              </button>
                            </li>
                          )}
                        </ul>
                        <div className="adm-fb__optadd">
                          <button type="button" onClick={() => addOpt(f.key)}>
                            <i className="bi bi-plus-lg" aria-hidden="true" /> 選択肢を追加
                          </button>
                          {f.type !== "SELECT" && !f.other && (
                            <>
                              <span>または</span>
                              <button type="button" onClick={() => update(f.key, { other: true })}>
                                「その他」を追加
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <label>
                    <span>補足（入力欄の下に小さく出します。任意）</span>
                    <input value={f.help} maxLength={1000} onChange={(e) => update(f.key, { help: e.target.value })} />
                  </label>
                  <div className="adm-fb__row">
                    <label className="adm-fb__check">
                      <input type="checkbox" checked={f.required} onChange={(e) => update(f.key, { required: e.target.checked })} />
                      必須にする
                    </label>
                    {!["FILE", "CONSENT", "MULTI_CHOICE"].includes(f.type) && (nameKey === undefined || nameKey === f.key) && (
                      <label className="adm-fb__map">
                        <span>{auth === "line" ? "求職者の基本情報への反映" : "回答者の名前として使う"}</span>
                        <select value={f.profile_key} onChange={(e) => update(f.key, { profile_key: e.target.value })}>
                          <option value="">{auth === "line" ? "反映しない" : "使わない"}</option>
                          {PROFILE_TARGETS.filter((p) => auth === "line" || p.key === "name").map((p) => (
                            <option key={p.key} value={p.key} disabled={fields.some((x) => x.key !== f.key && x.profile_key === p.key)}>
                              {auth === "line" ? p.label : "回答者の名前"}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </>
              )}
            </li>,
            ];
          })}
          {hasSections && sections.length > 0 && afterSection(sections[sections.length - 1], true)}
        </ol>
        <button type="button" className="adm-fb__addpage" onClick={() => setFields((list) => [...list, blank("SECTION")])}>
          <i className="bi bi-file-earmark-plus" aria-hidden="true" />
          ＋ 次のページを追加
          <small>ここから下の質問が次のページになります</small>
        </button>
        <div className="adm-fb__add">
          <span>質問を追加：</span>
          {FIELD_TYPES.filter((t) => t.key !== "SECTION").map((t) => (
            <button key={t.key} type="button" className="adm-chipbtn" onClick={() => setFields((list) => [...list, blank(t.key)])}>
              <i className={`bi ${t.icon}`} aria-hidden="true" />
              {t.label.replace(/（.*）/, "")}
            </button>
          ))}
        </div>
      </section>

      {auth === "line" && (
        <section className="adm-card">
          <p className="adm-card__en">Actions</p>
          <h2 className="adm-card__title">回答されたときに</h2>
          <p className="adm-card__help">回答した人（LINE の友だち）に、自動でタグを付けたり、ステータスを変えたりします。「フォーム回答時」の自動付与タグも付きます。</p>
          <div className="adm-fb__grid">
            <div className="adm-fb__wide">
              <span className="adm-fb__label">付けるタグ</span>
              {tags.length === 0 ? (
                <p className="adm-muted">
                  タグがまだありません。<Link href="/admin/?tab=linetags">タグ管理</Link>で作れます。
                </p>
              ) : (
                <div className="adm-fb__tags">
                  {tags.map((t) => {
                    const on = tagIds.includes(t.id);
                    return (
                      <button key={t.id} type="button" aria-pressed={on} className={`adm-fb__tag${on ? " is-on" : ""}`} style={{ ["--c" as string]: t.color }} onClick={() => setTagIds((ids) => (on ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}>
                        {on && <i className="bi bi-check-lg" aria-hidden="true" />}
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <label>
              <span>変えるステータス</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">変えない</option>
                {statuses.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <div className="adm-fb__bar">
        {isTemplate ? (
          <span className="adm-fb__url">
            <i className="bi bi-layers" aria-hidden="true" /> テンプレート{tplName ? `「${tplName}」` : ""}
          </span>
        ) : (
          <>
        <button type="button" role="switch" aria-checked={published} className={`adm-switch${published ? " is-on" : ""}`} onClick={() => setPublished(!published)}>
          <span className="adm-switch__knob" />
          <span className="adm-switch__label">{published ? "公開する" : "非公開"}</span>
        </button>
        <span className="adm-fb__url" title={url}>
          {published ? <i className="bi bi-globe2" aria-hidden="true" /> : <i className="bi bi-lock" aria-hidden="true" />} {url}
        </span>
        {initial.id !== null && (
          <a className="adm-chipbtn" href={`/jobs/forms/${initial.slug}/`} target="_blank" rel="noopener">
            <i className="bi bi-eye" aria-hidden="true" />
            {initial.is_published ? "回答ページを開く" : "プレビュー"}
          </a>
        )}
        <button type="button" className="adm-chipbtn" onClick={() => setSaveAs({ name: title, description: purpose, withSheet: !!sheet })}>
          <i className="bi bi-layers" aria-hidden="true" />
          テンプレートとして保存
        </button>
          </>
        )}
        <button type="button" className="adm-chipbtn adm-chipbtn--primary adm-fb__save" onClick={save} disabled={busy}>
          <i className={`bi ${busy ? "bi-hourglass-split" : "bi-check2"}`} aria-hidden="true" />
          {busy ? "保存しています…" : isTemplate ? (template.id === null ? "テンプレートを作成する" : dirty ? "テンプレートを保存する" : "保存済み") : initial.id === null ? "作成する" : dirty ? "保存する" : "保存済み"}
        </button>
        {error && (
          <p className="adm-fb__error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="adm-fb__notice" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" /> {notice}
          </p>
        )}
      </div>
      {saveAs && (
        <div className="adm-dialog" role="dialog" aria-modal="true" aria-label="テンプレートとして保存" onClick={(e) => e.target === e.currentTarget && setSaveAs(null)}>
          <div className="adm-dialog__box">
            <h2>テンプレートとして保存</h2>
            <p className="adm-muted">いま画面に入っている質問と設定を、テンプレートとして取っておきます（URL の名前と公開は入りません）。このフォーム自体は保存されないので、フォームの変更は「保存する」で保存してください。</p>
            <label>
              テンプレートの名前
              <input autoFocus value={saveAs.name} maxLength={100} onChange={(e) => setSaveAs({ ...saveAs, name: e.target.value })} />
            </label>
            <label>
              説明（任意）
              <input value={saveAs.description} maxLength={500} onChange={(e) => setSaveAs({ ...saveAs, description: e.target.value })} />
            </label>
            {sheet && (
              <label className="adm-dialog__check">
                <input type="checkbox" checked={saveAs.withSheet} onChange={(e) => setSaveAs({ ...saveAs, withSheet: e.target.checked })} />
                スプレッドシート連携の設定も含める（{sheetText(sheet)}）
              </label>
            )}
            {saveAsError && <small className="adm-crm-error">{saveAsError}</small>}
            <div className="adm-dialog__foot">
              <button type="button" className="adm-chipbtn" onClick={() => setSaveAs(null)}>
                やめる
              </button>
              <button type="button" className="adm-chipbtn adm-chipbtn--primary" onClick={saveAsTemplate} disabled={saveAsBusy}>
                <i className="bi bi-layers" aria-hidden="true" />
                {saveAsBusy ? "保存しています…" : "テンプレートとして保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteTemplateButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="adm-linkbtn is-danger"
        onClick={async () => {
          if (!window.confirm(`テンプレート「${name}」を削除します。これから作ったフォームはそのまま残ります。よろしいですか？`)) return;
          const r = await send(`/api/admin/form-templates/${id}/`, "DELETE");
          if (!r.ok) return setError(r.message ?? "");
          router.refresh();
        }}
      >
        削除
      </button>
      {error && <small className="adm-crm-error">{error}</small>}
    </>
  );
}
