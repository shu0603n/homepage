import Link from "next/link";
import { CopyUrlButton, DeleteFormButton, DeleteSubmissionButton, DeleteTemplateButton, PublishToggle, QrButton } from "@/components/admin/FormsClient";
import { authModeLabel, type FormDetail, type FormRow, type SubmissionRow, type TemplateRow } from "@/lib/admin/forms";
import { answerText, CHOICE_TYPES, FIELD_TYPE_LABEL } from "@/lib/forms-def";
import { SITE } from "@/lib/site";

// フォーム管理の画面（一覧・回答一覧・グラフ・回答の詳細）

export const formUrl = (slug: string) => `${SITE.siteUrl}/jobs/forms/${slug}/`;
const dateTime = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) : "－";

function ModePill({ mode }: { mode: string }) {
  return (
    <span className={`adm-pill adm-pill--${mode === "line" ? "line" : "open"}`}>
      <i className={`bi ${mode === "line" ? "bi-line" : "bi-globe2"}`} aria-hidden="true" /> {authModeLabel(mode)}
    </span>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="adm-lineav" style={{ width: 32, height: 32, fontSize: 13 }} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : name.replace(/[（(].*/, "").trim().slice(0, 1) || "?"}
    </span>
  );
}

// ---------- 一覧 ----------

