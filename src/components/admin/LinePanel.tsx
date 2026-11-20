import Link from "next/link";
import { LineChatComposer, LineAutoRefresh, LineImportButton } from "@/components/admin/LineChatClient";
import { MESSAGE_LABELS, type LineFriendRow, type LineMessageRow } from "@/lib/admin/line";

// 管理画面の「LINE 友だち」：左に友だちの一覧（絞り込み・検索）、右に選んだ友だちとの個別チャット。
// スマホでは、一覧と個別チャットを切り替えて表示する（友だちを選ぶとチャット、「一覧へ」で戻る）

const FILTERS = [
  ["", "すべて"],
  ["unread", "未読"],
  ["staff", "スタッフ連携済み"],
  ["nostaff", "未連携"],
  ["blocked", "ブロック中"],
] as const;

const time = (d: Date | null) => {
  if (!d) return "";
  const now = new Date();
  const sameDay = d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) === now.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  return new Intl.DateTimeFormat("ja-JP", sameDay ? { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" } : { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(d);
};
const fullTime = (d: Date) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

function Avatar({ f, size = "md" }: { f: Pick<LineFriendRow, "picture_url" | "display_name">; size?: "md" | "lg" }) {
  return (
    <span className={`adm-lineav adm-lineav--${size}`} aria-hidden="true">
      {f.picture_url ? <img src={f.picture_url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : (f.display_name ?? "?").slice(0, 1)}
    </span>
  );
}

function link(params: { u?: string; filter?: string; q?: string }) {
  const sp = new URLSearchParams({ tab: "line" });
  if (params.filter) sp.set("filter", params.filter);
  if (params.q) sp.set("q", params.q);
  if (params.u) sp.set("u", params.u);
  return `/admin/?${sp.toString()}`;
}

export function LinePanel({
  friends,
  selected,
  messages,
  filter = "",
  q = "",
  configured,
}: {
  friends: LineFriendRow[] | null;
  selected: LineFriendRow | null;
  messages: LineMessageRow[];
  filter?: string;
  q?: string;
  configured: boolean;
}) {
  if (!friends)
    return (
      <div className="adm-alert is-ng">
        <i className="bi bi-exclamation-octagon" aria-hidden="true" />
        <span>友だちの一覧を読み込めませんでした。時間をおいて開き直してください。</span>
      </div>
    );

  const words = q.trim().toLowerCase();
  const shown = friends.filter((f) => {
    if (filter === "unread" && f.unread === 0) return false;
    if (filter === "staff" && f.staff_id === null) return false;
    if (filter === "nostaff" && f.staff_id !== null) return false;
    if (filter === "blocked" && f.is_friend) return false;
    if (filter !== "blocked" && !f.is_friend && filter !== "") return false;
    if (!words) return true;
    return [f.display_name, f.staff_name, f.staff_kana, f.staff_id?.toString()].some((v) => v?.toLowerCase().includes(words));
  });

  return (
    <div className="adm-stack">
      {!configured && (
        <div className="adm-alert is-warn">
          <i className="bi bi-plug" aria-hidden="true" />
          <span>
            <strong>LINE との接続がまだ設定されていません。</strong>
            Amplify の環境変数に LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定し、LINE Developers の Webhook URL をこのサイトに切り替えると、友だち追加やメッセージが届くようになります。
          </span>
        </div>
      )}
      <div className={`adm-line${selected ? " has-chat" : ""}`}>
        <section className="adm-line__list" aria-label="友だちの一覧">
          <form className="adm-line__search" action="/admin/" method="get">
            <input type="hidden" name="tab" value="line" />
            {filter && <input type="hidden" name="filter" value={filter} />}
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" name="q" defaultValue={q} placeholder="名前・スタッフ名・スタッフ ID で探す" aria-label="友だちを探す" />
          </form>
          <nav className="adm-filters adm-filters--small" aria-label="絞り込み">
            {FILTERS.map(([key, label]) => (
              <Link key={key} href={link({ filter: key, q })} className={`adm-filter${filter === key ? " is-active" : ""}`}>
                {label}
                {key === "unread" && friends.some((f) => f.unread > 0) && <em>{friends.filter((f) => f.unread > 0).length}</em>}
              </Link>
            ))}
          </nav>
          <p className="adm-line__count">
            {shown.length}人{friends.length !== shown.length && `（全${friends.length}人）`}
          </p>
          {shown.length === 0 ? (
            <div className="adm-empty adm-empty--big">
              <i className="bi bi-people" aria-hidden="true" />
              {friends.length === 0 ? "まだ友だちが記録されていません。" : "条件に合う友だちはいません。"}
              {friends.length === 0 && configured && <LineImportButton />}
            </div>
          ) : (
            <ul className="adm-line__friends">
              {shown.map((f) => (
                <li key={f.line_user_id}>
                  <Link
                    href={link({ u: f.line_user_id, filter, q })}
                    className={`adm-line__friend${selected?.line_user_id === f.line_user_id ? " is-active" : ""}${f.is_friend ? "" : " is-blocked"}`}
                    scroll={false}
                  >
                    <Avatar f={f} />
                    <span className="adm-line__who">
                      <strong>{f.display_name ?? "（名前を取得できません）"}</strong>
                      <small>
                        {f.staff_id !== null ? (
                          <span className="adm-line__staff">
                            <i className="bi bi-person-check" aria-hidden="true" />
                            {f.staff_name ?? "スタッフ"}（{f.staff_id}）
                          </span>
                        ) : (
                          <span className="adm-line__nostaff">スタッフ未連携</span>
                        )}
                        {!f.is_friend && <span className="adm-line__blocked">ブロック中</span>}
                      </small>
                      {f.last_message_text && <span className="adm-line__last">{f.last_message_text}</span>}
                    </span>
                    <span className="adm-line__meta">
                      <time>{time(f.last_message_at ?? f.followed_at)}</time>
                      {f.unread > 0 && <em className="adm-line__unread">{f.unread}</em>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {friends.length > 0 && configured && (
            <div className="adm-line__import">
              <LineImportButton small />
            </div>
          )}
        </section>

        <section className="adm-line__chat" aria-label="個別チャット">
          {selected ? (
            <>
              <header className="adm-line__head">
                <Link href={link({ filter, q })} className="adm-line__back" scroll={false}>
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                  一覧へ
                </Link>
                <Avatar f={selected} size="lg" />
                <div>
                  <h2>{selected.display_name ?? "（名前を取得できません）"}</h2>
                  <p>
                    {selected.staff_id !== null ? (
                      <>
                        スタッフ：<strong>{selected.staff_name}</strong>
                        {selected.staff_kana && <small>（{selected.staff_kana}）</small>}・ID {selected.staff_id}
                      </>
                    ) : (
                      "スタッフ登録とは未連携"
                    )}
                    {!selected.is_friend && <span className="adm-line__blocked">ブロック中</span>}
                  </p>
                </div>
              </header>
              <ol className="adm-line__messages">
                {messages.length === 0 && <li className="adm-line__none">まだやり取りはありません。</li>}
                {messages.map((m) => (
                  <li key={String(m.id)} className={`adm-bubble adm-bubble--${m.direction}`}>
                    <p className="adm-bubble__text">{m.message_type === "text" ? m.text : (MESSAGE_LABELS[m.message_type] ?? `［${m.message_type}］`)}</p>
                    <span className="adm-bubble__meta">
                      {m.direction === "out" && `${m.sent_by_name ?? "管理者"}・`}
                      {fullTime(m.created_at)}
                    </span>
                  </li>
                ))}
              </ol>
              <LineChatComposer to={selected.line_user_id} disabled={!configured || !selected.is_friend} />
              <LineAutoRefresh />
            </>
          ) : (
            <div className="adm-line__pick">
              <i className="bi bi-chat-dots" aria-hidden="true" />
              左の一覧から友だちを選ぶと、やり取りの表示と返信ができます。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
