"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { colIndex, colLetter, defaultColumns, isColumn, sourceChoices, sourceLabel, type SheetColumn, type SheetField } from "@/lib/sheet-columns";

// フォームの「スプレッドシート連携」の画面（Google との連携・書き込み先・どの列に何を入れるか・書き込み状況）。仕組みは lib/admin/sheets.ts

type Link = { spreadsheet_id: string; spreadsheet_title: string | null; sheet_name: string; header_row: number; columns: SheetColumn[]; enabled: boolean; last_synced: string | null; last_error: string | null };

async function post(formId: number, body: Record<string, unknown>) {
  try {
    const res = await fetch(`/api/admin/forms/${formId}/sheet/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as ({ ok?: boolean; message?: string } & Record<string, unknown>) | null;
    return res.ok && data?.ok ? { ok: true as const, data } : { ok: false as const, message: data?.message ?? "うまくいきませんでした。" };
  } catch {
    return { ok: false as const, message: "通信に失敗しました。" };
  }
}

const FLASH: Record<string, [boolean, string]> = {
  ok: [true, "Google と連携しました。"],
  cancelled: [false, "Google との連携をやめました（ログイン画面で取り消されました）。"],
  expired: [false, "時間がたったため、連携できませんでした。もう一度「Google と連携」を押してください。"],
  no_scope: [false, "スプレッドシートの権限が許可されませんでした。もう一度連携し、すべての項目にチェックを入れてください。"],
  failed: [false, "Google との連携に失敗しました。時間をおいてもう一度お試しください。"],
  forbidden: [false, "Google との連携は、特級の管理者だけができます。"],
  not_configured: [false, "Google との連携の設定（環境変数）がまだされていません。"],
};

export function SheetPanel({
  formId,
  formTitle,
  fields,
  link,
  account,
  configured,
  canConnect,
  pending,
  flash,
}: {
  formId: number;
  formTitle: string;
  fields: SheetField[];
  link: Link | null;
  account: { email: string | null; connected: string; by: string | null } | null;
  configured: boolean;
  canConnect: boolean;
  pending: number;
  flash?: string;
}) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const connectHref = `/api/admin/google/connect/?back=${encodeURIComponent(`/admin/forms/${formId}/sheet/`)}`;
  const f = flash ? FLASH[flash] : undefined;
  return (
    <div className="adm-stack adm-sheet">
      {f && (
        <p className={`adm-alert adm-flash ${f[0] ? "is-ok" : "is-ng"}`} role="status">
          <i className={`bi ${f[0] ? "bi-check-circle-fill" : "bi-exclamation-octagon"}`} aria-hidden="true" />
          <span>{f[1]}</span>
        </p>
      )}

      <section className="adm-card">
        <p className="adm-card__en">Google</p>
        <h2 className="adm-card__title">Google アカウント</h2>
        {!configured ? (
          <p className="adm-alert is-warn">
            <i className="bi bi-gear" aria-hidden="true" />
            <span>
              Google と連携するための設定がまだです。Google Cloud で「OAuth クライアント ID」を作り、Amplify の環境変数 <code>GOOGLE_OAUTH_CLIENT_ID</code>・<code>GOOGLE_OAUTH_CLIENT_SECRET</code> を設定してください。
            </span>
          </p>
        ) : account ? (
          <div className="adm-sheet__account">
            <span className="adm-sheet__gicon" aria-hidden="true">
              <i className="bi bi-google" />
            </span>
            <span>
              <strong>{account.email ?? "（メールアドレス不明）"}</strong>
              <small>
                連携中（{account.connected}
                {account.by ? `・${account.by}` : ""}）。書き込みは、このアカウントの権限で行います。
              </small>
            </span>
            {canConnect && (
              <span className="adm-forms__btns">
                <a className="adm-chipbtn" href={connectHref}>
                  連携し直す
                </a>
                <DisconnectButton />
              </span>
            )}
          </div>
        ) : (
          <div className="adm-sheet__account">
            <span className="adm-sheet__gicon is-off" aria-hidden="true">
              <i className="bi bi-google" />
            </span>
            <span>
              <strong>まだ連携していません</strong>
              <small>会社の Google アカウントで一度連携すると、どのフォームの回答もスプレッドシートに書き込めます。</small>
            </span>
            {canConnect ? (
              <a className="adm-chipbtn adm-chipbtn--primary" href={connectHref}>
                <i className="bi bi-google" aria-hidden="true" /> Google と連携
              </a>
            ) : (
              <small className="adm-muted">連携は特級の管理者が行います。</small>
            )}
          </div>
        )}
      </section>

      {account && (!link || changing) && <TargetPicker formId={formId} formTitle={formTitle} hasLink={!!link} onCancel={link ? () => setChanging(false) : undefined} onDone={() => (setChanging(false), router.refresh())} />}

      {link && !changing && (
        <>
          <section className="adm-card">
            <p className="adm-card__en">Spreadsheet</p>
            <h2 className="adm-card__title">書き込み先</h2>
            <div className="adm-sheet__target">
              <span className="adm-sheet__sicon" aria-hidden="true">
                <i className="bi bi-file-earmark-spreadsheet" />
              </span>
              <span>
                <a href={`https://docs.google.com/spreadsheets/d/${link.spreadsheet_id}/edit`} target="_blank" rel="noopener">
                  {link.spreadsheet_title ?? "スプレッドシート"} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
                <small>シート「{link.sheet_name}」</small>
              </span>
              {account && (
                <span className="adm-forms__btns">
                  <button type="button" className="adm-chipbtn" onClick={() => setChanging(true)}>
                    書き込み先を変える
                  </button>
                  <UnlinkButton formId={formId} />
                </span>
              )}
            </div>
          </section>
          <ColumnsEditor formId={formId} fields={fields} link={link} />
          <section className="adm-card">
            <p className="adm-card__en">Status</p>
            <h2 className="adm-card__title">書き込み状況</h2>
            <dl className="adm-sheet__status">
              <div>
                <dt>最後に書き込んだ日時</dt>
                <dd>{link.last_synced ?? "まだ書き込んでいません"}</dd>
              </div>
              <div>
                <dt>まだ書き込んでいない回答</dt>
                <dd>{pending}件</dd>
              </div>
            </dl>
            {link.last_error && (
              <p className="adm-alert is-ng">
                <i className="bi bi-exclamation-octagon" aria-hidden="true" />
                <span>
                  最後の書き込みに失敗しました：{link.last_error}
                  <small>原因を直してから「未送信の回答を書き込む」を押すと、まとめて書き込めます。</small>
                </span>
              </p>
            )}
            <p className="adm-card__help">
              新しい回答は、回答されたときに自動で書き込みます。連携する前の回答や、失敗した回答は、下のボタンでまとめて書き込めます（回答された順に、いちばん下の空いている行から）。
            </p>
            <SyncButton formId={formId} pending={pending} disabled={!account} />
          </section>
        </>
      )}
    </div>
  );
}

function DisconnectButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="adm-chipbtn is-danger"
      onClick={async () => {
        if (!window.confirm("Google との連携を外します。外すと、どのフォームもスプレッドシートに書き込めなくなります。よろしいですか？")) return;
        await fetch("/api/admin/google/disconnect/", { method: "POST" });
        router.refresh();
      }}
    >
      連携を外す
    </button>
  );
}

function UnlinkButton({ formId }: { formId: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="adm-linkbtn is-danger"
      onClick={async () => {
        if (!window.confirm("このフォームのスプレッドシート連携をやめます（スプレッドシートと、書き込んだ内容はそのまま残ります）。よろしいですか？")) return;
        await post(formId, { action: "unlink" });
        router.refresh();
      }}
    >
      連携をやめる
    </button>
  );
}

function SyncButton({ formId, pending, disabled }: { formId: number; pending: number; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<[boolean, string] | null>(null);
  return (
    <div className="adm-sheet__sync">
      <button
        type="button"
        className="adm-chipbtn adm-chipbtn--primary"
        disabled={busy || disabled || pending === 0}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const r = await post(formId, { action: "sync" });
          setBusy(false);
          setMsg(r.ok ? [true, `${r.data.written}件を書き込みました。`] : [false, r.message]);
          router.refresh();
        }}
      >
        <i className={`bi ${busy ? "bi-hourglass-split" : "bi-cloud-upload"}`} aria-hidden="true" />
        {busy ? "書き込んでいます…" : `未送信の回答を書き込む（${pending}件）`}
      </button>
      {msg && <small className={msg[0] ? "adm-sheet__ok" : "adm-crm-error"}>{msg[1]}</small>}
    </div>
  );
}

