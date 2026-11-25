"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// 朝礼のページの、画面で操作する部品（草原と木の絵・花の小窓・今日の当番・回数の一覧・会社の休み）。仕組みは lib/admin/morning.ts

export type Person = { id: number; name: string; avatar: string | null };
export type Spot = {
  day: string;
  off: string | null; // 祝日・会社の休みの名前（朝礼なし）
  status: "held" | "skipped" | null; // null＝まだ（これからの日）
  mc: number | null;
  presenter: number | null;
  commenter: number | null;
  absent: number[];
  presentation: string | null;
  comment: string | null;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const dayLabel = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return `${m}月${d}日（${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
};
// 曜日ごとの花の色（月〜金）
const PETAL = ["#ff6fb1", "#ff6fb1", "#ffb36b", "#1fa0d8", "#a77bff", "#ff5d6c", "#ff6fb1"];
const petalOf = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return PETAL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};
// 日付から決まる小さなずれ（花の位置を毎回同じにするため）
const jitter = (day: string, salt: number) => {
  let h = salt * 2654435761;
  for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 2246822519);
  return ((h >>> 0) % 1000) / 1000 - 0.5;
};

async function post(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/admin/morning/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    return res.ok && data?.ok ? null : (data?.message ?? "保存できませんでした。");
  } catch {
    return "通信に失敗しました。";
  }
}

function Face({ p, size = 32 }: { p: Person | undefined; size?: number }) {
  if (!p) return <span className="mg-face is-none" style={{ width: size, height: size }} aria-hidden="true">－</span>;
  return (
    <span className="mg-face" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {p.avatar ? <img src={p.avatar} alt="" /> : p.name.slice(0, 1)}
    </span>
  );
}

// ---------- 草原と木の絵 ----------

export function MorningGarden({ spots, people, today, selfId, canErase = false }: { spots: Spot[]; people: Person[]; today: string; selfId: number; canErase?: boolean }) {
  const [open, setOpen] = useState<Spot | null>(null);
  const held = spots.filter((s) => s.status === "held" && s.day <= today);
  const bloomed = held.filter((s) => s.presentation && s.comment).length;
  // その月の朝礼が全部終わって、全部の日に花が咲いたら満開（木に花が咲いて、花びらが舞う）
  const full = held.length > 0 && bloomed === held.length && !spots.some((s) => !s.off && s.day > today);
  const placed = useMemo(() => {
    const cols = Math.max(1, Math.ceil(spots.length / 3));
    return spots.map((s, i) => {
      const col = Math.floor(i / 3);
      const row = i % 3;
      const x = 80 + ((col + 0.5) / cols) * 1040 + jitter(s.day, 1) * 30 + (row === 1 ? 14 : row === 2 ? -10 : 0);
      const y = 492 + row * 50 + jitter(s.day, 2) * 12;
      return { s, x, y };
    });
  }, [spots]);
  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <div className="mg">
      <svg className="mg-scene" viewBox="0 0 1200 660" role="img" aria-label={`今月の朝礼の花（咲いた花 ${bloomed}）`}>
        <defs>
          <linearGradient id="mg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6ec4f2" />
            <stop offset="1" stopColor="#e3f6fd" />
          </linearGradient>
          <linearGradient id="mg-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#86cf6f" />
            <stop offset="1" stopColor="#4f9e45" />
          </linearGradient>
          <radialGradient id="mg-sun">
            <stop offset="0" stopColor="#fff7c2" />
            <stop offset="1" stopColor="#ffd75e" />
          </radialGradient>
        </defs>
        <rect width="1200" height="660" fill="url(#mg-sky)" />
        <circle className="mg-sunglow" cx="1060" cy="105" r="80" fill="#fff3b0" opacity=".45" />
        <circle cx="1060" cy="105" r="46" fill="url(#mg-sun)" />
        {[
          [120, 90, 1, 46],
          [520, 60, 0.8, 70],
          [860, 150, 0.65, 58],
        ].map(([x, y, s, dur], i) => (
          <g key={i} className="mg-cloud" style={{ animationDuration: `${dur}s`, animationDelay: `${-i * 17}s` }}>
            <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity=".92">
              <ellipse cx="0" cy="0" rx="62" ry="26" />
              <ellipse cx="-42" cy="10" rx="40" ry="20" />
              <ellipse cx="46" cy="8" rx="46" ry="22" />
              <ellipse cx="8" cy="-16" rx="40" ry="24" />
            </g>
          </g>
        ))}
        <path d="M0 400 Q 200 330 420 390 T 820 370 T 1200 380 V 660 H 0 Z" fill="#b5e09c" />
        <path d="M0 440 Q 300 390 600 432 T 1200 420 V 660 H 0 Z" fill="url(#mg-ground)" />

        {/* 大きな木 */}
        <g className="mg-tree">
          <path d="M572 470 C 578 400 576 350 560 300 L 600 296 L 640 300 C 624 350 622 400 628 470 Z" fill="#7a5233" />
          <path d="M590 340 C 560 310 520 300 490 270 L 500 262 C 530 290 570 296 598 322 Z" fill="#6c472b" />
          <path d="M610 330 C 640 300 680 292 712 262 L 720 272 C 690 300 650 310 618 340 Z" fill="#6c472b" />
          <g className="mg-canopy">
            {[
              [600, 210, 120, "#3d8b4b"],
              [500, 250, 88, "#4a9a57"],
              [700, 250, 92, "#4a9a57"],
              [545, 160, 84, "#56aa61"],
              [660, 150, 90, "#56aa61"],
              [600, 120, 70, "#68bb6c"],
              [440, 285, 58, "#5fae63"],
              [762, 288, 60, "#5fae63"],
            ].map(([cx, cy, r, c], i) => (
              <circle key={i} cx={cx} cy={cy} r={r as number} fill={c as string} />
            ))}
            {full &&
              Array.from({ length: 46 }, (_, i) => (
                <circle key={`b${i}`} className="mg-blossom" style={{ animationDelay: `${(i % 9) * 0.12}s` }} cx={460 + ((i * 53) % 290)} cy={110 + ((i * 37) % 210)} r={7 + (i % 3) * 2} fill={i % 2 ? "#ffc1dd" : "#ff8fc4"} />
              ))}
          </g>
        </g>
        {full &&
          Array.from({ length: 18 }, (_, i) => (
            <ellipse key={`p${i}`} className="mg-petal" style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${7 + (i % 4)}s` }} cx={380 + i * 28} cy={120} rx="6" ry="4" fill="#ffb3d6" />
          ))}

        {/* 草 */}
        {Array.from({ length: 40 }, (_, i) => {
          const x = 15 + i * 30 + ((i * 17) % 11);
          const y = 455 + ((i * 29) % 190);
          return <path key={`g${i}`} d={`M${x} ${y} l-5 -12 M${x} ${y} l1 -15 M${x} ${y} l6 -11`} stroke="#3f8a3a" strokeWidth="2" strokeLinecap="round" opacity=".55" />;
        })}

        {/* 日ごとの花 */}
        {placed.map(({ s, x, y }) => {
          const isToday = s.day === today;
          const n = (s.presentation ? 1 : 0) + (s.comment ? 1 : 0);
          const kind = s.off ? "off" : s.status === "skipped" ? "skipped" : s.status === null ? "future" : n === 2 ? "bloom" : n === 1 ? "bud" : "sprout";
          const color = petalOf(s.day);
          const clickable = kind !== "future";
          return (
            <g
              key={s.day}
              className={`mg-spot is-${kind}${isToday ? " is-today" : ""}`}
              transform={`translate(${x} ${y}) scale(1.35)`}
              onClick={clickable ? () => setOpen(s) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(s)) : undefined}
              aria-label={`${dayLabel(s.day)}：${kind === "bloom" ? "花" : kind === "bud" ? "つぼみ" : kind === "sprout" ? "芽" : kind === "skipped" ? "朝礼なし" : kind === "off" ? s.off : "これから"}`}
            >
              <title>{`${dayLabel(s.day)}${s.off ? `（${s.off}）` : kind === "skipped" ? "（朝礼なし）" : ""}`}</title>
              {isToday && <circle className="mg-todayring" r="26" cy="-18" fill="none" stroke="#fff" strokeWidth="3" />}
              <ellipse rx="16" ry="5" fill="#6b4a2f" opacity={kind === "future" ? 0.25 : 0.45} />
              {kind === "off" && <ellipse cy="-4" rx="10" ry="7" fill="#b7bfc4" />}
              {kind === "skipped" && <path d="M0 0 l-6 -12 M0 0 l0 -15 M0 0 l6 -12" stroke="#93a58f" strokeWidth="3" strokeLinecap="round" />}
              {(kind === "sprout" || kind === "bud" || kind === "bloom") && (
                <g className="mg-plant">
                  <path d={`M0 0 V${kind === "sprout" ? -14 : -40}`} stroke="#2f7d32" strokeWidth="3" strokeLinecap="round" />
                  <path d={`M0 ${kind === "sprout" ? -8 : -16} q -14 -8 -16 -2 q 6 8 16 2`} fill="#4caf50" />
                  <path d={`M0 ${kind === "sprout" ? -11 : -24} q 14 -8 16 -2 q -6 8 -16 2`} fill="#5dbb61" />
                  {kind === "bud" && (
                    <g className="mg-bud" transform="translate(0 -46)">
                      <ellipse rx="8" ry="12" fill={color} />
                      <path d="M-8 4 q 8 10 16 0 q -8 -2 -16 0" fill="#4caf50" />
                    </g>
                  )}
                  {kind === "bloom" && (
                    <g className="mg-bloom" transform="translate(0 -50)">
                      {Array.from({ length: 8 }, (_, k) => (
                        <ellipse key={k} rx="7" ry="14" cy="-11" fill={color} transform={`rotate(${k * 45})`} opacity=".95" />
                      ))}
                      <circle r="8" fill="#ffd54a" />
                      <circle r="3.5" fill="#f5a623" />
                    </g>
                  )}
                </g>
              )}
              <text y="20" textAnchor="middle" className="mg-daynum">
                {Number(s.day.slice(8))}
              </text>
            </g>
          );
        })}
      </svg>
      {open && <SpotModal spot={open} people={byId} selfId={selfId} today={today} canErase={canErase} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- 花を押したときの小窓（その日の当番と、発表・コメント） ----------

function SpotModal({ spot, people, selfId, today, canErase, onClose }: { spot: Spot; people: Map<number, Person>; selfId: number; today: string; canErase: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const n = (spot.presentation ? 1 : 0) + (spot.comment ? 1 : 0);
  return (
    <div className="adm-dialog" role="dialog" aria-modal="true" aria-label={dayLabel(spot.day)} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-dialog__box mg-modal">
        <p className="mg-modal__date">
          {dayLabel(spot.day)}
          {spot.day === today && <em>今日</em>}
        </p>
        {spot.off ? (
          <p className="adm-muted">{spot.off}のため、朝礼はお休みです。</p>
        ) : spot.status === "skipped" ? (
          <p className="adm-muted">この日は朝礼なしでした。</p>
        ) : (
          <>
            <p className="mg-modal__state">{n === 2 ? "🌸 花が咲きました" : n === 1 ? "🌱 つぼみ（あと1つで花が咲きます）" : "🌱 芽（発表かコメントでつぼみになります）"}</p>
            <RoleList spot={spot} people={people} selfId={selfId} />
            <Entry spot={spot} kind="presentation" people={people} selfId={selfId} canErase={canErase} />
            <Entry spot={spot} kind="comment" people={people} selfId={selfId} canErase={canErase} />
          </>
        )}
        <div className="adm-dialog__foot">
          <button type="button" className="adm-chipbtn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleList({ spot, people, selfId }: { spot: { mc: number | null; presenter: number | null; commenter: number | null }; people: Map<number, Person>; selfId: number }) {
  return (
    <ul className="mg-roles">
      {(
        [
          ["司会", spot.mc, "bi-mic"],
          ["発表", spot.presenter, "bi-book"],
          ["コメント", spot.commenter, "bi-chat-quote"],
        ] as const
      ).map(([label, id, icon]) => {
        const p = id === null ? undefined : people.get(id);
        return (
          <li key={label} className={id === selfId ? "is-me" : undefined}>
            <span className="mg-roles__label">
              <i className={`bi ${icon}`} aria-hidden="true" /> {label}
            </span>
            <Face p={p} size={34} />
            <strong>{p?.name ?? "（いません）"}</strong>
            {id === selfId && <em>あなた</em>}
          </li>
        );
      })}
    </ul>
  );
}

// 発表・コメントの欄（担当の本人なら書ける）
function Entry({ spot, kind, people, selfId, canErase = false }: { spot: Spot; kind: "presentation" | "comment"; people: Map<number, Person>; selfId: number; canErase?: boolean }) {
  const router = useRouter();
  const owner = kind === "presentation" ? spot.presenter : spot.commenter;
  const value = kind === "presentation" ? spot.presentation : spot.comment;
  const mine = owner === selfId && spot.status === "held";
  const [text, setText] = useState(value ?? "");
  const [editing, setEditing] = useState(mine && !value);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<[boolean, string] | null>(null);
  const label = kind === "presentation" ? "発表（フィロソフィーの感想）" : "コメント";
  return (
    <section className={`mg-entry${value ? " is-done" : ""}`}>
      <h3>
        <i className={`bi ${kind === "presentation" ? "bi-book" : "bi-chat-quote"}`} aria-hidden="true" /> {label}
        {owner !== null && <small>{people.get(owner)?.name}</small>}
      </h3>
      {editing ? (
        <>
          <textarea value={text} rows={5} maxLength={5000} onChange={(e) => setText(e.target.value)} placeholder={kind === "presentation" ? "読み上げたフィロソフィーと、感じたこと・考えたことを書きましょう" : "発表への感想やコメントを書きましょう"} />
          <div className="mg-entry__foot">
            {msg && <small className={msg[0] ? "adm-sheet__ok" : "adm-crm-error"}>{msg[1]}</small>}
            {value && (
              <button type="button" className="adm-chipbtn" onClick={() => (setEditing(false), setText(value))}>
                やめる
              </button>
            )}
            <button
              type="button"
              className="adm-chipbtn adm-chipbtn--primary"
              disabled={busy || !text.trim()}
              onClick={async () => {
                setBusy(true);
                const err = await post({ action: "write", day: spot.day, kind, text });
                setBusy(false);
                if (err) return setMsg([false, err]);
                setMsg([true, "保存しました。"]);
                setEditing(false);
                router.refresh();
              }}
            >
              <i className="bi bi-flower1" aria-hidden="true" /> {busy ? "保存しています…" : "保存して花を育てる"}
            </button>
          </div>
        </>
      ) : value ? (
        <>
          <p className="mg-entry__text">{value}</p>
          {(mine || canErase) && (
            <span className="mg-entry__ops">
              {mine && (
                <button type="button" className="adm-linkbtn" onClick={() => setEditing(true)}>
                  書き直す
                </button>
              )}
              {canErase && (
                <button
                  type="button"
                  className="adm-linkbtn is-danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`${dayLabel(spot.day)}の${kind === "presentation" ? "発表" : "コメント"}を削除します。元に戻せません。よろしいですか？`)) return;
                    setBusy(true);
                    const err = await post({ action: "erase", day: spot.day, kind });
                    setBusy(false);
                    if (err) return setMsg([false, err]);
                    setText("");
                    setMsg(null);
                    router.refresh();
                  }}
                >
                  削除
                </button>
              )}
            </span>
          )}
          {msg && !msg[0] && <small className="adm-crm-error">{msg[1]}</small>}
        </>
      ) : (
        <p className="adm-muted">まだ書かれていません{owner !== null && !mine ? "（担当の人だけが書けます）" : ""}。</p>
      )}
    </section>
  );
}

// ---------- 今日の朝礼（当番・自分の欄・いない人・朝礼なし） ----------

export function MorningToday({ spot, offReason, people, members, selfId, next, canErase = false }: { spot: Spot | null; offReason: string | null; people: Person[]; members: number[]; selfId: number; next: { day: string; mc: number | null; presenter: number | null; commenter: number | null }; canErase?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const byId = new Map(people.map((p) => [p.id, p]));
  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    const err = await post(body);
    setBusy(false);
    if (err) setError(err);
    router.refresh();
  };
  return (
    <div className="mg-panels">
      <section className="adm-card mg-today">
        <p className="adm-card__en">Today</p>
        <h2 className="adm-card__title">今日の朝礼</h2>
        {!spot ? (
          <p className="adm-muted">{offReason ? `今日は${offReason === "土日" ? "お休み" : offReason}のため、朝礼はありません。` : "今日の朝礼はまだ決まっていません。"}</p>
        ) : (
          <>
            {spot.status === "skipped" ? (
              <p className="adm-alert is-warn">
                <i className="bi bi-moon-stars" aria-hidden="true" />
                <span>今日は朝礼なしにしています。当番は次の朝礼の日に持ち越します。</span>
              </p>
            ) : (
              <>
                <RoleList spot={spot} people={byId} selfId={selfId} />
                {(spot.presenter === selfId || spot.commenter === selfId) && (
                  <div className="mg-today__mine">
                    {spot.presenter === selfId && <Entry spot={spot} kind="presentation" people={byId} selfId={selfId} canErase={canErase} />}
                    {spot.commenter === selfId && <Entry spot={spot} kind="comment" people={byId} selfId={selfId} canErase={canErase} />}
                  </div>
                )}
              </>
            )}
            <Attendance spot={spot} members={members} people={byId} busy={busy} onToggle={(id, absent) => run({ action: "absent", admin_id: id, absent })} onSkip={(skip) => run({ action: "skip", skip })} />
            {error && <p className="adm-crm-error">{error}</p>}
          </>
        )}
      </section>
      <section className="adm-card mg-next">
        <p className="adm-card__en">Next</p>
        <h2 className="adm-card__title">
          次の朝礼<small>{dayLabel(next.day)}・見込み</small>
        </h2>
        <RoleList spot={next} people={byId} selfId={selfId} />
        <p className="adm-card__help">今日の当番から決めた見込みです。いない人がいれば、当日に「今日はいない」にすると入れ替わります。</p>
      </section>
    </div>
  );
}

function Attendance({ spot, members, people, busy, onToggle, onSkip }: { spot: Spot; members: number[]; people: Map<number, Person>; busy: boolean; onToggle: (id: number, absent: boolean) => void; onSkip: (skip: boolean) => void }) {
  const locked = !!(spot.presentation || spot.comment);
  const present = members.filter((id) => !spot.absent.includes(id)).length;
  return (
    <div className="mg-attend">
      <h3>
        今日いる人<small>{present}人</small>
      </h3>
      <p className="adm-card__help">{locked ? "発表かコメントが書かれたので、今日の当番はもう変えられません。" : "休み・入社対応などでいない人を押すと「いない」になり、当番が入れ替わります（いなかった日は回数に数えないので、また順番が回ってきます）。"}</p>
      <ul className="mg-attend__list">
        {members.map((id) => {
          const p = people.get(id);
          const absent = spot.absent.includes(id);
          return (
            <li key={id}>
              <button type="button" className={`mg-attend__chip${absent ? " is-absent" : ""}`} disabled={busy || locked} onClick={() => onToggle(id, !absent)} aria-pressed={absent}>
                <Face p={p} size={26} />
                <span>{p?.name ?? id}</span>
                {absent && <em>いない</em>}
              </button>
            </li>
          );
        })}
      </ul>
      {!locked && (
        <div className="mg-attend__skip">
          {spot.status !== "skipped" && present < 5 && (
            <p className="adm-alert is-warn">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              <span>今日いる人が5人未満です。朝礼なしにしますか？</span>
            </p>
          )}
          <button type="button" className={`adm-chipbtn${spot.status === "skipped" ? "" : " is-danger"}`} disabled={busy} onClick={() => onSkip(spot.status !== "skipped")}>
            <i className={`bi ${spot.status === "skipped" ? "bi-sun" : "bi-moon-stars"}`} aria-hidden="true" />
            {spot.status === "skipped" ? "朝礼ありに戻す" : "今日は朝礼なしにする"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- 当番に入れる・外す ----------

export function MemberToggle({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      className={`adm-switch${active ? " is-on" : ""}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post({ action: "member", admin_id: id, active: !active });
        setBusy(false);
        router.refresh();
      }}
    >
      <span className="adm-switch__knob" />
      <span className="adm-switch__label">{active ? "当番に入る" : "外している"}</span>
    </button>
  );
}

// ---------- 会社の休み ----------

export function HolidayEditor({ holidays }: { holidays: { day: string; name: string | null }[] }) {
  const router = useRouter();
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="mg-holidays">
      <ul>
        {holidays.length === 0 && <li className="adm-muted">登録はまだありません。</li>}
        {holidays.map((h) => (
          <li key={h.day}>
            <strong>{dayLabel(h.day)}</strong>
            <span>{h.name ?? "会社の休み"}</span>
            <button
              type="button"
              className="adm-linkbtn is-danger"
              onClick={async () => {
                await post({ action: "holiday_remove", day: h.day });
                router.refresh();
              }}
            >
              消す
            </button>
          </li>
        ))}
      </ul>
      <div className="mg-holidays__add">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-label="休みの日" />
        <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="名前（例：年末年始休業）" aria-label="休みの名前" />
        <button
          type="button"
          className="adm-chipbtn"
          disabled={!day}
          onClick={async () => {
            const err = await post({ action: "holiday", day, name });
            if (err) return setError(err);
            setDay("");
            setName("");
            setError("");
            router.refresh();
          }}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> 休みを足す
        </button>
      </div>
      {error && <small className="adm-crm-error">{error}</small>}
    </div>
  );
}
