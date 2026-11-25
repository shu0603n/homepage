import Link from 'next/link';
import {
  FieldSelect,
  NewChatButton,
  NotesPanel,
  ProfileForm,
  StaffLinker,
  TagActiveToggle,
  TagDialog,
  TagEditor,
  CategoryManager
} from '@/components/admin/CrmClient';
import { LineAutoRefresh, LineBlockCheckButton, LineChatComposer, LineImportButton } from '@/components/admin/LineChatClient';
import {
  CANDIDATE_STATUSES,
  CHAT_STATUS_LABEL,
  CHAT_STATUSES,
  PROFILE_FIELDS,
  STATUS_LABEL,
  TAG_TRIGGER_LABEL,
  TAG_TRIGGERS,
  type CandidateDetail,
  type CandidateRow,
  type ChatRow,
  type TagRow
} from '@/lib/admin/crm';
import { MESSAGE_LABELS, type LineMessageRow } from '@/lib/admin/line';

// 友だち・求職者管理／個別チャット／タグ管理の画面（Linext から移植）

type Admin = { id: number; label: string };
type TagOpt = { id: number; name: string; color: string; manual: boolean };

const day = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' }).format(d) : '－';
const dateTime = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d)
    : '－';

function Avatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
  return (
    <span className="adm-lineav" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : name.trim().slice(0, 1) || '?'}
    </span>
  );
}

const STATUS_OPTIONS = CANDIDATE_STATUSES.map((s) => ({ value: s.key, label: s.label }));
const CHAT_OPTIONS = CHAT_STATUSES.map((s) => ({ value: s.key, label: s.label }));

// ---------- 友だち・求職者管理（一覧） ----------

const PAGE = 20;