export function FormsListPanel({ forms, templates }: { forms: FormRow[] | null; templates: TemplateRow[] }) {
  if (!forms) return <p className="adm-alert is-ng">フォームの一覧を読み込めませんでした。時間をおいて開き直してください。</p>;
  return (
    <div className="adm-stack">
      <div className="adm-crm-bar">
        <p className="adm-muted">作ったフォームは、ホームページに回答ページ（URL）ができます。LINE で送ったり、QR コードを配ったりして回答を集め、誰がどう答えたかをここで確かめられます。</p>
        <Link href="/admin/forms/new/" className="adm-chipbtn adm-chipbtn--primary">
          <i className="bi bi-plus-lg" aria-hidden="true" />
          新しいフォームを作る
        </Link>
      </div>
      {forms.length === 0 ? (
        <div className="adm-empty adm-empty--big">
          <i className="bi bi-ui-checks" aria-hidden="true" />
          フォームはまだありません。「新しいフォームを作る」から始めましょう。
        </div>
      ) : null}
      {forms.length > 0 && (
        <ul className="adm-forms">
          {forms.map((f, i) => (
            <li key={f.id} className={`adm-forms__item${f.is_published ? "" : " is-off"}`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <div className="adm-forms__main">
                <h3>
                  <Link href={`/admin/forms/${f.id}/`}>{f.title}</Link>
                </h3>
                {f.purpose && <p className="adm-forms__purpose">{f.purpose}</p>}
                <p className="adm-forms__meta">
                  <ModePill mode={f.auth_mode} />
                  <span className="adm-forms__url">/jobs/forms/{f.slug}/</span>
                </p>
              </div>
              <Link href={`/admin/forms/${f.id}/answers/`} className="adm-forms__count" title="回答を見る">
                <strong>{f.count.toLocaleString("ja-JP")}</strong>
                <span>件の回答</span>
                <small>{f.last_at ? `最新 ${dateTime(f.last_at)}` : "まだ回答なし"}</small>
              </Link>
              <div className="adm-forms__ops">
                <PublishToggle id={f.id} published={f.is_published} />
                <div className="adm-forms__btns">
                  <CopyUrlButton url={formUrl(f.slug)} />
                  <QrButton url={formUrl(f.slug)} name={f.title} />
                  <a className="adm-chipbtn" href={`/jobs/forms/${f.slug}/`} target="_blank" rel="noopener">
                    <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    {f.is_published ? "開く" : "プレビュー"}
                  </a>
                </div>
                <div className="adm-forms__btns">
                  <Link href={`/admin/forms/${f.id}/answers/`} className="adm-linkbtn">
                    回答を見る
                  </Link>
                  <Link href={`/admin/forms/${f.id}/`} className="adm-linkbtn">
                    編集
                  </Link>
                  <DeleteFormButton id={f.id} title={f.title} answers={f.count} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TemplatesSection templates={templates} />
    </div>
  );
}

// ---------- 回答（一覧・グラフ） ----------

const PAGE = 50;

// 直近 days 日間の回答の数
function countSince(subs: SubmissionRow[], days: number) {
  const from = Date.now() - days * 864e5;
  return subs.filter((s) => s.submitted_at.getTime() > from).length;
}

export function FormHead({ form, count, current }: { form: FormDetail; count: number; current: "edit" | "answers" }) {
  return (
    <section className="adm-card adm-formhead">
      <div className="adm-formhead__who">
        <p className="adm-crm-back">
          <Link href="/admin/?tab=forms">
            <i className="bi bi-chevron-left" aria-hidden="true" />
            フォームの一覧へ
          </Link>
        </p>
        <h2>{form.title}</h2>
        <p className="adm-forms__meta">
          <ModePill mode={form.auth_mode} />
          <span className={`adm-pill ${form.is_published ? "is-on" : ""}`}>{form.is_published ? "公開中" : "非公開"}</span>
          <span className="adm-forms__url">{formUrl(form.slug)}</span>
        </p>
      </div>
      <div className="adm-formhead__ops">
        <CopyUrlButton url={formUrl(form.slug)} />
        <QrButton url={formUrl(form.slug)} name={form.title} />
        <nav className="adm-filters" aria-label="表示の切り替え">
          <Link href={`/admin/forms/${form.id}/`} className={`adm-filter${current === "edit" ? " is-active" : ""}`}>
            <i className="bi bi-pencil-square" aria-hidden="true" /> 編集
          </Link>
          <Link href={`/admin/forms/${form.id}/answers/`} className={`adm-filter${current === "answers" ? " is-active" : ""}`}>
            <i className="bi bi-inboxes" aria-hidden="true" /> 回答 {count}件
          </Link>
        </nav>
      </div>
    </section>
  );
}

const shownFields = (form: FormDetail, subs: SubmissionRow[]) =>
  form.fields.filter((f) => f.type !== "DESCRIPTION" && (!f.deleted || subs.some((s) => s.answers.has(f.id) || s.files.some((x) => x.field_id === f.id))));

function AnswerCell({ s, f }: { s: SubmissionRow; f: FormDetail["fields"][number] }) {
  if (f.type === "FILE") {
    const files = s.files.filter((x) => x.field_id === f.id);
    if (files.length === 0) return <span className="adm-muted">－</span>;
    return (
      <>
        {files.map((x) => (
          <a key={x.id} href={`/api/admin/forms/files/${x.id}/`} target="_blank" rel="noopener" className="adm-fileln">
            <i className="bi bi-paperclip" aria-hidden="true" />
            {x.file_name}
          </a>
        ))}
      </>
    );
  }
  const a = s.answers.get(f.id);
  const text = a ? answerText(f.type, a.text, a.json) : "";
  return text ? <>{text}</> : <span className="adm-muted">－</span>;
}

function Who({ s }: { s: SubmissionRow }) {
  const inner = (
    <>
      <Avatar url={s.picture_url} name={s.who} />
      <span>
        <strong>{s.who}</strong>
        {s.line_user_id ? <small className="adm-line__staff">LINE</small> : s.staff_id !== null ? <small className="adm-line__staff">スタッフ ID {s.staff_id}</small> : null}
      </span>
    </>
  );
  return s.line_user_id && s.is_friend_row ? (
    <Link href={`/admin/friends/${s.line_user_id}/`} className="adm-crm-who" title="友だち・求職者の詳細を開く">
      {inner}
    </Link>
  ) : (
    <span className="adm-crm-who">{inner}</span>
  );
}

export function FormAnswersPanel({ form, subs, view, page: pageParam }: { form: FormDetail; subs: SubmissionRow[]; view: "list" | "chart"; page?: string }) {
  const fields = shownFields(form, subs);
  const week = countSince(subs, 7);
  const people = new Set(subs.map((s) => s.line_user_id ?? `s${s.id}`)).size;
  const page = Math.max(1, Number(pageParam) || 1);
  const pages = Math.max(1, Math.ceil(subs.length / PAGE));
  const shown = subs.slice((page - 1) * PAGE, page * PAGE);
  return (
    <div className="adm-stack">
      <FormHead form={form} count={subs.length} current="answers" />
      <div className="adm-kpis adm-kpis--3">
        <div className="adm-kpi">
          <p className="adm-kpi__label">回答の数</p>
          <p className="adm-kpi__value">
            {subs.length.toLocaleString("ja-JP")}
            <small>件</small>
          </p>
        </div>
        <div className="adm-kpi">
          <p className="adm-kpi__label">直近7日間</p>
          <p className="adm-kpi__value">
            {week.toLocaleString("ja-JP")}
            <small>件</small>
          </p>
        </div>
        <div className="adm-kpi">
          <p className="adm-kpi__label">{form.auth_mode === "line" ? "回答した人（LINE）" : "最新の回答"}</p>
          <p className="adm-kpi__value">
            {form.auth_mode === "line" ? (
              <>
                {people.toLocaleString("ja-JP")}
                <small>人</small>
              </>
            ) : (
              <small className="adm-kpi__date">{dateTime(subs[0]?.submitted_at ?? null)}</small>
            )}
          </p>
        </div>
      </div>
      <div className="adm-crm-bar">
        <nav className="adm-filters" aria-label="表示の切り替え">
          <Link href={`/admin/forms/${form.id}/answers/`} className={`adm-filter${view === "list" ? " is-active" : ""}`} scroll={false}>
            <i className="bi bi-table" aria-hidden="true" /> 回答一覧
          </Link>
          <Link href={`/admin/forms/${form.id}/answers/?view=chart`} className={`adm-filter${view === "chart" ? " is-active" : ""}`} scroll={false}>
            <i className="bi bi-bar-chart" aria-hidden="true" /> グラフ
          </Link>
        </nav>
        {subs.length > 0 && (
          <a className="adm-chipbtn" href={`/api/admin/forms/${form.id}/csv/`}>
            <i className="bi bi-download" aria-hidden="true" />
            CSV ダウンロード
          </a>
        )}
      </div>
      {subs.length === 0 ? (
        <div className="adm-empty adm-empty--big">
          <i className="bi bi-inbox" aria-hidden="true" />
          まだ回答がありません。{form.is_published ? "URL や QR コードを配って、回答を集めましょう。" : "フォームを「公開」にすると、回答を受け付けます。"}
        </div>
      ) : view === "chart" ? (
        <ChartView fields={fields} subs={subs} />
      ) : (
        <>
          <div className="adm-tablewrap adm-ans-wrap">
            <table className="adm-table adm-ans-table">
              <thead>
                <tr>
                  <th>回答日時</th>
                  <th>回答者</th>
                  {fields.map((f) => (
                    <th key={f.id} title={f.label}>
                      {f.label}
                      {f.deleted && <small>（削除した質問）</small>}
                    </th>
                  ))}
                  <th aria-label="詳細" />
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td data-label="回答日時" className="adm-ans-date">
                      {dateTime(s.submitted_at)}
                    </td>
                    <td data-label="回答者">
                      <Who s={s} />
                    </td>
                    {fields.map((f) => (
                      <td key={f.id} data-label={f.label} className="adm-ans-cell">
                        <AnswerCell s={s} f={f} />
                      </td>
                    ))}
                    <td className="adm-ans-open">
                      <Link href={`/admin/forms/${form.id}/answers/${s.id}/`} className="adm-linkbtn">
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav className="adm-pager" aria-label="ページ">
              {page > 1 && <Link href={`/admin/forms/${form.id}/answers/?page=${page - 1}`}>‹ 前へ</Link>}
              <span>
                {page} / {pages}
              </span>
              {page < pages && <Link href={`/admin/forms/${form.id}/answers/?page=${page + 1}`}>次へ ›</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

// 選択式の質問ごとに、選ばれた数を横棒で出す（割合は、その質問に答えた人数に対して）
function ChartView({ fields, subs }: { fields: FormDetail["fields"]; subs: SubmissionRow[] }) {
  const charts = fields.filter((f) => CHOICE_TYPES.includes(f.type) || f.type === "CONSENT");
  if (charts.length === 0)
    return <p className="adm-empty">選択式（単一選択・複数選択・プルダウン・同意チェック）の質問がないため、グラフにできる項目がありません。「回答一覧」をご覧ください。</p>;
  return (
    <div className="adm-charts">
      {charts.map((f) => {
        const counts = new Map<string, number>((f.type === "CONSENT" ? ["同意する"] : f.options).map((o) => [o, 0]));
        let n = 0;
        for (const s of subs) {
          const a = s.answers.get(f.id);
          if (!a) continue;
          const values = Array.isArray(a.json) ? (a.json as string[]) : a.text ? [f.type === "CONSENT" ? (a.text === "true" ? "同意する" : "同意しない") : a.text] : [];
          if (values.length === 0) continue;
          n++;
          for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        const max = Math.max(1, ...counts.values());
        return (
          <section key={f.id} className="adm-card adm-chart">
            <h3>
              {f.label}
              {f.deleted && <small>（削除した質問）</small>}
            </h3>
            <p className="adm-chart__meta">
              {FIELD_TYPE_LABEL[f.type]}・回答 {n}件
            </p>
            <ul>
              {[...counts.entries()].map(([option, count], i) => {
                const pct = n > 0 ? Math.round((count / n) * 100) : 0;
                return (
                  <li key={option} title={`${option}：${count}件（${pct}%）`}>
                    <span className="adm-chart__label">{option}</span>
                    <span className="adm-chart__num">
                      {count}件<small>{pct}%</small>
                    </span>
                    <span className="adm-chart__bar">
                      <span style={{ width: `${(count / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ---------- 回答の詳細 ----------

export function SubmissionDetailPanel({ form, s }: { form: FormDetail; s: SubmissionRow }) {
  const fields = form.fields.filter((f) => !f.deleted || s.answers.has(f.id) || s.files.some((x) => x.field_id === f.id));
  return (
    <div className="adm-stack">
      <p className="adm-crm-back">
        <Link href={`/admin/forms/${form.id}/answers/`}>
          <i className="bi bi-chevron-left" aria-hidden="true" />
          「{form.title}」の回答一覧へ
        </Link>
      </p>
      <section className="adm-card adm-ansdetail__head">
        <Who s={s} />
        <p className="adm-muted">{dateTime(s.submitted_at)} に回答</p>
        <div className="adm-forms__btns">
          {s.line_user_id && s.is_friend_row && (
            <>
              <Link href={`/admin/friends/${s.line_user_id}/`} className="adm-chipbtn">
                <i className="bi bi-person-lines-fill" aria-hidden="true" />
                求職者の詳細
              </Link>
              <Link href={`/admin/chats/${s.line_user_id}/`} className="adm-chipbtn">
                <i className="bi bi-chat-dots" aria-hidden="true" />
                個別チャット
              </Link>
            </>
          )}
          <DeleteSubmissionButton id={s.id} formId={form.id} />
        </div>
      </section>
      <section className="adm-card">
        <dl className="adm-ansdetail">
          {fields.map((f) =>
            f.type === "DESCRIPTION" ? null : (
              <div key={f.id}>
                <dt>
                  {f.label}
                  {f.deleted && <small>（削除した質問）</small>}
                </dt>
                <dd>
                  {f.type === "FILE" ? (
                    s.files.filter((x) => x.field_id === f.id).length === 0 ? (
                      <span className="adm-muted">－</span>
                    ) : (
                      s.files
                        .filter((x) => x.field_id === f.id)
                        .map((x) => (
                          <a key={x.id} href={`/api/admin/forms/files/${x.id}/`} target="_blank" rel="noopener" className="adm-fileln">
                            <i className="bi bi-paperclip" aria-hidden="true" />
                            {x.file_name}
                            <small>{Math.max(1, Math.round(x.size / 1024))}KB</small>
                          </a>
                        ))
                    )
                  ) : (
                    <AnswerCell s={s} f={f} />
                  )}
                </dd>
              </div>
            ),
          )}
        </dl>
      </section>
    </div>
  );
}

// ---------- テンプレート ----------

const dayOf = (d: Date) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(d);
const questionCount = (t: TemplateRow) => (t.data.fields ?? []).filter((f) => f.type !== "DESCRIPTION").length;

// フォームの一覧の下：テンプレートの一覧（作る・直す・消す）
function TemplatesSection({ templates }: { templates: TemplateRow[] }) {
  return (
    <section className="adm-card adm-tpls" id="templates">
      <div className="adm-crm-bar">
        <div>
          <p className="adm-card__en">Templates</p>
          <h2 className="adm-card__title">
            テンプレート<small>{templates.length}件</small>
          </h2>
        </div>
        <Link href="/admin/forms/templates/new/" className="adm-chipbtn">
          <i className="bi bi-plus-lg" aria-hidden="true" />
          新しいテンプレート
        </Link>
      </div>
      <p className="adm-card__help">
        よく使う質問の並びと設定を取っておき、新しいフォームのもとにできます。フォームの編集画面の「テンプレートとして保存」からも登録できます。テンプレートから作ったフォームは、自由に直せます（テンプレート自体は変わりません）。
      </p>
      {templates.length === 0 ? (
        <p className="adm-empty">テンプレートはまだありません。</p>
      ) : (
        <ul className="adm-tpls__list">
          {templates.map((t, i) => (
            <li key={t.id} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <div className="adm-tpls__main">
                <h3>
                  <Link href={`/admin/forms/templates/${t.id}/`}>{t.name}</Link>
                </h3>
                {t.description && <p>{t.description}</p>}
                <p className="adm-forms__meta">
                  <ModePill mode={t.data.auth_mode} />
                  <span className="adm-forms__url">
                    質問 {questionCount(t)}件・更新 {dayOf(t.updated_at)}
                  </span>
                </p>
              </div>
              <div className="adm-forms__btns">
                <Link href={`/admin/forms/new/?template=${t.id}`} className="adm-chipbtn adm-chipbtn--primary">
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  このテンプレートで作る
                </Link>
                <Link href={`/admin/forms/templates/${t.id}/`} className="adm-linkbtn">
                  編集
                </Link>
                <DeleteTemplateButton id={t.id} name={t.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// 新しいフォームを作るとき：白紙から／テンプレートから を選ぶ
export function TemplatePicker({ templates }: { templates: TemplateRow[] }) {
  return (
    <div className="adm-tplpick">
      <Link href="/admin/forms/new/?blank=1" className="adm-tplpick__card is-blank">
        <span className="adm-tplpick__icon" aria-hidden="true">
          <i className="bi bi-file-earmark-plus" />
        </span>
        <strong>白紙から作る</strong>
        <small>質問を1つずつ並べて作ります。</small>
      </Link>
      {templates.map((t, i) => (
        <Link key={t.id} href={`/admin/forms/new/?template=${t.id}`} className="adm-tplpick__card" style={{ animationDelay: `${(i + 1) * 50}ms` }}>
          <span className="adm-tplpick__icon" aria-hidden="true">
            <i className="bi bi-layers" />
          </span>
          <strong>{t.name}</strong>
          <small>{t.description || `「${t.data.title}」のテンプレート`}</small>
          <span className="adm-forms__meta">
            <ModePill mode={t.data.auth_mode} />
            <span className="adm-forms__url">質問 {questionCount(t)}件</span>
          </span>
          <ol className="adm-tplpick__qs">
            {(t.data.fields ?? [])
              .filter((f) => f.type !== "DESCRIPTION")
              .slice(0, 4)
              .map((f, j) => (
                <li key={j}>{f.label}</li>
              ))}
            {questionCount(t) > 4 && <li className="is-more">ほか {questionCount(t) - 4}件</li>}
          </ol>
        </Link>
      ))}
    </div>
  );
}