// 書き込み先を決める：新しく作る／既存のスプレッドシート
function TargetPicker({ formId, formTitle, hasLink, onCancel, onDone }: { formId: number; formTitle: string; hasLink: boolean; onCancel?: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [title, setTitle] = useState(`${formTitle}（回答）`);
  const [sheetName, setSheetName] = useState("回答");
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<{ title: string; tabs: string[] } | null>(null);
  const [tab, setTab] = useState("");
  const [newTab, setNewTab] = useState("回答");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    const r = await post(formId, body);
    setBusy(false);
    if (!r.ok) return setError(r.message), null;
    return r.data;
  };
  return (
    <section className="adm-card">
      <p className="adm-card__en">Spreadsheet</p>
      <h2 className="adm-card__title">{hasLink ? "書き込み先を変える" : "書き込み先のスプレッドシート"}</h2>
      <div className="adm-fb__modes" role="radiogroup" aria-label="書き込み先">
        <button type="button" role="radio" aria-checked={mode === "new"} className={`adm-fb__mode${mode === "new" ? " is-on" : ""}`} onClick={() => setMode("new")}>
          <i className="bi bi-file-earmark-plus" aria-hidden="true" />
          <strong>新しく作る</strong>
          <small>連携した Google アカウントのドライブに、新しいスプレッドシートを作ります。質問を順に並べた列と見出しも入れておきます。</small>
        </button>
        <button type="button" role="radio" aria-checked={mode === "existing"} className={`adm-fb__mode${mode === "existing" ? " is-on" : ""}`} onClick={() => setMode("existing")}>
          <i className="bi bi-link-45deg" aria-hidden="true" />
          <strong>既存のスプレッドシートに連携</strong>
          <small>URL を貼り付けて、書き込むシートを選びます（連携した Google アカウントが編集できるシート）。</small>
        </button>
      </div>
      {mode === "new" ? (
        <div className="adm-fb adm-fb__grid">
          <label>
            <span>スプレッドシートの名前</span>
            <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            <span>シートの名前</span>
            <input value={sheetName} maxLength={100} onChange={(e) => setSheetName(e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="adm-fb adm-sheet__existing">
          <label>
            <span>スプレッドシートの URL</span>
            <span className="adm-sheet__urlrow">
              <input value={url} onChange={(e) => (setUrl(e.target.value), setInfo(null))} placeholder="https://docs.google.com/spreadsheets/d/…/edit" />
              <button
                type="button"
                className="adm-chipbtn"
                disabled={busy || !url.trim()}
                onClick={async () => {
                  const d = await run({ action: "inspect", url });
                  if (d) {
                    setInfo({ title: String(d.title), tabs: d.tabs as string[] });
                    setTab((d.tabs as string[])[0] ?? "__new");
                  }
                }}
              >
                {busy && !info ? "調べています…" : "調べる"}
              </button>
            </span>
          </label>
          {info && (
            <div className="adm-sheet__found">
              <p>
                <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" /> <strong>{info.title}</strong>
              </p>
              <label>
                <span>書き込むシート</span>
                <select value={tab} onChange={(e) => setTab(e.target.value)}>
                  {info.tabs.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__new">＋ 新しいシートを追加する</option>
                </select>
              </label>
              {tab === "__new" && (
                <label>
                  <span>新しいシートの名前</span>
                  <input value={newTab} maxLength={100} onChange={(e) => setNewTab(e.target.value)} />
                </label>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="adm-alert is-ng">
          <i className="bi bi-exclamation-octagon" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      <div className="adm-sheet__actions">
        {onCancel && (
          <button type="button" className="adm-chipbtn" onClick={onCancel}>
            やめる
          </button>
        )}
        <button
          type="button"
          className="adm-chipbtn adm-chipbtn--primary"
          disabled={busy || (mode === "existing" && !info)}
          onClick={async () => {
            const d =
              mode === "new"
                ? await run({ action: "create", title, sheet_name: sheetName })
                : await run({ action: "link", url, sheet_name: tab === "__new" ? newTab : tab, new_tab: tab === "__new" });
            if (d) onDone();
          }}
        >
          <i className={`bi ${busy ? "bi-hourglass-split" : "bi-check2"}`} aria-hidden="true" />
          {busy ? "処理しています…" : mode === "new" ? "スプレッドシートを作って連携" : "このシートに連携"}
        </button>
      </div>
    </section>
  );
}

// どの列に何を入れるか
type Row = SheetColumn & { k: string };
let seq = 0;
const rowKey = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

function ColumnsEditor({ formId, fields, link }: { formId: number; fields: SheetField[]; link: Link }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => link.columns.map((c) => ({ ...c, k: rowKey() })));
  const [headerRow, setHeaderRow] = useState(String(link.header_row));
  const [enabled, setEnabled] = useState(link.enabled);
  const [busy, setBusy] = useState<"" | "save" | "header">("");
  const [msg, setMsg] = useState<[boolean, string] | null>(null);
  const choices = useMemo(() => sourceChoices(fields), [fields]);
  const snapshot = JSON.stringify({ rows: rows.map(({ k: _k, ...c }) => (void _k, c)), headerRow, enabled });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  const set = (k: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.k === k ? { ...r, ...patch } : r)));
  const sorted = [...rows].filter((r) => isColumn(r.col)).sort((a, b) => colIndex(a.col) - colIndex(b.col));
  const dup = new Set(rows.map((r) => r.col.toUpperCase()).filter((c, i, a) => a.indexOf(c) !== i));

  async function save(): Promise<boolean> {
    setBusy("save");
    setMsg(null);
    const r = await post(formId, { action: "settings", header_row: Number(headerRow), enabled, columns: rows.map(({ k: _k, ...c }) => (void _k, { ...c, col: c.col.toUpperCase() })) });
    setBusy("");
    if (!r.ok) return setMsg([false, r.message]), false;
    setSaved(snapshot);
    setMsg([true, "保存しました。"]);
    router.refresh();
    return true;
  }

  return (
    <section className="adm-card">
      <p className="adm-card__en">Columns</p>
      <h2 className="adm-card__title">どの列に何を入れるか</h2>
      <p className="adm-card__help">
        回答があるたびに、ここで決めた列だけを「いちばん下の空いている行」に書き込みます。決めていない列（式や手書きのメモなど）には触れません。回答の文字は、式として動かないよう、そのままの文字で入れます。
      </p>
      <div className="adm-sheet__opts">
        <label>
          <span>見出しの行</span>
          <input type="number" min={0} max={1000} value={headerRow} onChange={(e) => setHeaderRow(e.target.value)} />
          <small>0 にすると見出しなし（1行目から書きます）</small>
        </label>
        <button type="button" role="switch" aria-checked={enabled} className={`adm-switch${enabled ? " is-on" : ""}`} onClick={() => setEnabled(!enabled)}>
          <span className="adm-switch__knob" />
          <span className="adm-switch__label">{enabled ? "回答があったら書き込む" : "書き込みを止めている"}</span>
        </button>
      </div>

      {/* できあがりの見本（列の順に並べる） */}
      {sorted.length > 0 && (
        <div className="adm-sheet__preview" aria-label="見本">
          <table>
            <thead>
              <tr>
                <th />
                {sorted.map((r) => (
                  <th key={r.k}>{r.col.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Number(headerRow) > 0 && (
                <tr>
                  <th>{headerRow}</th>
                  {sorted.map((r) => (
                    <td key={r.k} className="is-head">
                      {sourceLabel(r, fields)}
                    </td>
                  ))}
                </tr>
              )}
              <tr>
                <th>{Number(headerRow) + 1}〜</th>
                {sorted.map((r) => (
                  <td key={r.k}>{r.source === "const" ? r.text || "－" : r.source.startsWith("opt:") ? r.text || "○" : "（回答）"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ul className="adm-sheet__cols">
        {rows.map((r, i) => (
          <li key={r.k} className={dup.has(r.col.toUpperCase()) || !isColumn(r.col) ? "is-ng" : undefined}>
            <label className="adm-sheet__col">
              <span>列</span>
              <input value={r.col} maxLength={3} onChange={(e) => set(r.k, { col: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} aria-label="列" />
            </label>
            <label className="adm-sheet__src">
              <span>入れる内容</span>
              <select value={r.source} onChange={(e) => set(r.k, { source: e.target.value, mode: e.target.value === "submitted_at" || e.target.value === "submitted_date" ? "auto" : r.mode })}>
                {!choices.some((g) => g.items.some((x) => x.value === r.source)) && <option value={r.source}>（削除した質問）</option>}
                {choices.map((g) =>
                  g.items.length === 0 ? null : (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
              </select>
            </label>
            {(r.source === "const" || r.source.startsWith("opt:")) && (
              <label className="adm-sheet__text">
                <span>{r.source === "const" ? "入れる文字" : "選んでいたら入れる文字"}</span>
                <input value={r.text ?? ""} maxLength={500} placeholder={r.source === "const" ? "例：ホームページ" : "○"} onChange={(e) => set(r.k, { text: e.target.value })} />
              </label>
            )}
            <label className="adm-sheet__mode">
              <span>入れ方</span>
              <select value={r.mode ?? "text"} onChange={(e) => set(r.k, { mode: e.target.value === "auto" ? "auto" : "text" })}>
                <option value="text">文字のまま</option>
                <option value="auto">数値・日付として</option>
              </select>
            </label>
            <span className="adm-fb__tools">
              <button type="button" onClick={() => setRows((l) => (i === 0 ? l : [...l.slice(0, i - 1), l[i], l[i - 1], ...l.slice(i + 1)]))} disabled={i === 0} aria-label="上へ" title="上へ">
                <i className="bi bi-arrow-up" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setRows((l) => (i === l.length - 1 ? l : [...l.slice(0, i), l[i + 1], l[i], ...l.slice(i + 2)]))} disabled={i === rows.length - 1} aria-label="下へ" title="下へ">
                <i className="bi bi-arrow-down" aria-hidden="true" />
              </button>
              <button type="button" className="is-danger" onClick={() => setRows((l) => l.filter((x) => x.k !== r.k))} aria-label="この列を削除" title="削除">
                <i className="bi bi-trash3" aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {dup.size > 0 && <p className="adm-crm-error">同じ列が2回設定されています（{[...dup].join("・")}列）。</p>}
      <div className="adm-sheet__colbtns">
        <button
          type="button"
          className="adm-chipbtn"
          onClick={() => {
            const max = rows.reduce((m, r) => (isColumn(r.col) ? Math.max(m, colIndex(r.col)) : m), 0);
            setRows((l) => [...l, { k: rowKey(), col: colLetter(max + 1), source: "submitted_at", mode: "auto" }]);
          }}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> 列を追加
        </button>
        <button
          type="button"
          className="adm-chipbtn"
          onClick={() => {
            if (rows.length > 0 && !window.confirm("いまの設定を消して、A 回答日時・B 回答者名・C から質問の順、に並べ直します。よろしいですか？")) return;
            setRows(defaultColumns(fields).map((c) => ({ ...c, k: rowKey() })));
          }}
        >
          <i className="bi bi-magic" aria-hidden="true" /> 質問を全部並べる
        </button>
      </div>
      <div className="adm-sheet__actions">
        {msg && <small className={msg[0] ? "adm-sheet__ok" : "adm-crm-error"}>{msg[1]}</small>}
        <button
          type="button"
          className="adm-chipbtn"
          disabled={busy !== "" || Number(headerRow) === 0}
          title="見出しの行に、各列の名前を書き込みます（上書きします）"
          onClick={async () => {
            if (dirty && !(await save())) return;
            setBusy("header");
            const r = await post(formId, { action: "header" });
            setBusy("");
            setMsg(r.ok ? [true, "見出しを書き込みました。"] : [false, r.message]);
          }}
        >
          <i className="bi bi-type" aria-hidden="true" /> {busy === "header" ? "書き込んでいます…" : "見出しを書き込む"}
        </button>
        <button type="button" className="adm-chipbtn adm-chipbtn--primary" disabled={busy !== "" || dup.size > 0 || !dirty} onClick={save}>
          <i className={`bi ${busy === "save" ? "bi-hourglass-split" : "bi-check2"}`} aria-hidden="true" />
          {busy === "save" ? "保存しています…" : dirty ? "設定を保存" : "保存済み"}
        </button>
      </div>
    </section>
  );
}