export function FriendsPanel({
  rows,
  admins,
  tags,
  params,
  selfId,
  configured
}: {
  rows: CandidateRow[] | null;
  admins: Admin[];
  tags: TagOpt[];
  params: { q?: string; status?: string; assignee?: string; friendStatus?: string; page?: string };
  selfId: number;
  configured: boolean;
}) {
  if (!rows) return <p className="adm-alert is-ng">友だちの一覧を読み込めませんでした。時間をおいて開き直してください。</p>;
  const page = Math.max(1, Number(params.page) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const adminOpts = admins.map((a) => ({ value: a.id, label: a.label }));
  const pageLink = (p: number) => {
    const sp = new URLSearchParams({ tab: 'friends' });
    for (const k of ['q', 'status', 'assignee', 'friendStatus'] as const) if (params[k]) sp.set(k, params[k]!);
    sp.set('page', String(p));
    return `/admin/?${sp}`;
  };
  return (
    <div className="adm-stack">
      <form className="adm-crm-filters" action="/admin/" method="get">
        <input type="hidden" name="tab" value="friends" />
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="氏名・LINE名・フリガナ・電話番号・メール"
          aria-label="探す"
        />
        <select name="status" defaultValue={params.status ?? ''} aria-label="ステータス">
          <option value="">すべてのステータス</option>
          {CANDIDATE_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="assignee" defaultValue={params.assignee ?? ''} aria-label="担当者">
          <option value="">すべての担当者</option>
          <option value={String(selfId)}>自分の担当</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <select name="friendStatus" defaultValue={params.friendStatus ?? ''} aria-label="友だちの状態">
          <option value="">すべての友だち</option>
          <option value="active">有効な友だち</option>
          <option value="inactive">ブロック中</option>
        </select>
        <button type="submit" className="adm-chipbtn adm-chipbtn--primary">
          <i className="bi bi-funnel" aria-hidden="true" />
          絞り込む
        </button>
        {(params.q || params.status || params.assignee || params.friendStatus) && (
          <Link href="/admin/?tab=friends" className="adm-linkbtn">
            条件をクリア
          </Link>
        )}
      </form>
      <p className="adm-crm-count">
        {rows.length}人{pages > 1 && `（${page}／${pages}ページ）`}
      </p>
      {rows.length === 0 ? (
        <div className="adm-empty adm-empty--big">
          <i className="bi bi-people" aria-hidden="true" />
          該当する友だち・求職者がいません。
          {configured && !params.q && !params.status && !params.assignee && <LineImportButton />}
        </div>
      ) : (
        <div className="adm-tablewrap adm-crm-tablewrap">
          <table className="adm-table adm-crm-table">
            <thead>
              <tr>
                <th>氏名 / LINE 表示名</th>
                <th>チャット</th>
                <th>電話番号</th>
                <th>ステータス</th>
                <th>担当者</th>
                <th>タグ</th>
                <th>最終反応日</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const name = r.name ?? r.display_name ?? '（未登録）';
                return (
                  <tr key={r.line_user_id}>
                    <td data-label="氏名">
                      <Link href={`/admin/friends/${r.line_user_id}/`} className="adm-crm-who">
                        <Avatar url={r.picture_url} name={name} />
                        <span>
                          <strong>
                            {name}
                            {!r.is_friend && <em className="adm-line__blocked">ブロック中</em>}
                          </strong>
                          {r.name && r.display_name && <small>{r.display_name}</small>}
                          {r.staff_id !== null && <small className="adm-line__staff">スタッフ ID {r.staff_id}</small>}
                        </span>
                      </Link>
                    </td>
                    <td data-label="チャット">
                      {r.has_chat ? (
                        <Link
                          href={`/admin/chats/${r.line_user_id}/`}
                          className={`adm-crm-chat${r.unread > 0 ? ' is-unread' : ''}`}
                          title="個別チャットを開く"
                        >
                          <i className={`bi ${r.unread > 0 ? 'bi-chat-dots-fill' : 'bi-chat-dots'}`} aria-hidden="true" />
                          {r.unread > 0 && <em>{r.unread}</em>}
                        </Link>
                      ) : (
                        <span className="adm-muted">－</span>
                      )}
                    </td>
                    <td data-label="電話番号">{r.phone ?? '－'}</td>
                    <td data-label="ステータス">
                      <FieldSelect id={r.line_user_id} field="status" value={r.status_key} options={STATUS_OPTIONS} />
                    </td>
                    <td data-label="担当者">
                      <FieldSelect
                        id={r.line_user_id}
                        field="assignee_id"
                        value={r.assignee_id}
                        options={adminOpts}
                        empty="未割当"
                        numeric
                      />
                    </td>
                    <td data-label="タグ">
                      <TagEditor id={r.line_user_id} tags={r.tags} available={tags} />
                    </td>
                    <td data-label="最終反応日">{day(r.last_action_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="adm-pager" aria-label="ページ">
          {page > 1 && <Link href={pageLink(page - 1)}>‹ 前へ</Link>}
          <span>
            {page} / {pages}
          </span>
          {page < pages && <Link href={pageLink(page + 1)}>次へ ›</Link>}
        </nav>
      )}
      {configured && rows.length > 0 && (
        <div className="adm-crm-import">
          <LineBlockCheckButton />
          <LineImportButton small />
        </div>
      )}
    </div>
  );
}

// ---------- 友だち・求職者の詳細 ----------

export function FriendDetailPanel({
  c,
  admins,
  tags,
  tab,
  forms
}: {
  c: CandidateDetail;
  admins: Admin[];
  tags: TagOpt[];
  tab: string;
  forms: { id: number; form_id: number; title: string; submitted_at: Date }[];
}) {
  const name = c.profile?.name ?? c.display_name ?? '（未登録）';
  const timeline = [
    ...(c.followed_at ? [{ date: c.followed_at, label: '友だち追加' }] : []),
    ...c.history.map((h) => ({
      date: h.changed_at,
      label: `ステータス変更：${h.from_key ? (STATUS_LABEL[h.from_key] ?? h.from_key) : '未設定'} → ${STATUS_LABEL[h.to_key] ?? h.to_key}${h.changed_by_name ? `（${h.changed_by_name}）` : ''}`
    })),
    ...c.tags.map((t) => ({ date: t.assigned_at, label: `タグ付与：${t.name}` })),
    ...c.consents.map((x) => ({
      date: x.consented_at,
      label: `${x.type === 'TERMS' ? '利用規約' : 'プライバシーポリシー'}に同意（v${x.version}）`
    })),
    ...forms.map((x) => ({ date: x.submitted_at, label: `フォーム回答：${x.title}` }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  const tabs = [
    ['profile', '基本情報'],
    ['timeline', 'タイムライン'],
    ['tags', 'タグ'],
    ['forms', `フォーム回答（${forms.length}）`],
    ['consent', '同意履歴']
  ] as const;
  const values = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, c.profile?.[f.key] ?? '']));
  return (
    <div className="adm-stack">
      <p className="adm-crm-back">
        <Link href="/admin/?tab=friends">
          <i className="bi bi-chevron-left" aria-hidden="true" />
          友だち・求職者の一覧へ
        </Link>
      </p>
      <section className="adm-card adm-crm-head">
        <Avatar url={c.picture_url} name={name} size={60} />
        <div className="adm-crm-head__who">
          <h2>
            {name}
            {!c.is_friend && <em className="adm-line__blocked">ブロック中</em>}
          </h2>
          <p>{c.display_name}</p>
          <Link href={`/admin/chats/${c.line_user_id}/`} className="adm-chipbtn">
            <i className="bi bi-chat-dots" aria-hidden="true" />
            個別チャットを開く
          </Link>
        </div>
        <label className="adm-crm-head__field">
          <span>ステータス</span>
          <FieldSelect id={c.line_user_id} field="status" value={c.status_key} options={STATUS_OPTIONS} />
        </label>
        <label className="adm-crm-head__field">
          <span>担当者</span>
          <FieldSelect
            id={c.line_user_id}
            field="assignee_id"
            value={c.assignee_id}
            options={admins.map((a) => ({ value: a.id, label: a.label }))}
            empty="未割当"
            numeric
          />
        </label>
      </section>
      <nav className="adm-filters adm-crm-tabs" aria-label="表示の切り替え">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/friends/${c.line_user_id}/?view=${key}`}
            className={`adm-filter${tab === key ? ' is-active' : ''}`}
            scroll={false}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'profile' && (
        <section className="adm-card">
          <h2 className="adm-card__title">基本情報</h2>
          <StaffLinker id={c.line_user_id} staff={c.staff ? { id: c.staff.id, name: c.staff.name } : null} />
          <ProfileForm
            key={c.profile_updated_at?.toISOString() ?? 'new'}
            id={c.line_user_id}
            fields={PROFILE_FIELDS.map((f) => ({ key: f.key, label: f.label }))}
            values={values}
          />
        </section>
      )}
      {tab === 'timeline' && (
        <section className="adm-card">
          <h2 className="adm-card__title">タイムライン</h2>
          {timeline.length === 0 ? (
            <p className="adm-muted">表示できる履歴がありません。</p>
          ) : (
            <ol className="adm-timeline">
              {timeline.map((e, i) => (
                <li key={i}>
                  <p>{e.label}</p>
                  <small>{dateTime(e.date)}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      {tab === 'tags' && (
        <section className="adm-card">
          <h2 className="adm-card__title">タグ</h2>
          <TagEditor id={c.line_user_id} tags={c.tags} available={tags} />
        </section>
      )}
      {tab === 'forms' && (
        <section className="adm-card">
          <h2 className="adm-card__title">フォーム回答</h2>
          {forms.length === 0 ? (
            <p className="adm-muted">この方のフォーム回答はありません。</p>
          ) : (
            <ul className="adm-friendforms">
              {forms.map((x) => (
                <li key={x.id}>
                  <Link href={`/admin/forms/${x.form_id}/answers/${x.id}/`}>
                    <i className="bi bi-ui-checks" aria-hidden="true" />
                    <strong>{x.title}</strong>
                    <small>{dateTime(x.submitted_at)}</small>
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {tab === 'consent' && (
        <section className="adm-card">
          <h2 className="adm-card__title">同意履歴</h2>
          {c.consents.length === 0 ? (
            <p className="adm-muted">同意履歴はありません。</p>
          ) : (
            <ul className="adm-consents">
              {c.consents.map((x, i) => (
                <li key={i}>
                  <span className="adm-pill">{x.type === 'TERMS' ? '利用規約' : 'プライバシーポリシー'}</span>v{x.version}
                  <small>{dateTime(x.consented_at)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// ---------- 個別チャット（一覧） ----------

export function ChatsPanel({
  rows,
  admins,
  params,
  selfId
}: {
  rows: ChatRow[] | null;
  admins: Admin[];
  params: { q?: string; status?: string; assignee?: string };
  selfId: number;
}) {
  if (!rows) return <p className="adm-alert is-ng">チャットの一覧を読み込めませんでした。時間をおいて開き直してください。</p>;
  const adminOpts = admins.map((a) => ({ value: a.id, label: a.label }));
  return (
    <div className="adm-stack">
      <LineAutoRefresh interval={5000} scroll={false} />
      <div className="adm-chats-bar">
        <form className="adm-crm-filters" action="/admin/" method="get">
          <input type="hidden" name="tab" value="chats" />
          <input type="search" name="q" defaultValue={params.q ?? ''} placeholder="氏名・LINE名で探す" aria-label="探す" />
          <select name="status" defaultValue={params.status ?? ''} aria-label="対応状況">
            <option value="">すべての状態</option>
            {CHAT_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="assignee" defaultValue={params.assignee ?? ''} aria-label="担当者">
            <option value="">すべての担当者</option>
            <option value={String(selfId)}>自分の担当</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <button type="submit" className="adm-chipbtn adm-chipbtn--primary">
            <i className="bi bi-funnel" aria-hidden="true" />
            絞り込む
          </button>
          {(params.q || params.status || params.assignee) && (
            <Link href="/admin/?tab=chats" className="adm-linkbtn">
              条件をクリア
            </Link>
          )}
        </form>
        <NewChatButton />
      </div>
      {rows.length === 0 ? (
        <div className="adm-empty adm-empty--big">
          <i className="bi bi-chat-dots" aria-hidden="true" />
          該当するチャットがありません。
          {!params.q && !params.status && !params.assignee && '「新規メッセージ」から、友だちを選んで話しかけられます。'}
        </div>
      ) : (
        <div className="adm-tablewrap adm-crm-tablewrap">
          <table className="adm-table adm-crm-table">
            <thead>
              <tr>
                <th>相手</th>
                <th>最新メッセージ</th>
                <th>状態</th>
                <th>担当者</th>
                <th>最終メッセージ日時</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name = r.name ?? r.display_name ?? '（不明）';
                return (
                  <tr key={r.line_user_id} className={r.unread > 0 ? 'is-unread' : undefined}>
                    <td data-label="相手">
                      <Link href={`/admin/chats/${r.line_user_id}/`} className="adm-crm-who">
                        <Avatar url={r.picture_url} name={name} />
                        <strong>
                          {name}
                          {r.unread > 0 && <em className="adm-crm-new">新着</em>}
                        </strong>
                      </Link>
                    </td>
                    <td data-label="最新メッセージ" className="adm-crm-last">
                      <Link href={`/admin/chats/${r.line_user_id}/`}>{r.last_message_text ?? '－'}</Link>
                    </td>
                    <td data-label="状態">
                      <FieldSelect id={r.line_user_id} field="chat_status" value={r.chat_status} options={CHAT_OPTIONS} />
                    </td>
                    <td data-label="担当者">
                      <FieldSelect
                        id={r.line_user_id}
                        field="chat_assignee_id"
                        value={r.chat_assignee_id}
                        options={adminOpts}
                        empty="未割当"
                        numeric
                      />
                    </td>
                    <td data-label="最終メッセージ日時">{dateTime(r.last_message_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- 個別チャット（やり取り） ----------

export function ChatThreadPanel({
  c,
  messages,
  notes,
  admins,
  configured
}: {
  c: CandidateDetail;
  messages: LineMessageRow[];
  notes: { id: number; body: string; created_at: Date; admin_name: string | null }[];
  admins: Admin[];
  configured: boolean;
}) {
  const name = c.profile?.name ?? c.display_name ?? '（不明）';
  return (
    <div className="adm-chat">
      <section className="adm-chat__main">
        <header className="adm-line__head adm-chat__head">
          <Link href="/admin/?tab=chats" className="adm-chat__back" aria-label="チャットの一覧へ">
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </Link>
          <Avatar url={c.picture_url} name={name} size={44} />
          <div className="adm-chat__who">
            <h2>
              {name}
              {!c.is_friend && <em className="adm-line__blocked">ブロック中</em>}
            </h2>
            <Link href={`/admin/friends/${c.line_user_id}/`}>求職者詳細を見る</Link>
          </div>
          <div className="adm-chat__controls">
            <FieldSelect id={c.line_user_id} field="chat_status" value={c.chat_status} options={CHAT_OPTIONS} />
            <FieldSelect
              id={c.line_user_id}
              field="chat_assignee_id"
              value={c.chat_assignee_id}
              options={admins.map((a) => ({ value: a.id, label: a.label }))}
              empty="未割当"
              numeric
            />
          </div>
        </header>
        <ol className="adm-line__messages">
          {messages.length === 0 && <li className="adm-line__none">まだメッセージがありません。下の欄から送って、やり取りを始めましょう。</li>}
          {messages.map((m) => (
            <li key={String(m.id)} className={`adm-bubble adm-bubble--${m.direction}`}>
              <p className="adm-bubble__text">
                {m.message_type === 'text' ? m.text : (MESSAGE_LABELS[m.message_type] ?? `［${m.message_type}］`)}
              </p>
              <span className="adm-bubble__meta">
                {m.direction === 'out' && `${m.sent_by_name ?? '管理者'}・`}
                {dateTime(m.created_at)}
              </span>
            </li>
          ))}
        </ol>
        <LineChatComposer to={c.line_user_id} disabled={!configured || !c.is_friend} />
        {!c.is_friend && <p className="adm-chat__warn">この方はブロック中のため送信できません。</p>}
        <LineAutoRefresh interval={3000} />
      </section>
      <aside className="adm-chat__side adm-card">
        <h2 className="adm-card__title">
          内部メモ <small>{CHAT_STATUS_LABEL[c.chat_status] ?? ''}</small>
        </h2>
        <NotesPanel
          id={c.line_user_id}
          notes={notes.map((n) => ({ id: n.id, body: n.body, at: dateTime(n.created_at), by: n.admin_name ?? '（削除された管理者）' }))}
        />
      </aside>
    </div>
  );
}

// ---------- タグ管理 ----------

export function TagsPanel({
  tags,
  categories
}: {
  tags: TagRow[];
  categories: { id: number; name: string; sort_order: number; count: number }[];
}) {
  const catOpts = categories.map((c) => ({ id: c.id, label: c.name }));
  const triggers = TAG_TRIGGERS.map((t) => ({ key: t.key, label: t.label }));
  return (
    <div className="adm-stack">
      <div className="adm-crm-bar">
        <p className="adm-muted">求職者に付けるタグを管理します。「自動付与ルール」を設定すると、そのタイミングでタグが自動で付きます。</p>
        <TagDialog
          categories={catOpts}
          triggers={triggers}
          trigger={
            <button type="button" className="adm-chipbtn adm-chipbtn--primary">
              <i className="bi bi-plus-lg" aria-hidden="true" />
              新規タグ作成
            </button>
          }
        />
      </div>
      <div className="adm-tablewrap adm-crm-tablewrap">
        <table className="adm-table adm-crm-table">
          <thead>
            <tr>
              <th>タグ</th>
              <th>カテゴリ</th>
              <th>説明</th>
              <th>手動付与</th>
              <th>自動付与ルール</th>
              <th>付与件数</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 && (
              <tr>
                <td colSpan={8} className="adm-muted">
                  タグがまだ登録されていません。
                </td>
              </tr>
            )}
            {tags.map((t) => (
              <tr key={t.id} className={t.is_active ? undefined : 'is-off'}>
                <td data-label="タグ">
                  <span className="adm-ftag" style={{ background: t.color }}>
                    {t.name}
                  </span>
                </td>
                <td data-label="カテゴリ">{t.category_name ?? '－'}</td>
                <td data-label="説明" className="adm-crm-desc">
                  {t.description ?? '－'}
                </td>
                <td data-label="手動付与">{t.is_manual_allowed ? '可' : '不可'}</td>
                <td data-label="自動付与ルール">
                  {t.auto_trigger ? (TAG_TRIGGER_LABEL[t.auto_trigger] ?? t.auto_trigger) : 'なし（手動のみ）'}
                </td>
                <td data-label="付与件数">{t.count}</td>
                <td data-label="状態">
                  <span className={`adm-pill ${t.is_active ? 'is-on' : ''}`}>{t.is_active ? '有効' : '無効'}</span>
                </td>
                <td data-label="操作" className="adm-crm-ops">
                  <TagDialog
                    initial={{
                      id: t.id,
                      name: t.name,
                      description: t.description ?? '',
                      color: t.color,
                      category_id: t.category_id,
                      is_manual_allowed: t.is_manual_allowed,
                      auto_trigger: t.auto_trigger
                    }}
                    categories={catOpts}
                    triggers={triggers}
                    trigger={
                      <button type="button" className="adm-linkbtn">
                        編集
                      </button>
                    }
                  />
                  <TagActiveToggle id={t.id} active={t.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="adm-card">
        <h2 className="adm-card__title">カテゴリ管理</h2>
        <p className="adm-card__help">タグをまとめる分類です。並び順の数字が小さいほど、上に表示されます。</p>
        <CategoryManager categories={categories} />
      </section>
    </div>
  );
}
