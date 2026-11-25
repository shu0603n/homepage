import Link from "next/link";
import { avatarUrl } from "@/components/admin/AdminAvatar";
import { HolidayEditor, MemberToggle, MorningGarden, MorningToday, type Spot } from "@/components/admin/MorningClient";
import { morningView, type MorningDay } from "@/lib/admin/morning";
import type { AdminSession } from "@/lib/admin/session";
import { todayJst } from "@/lib/jp-holidays";
import { byMorningOrder } from "@/lib/morning-order";

// 朝礼（管理ページの ?tab=morning。いまは特級の管理者だけ）。&month=YYYY-MM で月を切り替える。仕組みは lib/admin/morning.ts
// ほかのメニューと同じ管理ページのタブにして、移るときに左のメニューごと読み直さないようにしている
const toSpot = (day: string, off: string | null, r: MorningDay | null): Spot => ({
  day,
  off,
  status: r?.status ?? null,
  mc: r?.mc_id ?? null,
  presenter: r?.presenter_id ?? null,
  commenter: r?.commenter_id ?? null,
  absent: r?.absent_ids ?? [],
  presentation: r?.presentation ?? null,
  presentationBy: r?.presentation_by ?? null,
  comment: r?.comment ?? null,
  commentBy: r?.comment_by ?? null,
});
const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (month: string) => `${Number(month.slice(0, 4))}年${Number(month.slice(5))}月`;
const dayLabel = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`;


// いちばん古い月（2026年9月以前の記録は使わないので、そこへは移れない）
const FIRST_MONTH = "2026-10";

export async function MorningTab({ session, month: param }: { session: AdminSession; month?: string }) {
  const thisMonth = todayJst().slice(0, 7);
  const asked = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : thisMonth;
  const month = asked < FIRST_MONTH ? FIRST_MONTH : asked > thisMonth ? thisMonth : asked;
  const v = await morningView(month);
  const people = v.members.map((m) => ({ id: m.id, name: m.name, avatar: avatarUrl(m.id, m.avatar) }));
  const spots = v.spots.map((s) => toSpot(s.day, s.off, s.record));
  const held = spots.filter((s) => s.status === "held" && s.day <= v.today);
  const bloomed = held.filter((s) => s.presentation && s.comment).length;
  const buds = held.filter((s) => !!s.presentation !== !!s.comment).length;
  const todaySpot = v.todayRecord ? toSpot(v.today, null, v.todayRecord) : null;
  // 今月の花・つぼみ・朝礼のあった日（今月は「次の朝礼」の下に縦に、ほかの月は草原の下に出す）
  const stats = (
    <div className="mg-stats">
      <span>
        <i className="bi bi-flower1" aria-hidden="true" /> 花 <strong>{bloomed}</strong>
      </span>
      <span>
        <i className="bi bi-flower3" aria-hidden="true" /> つぼみ <strong>{buds}</strong>
      </span>
      <span>
        <i className="bi bi-calendar-check" aria-hidden="true" /> 朝礼のあった日 <strong>{held.length}</strong>
      </span>
    </div>
  );

  return (
    <div className="adm-stack">
      <div className="mg-monthbar">
        {month > FIRST_MONTH ? (
          <Link href={`/admin/?tab=morning&month=${shift(month, -1)}`} className="adm-chipbtn">
            <i className="bi bi-chevron-left" aria-hidden="true" /> {monthLabel(shift(month, -1))}
          </Link>
        ) : (
          <span className="mg-monthbar__spacer" />
        )}
        <h2>{monthLabel(month)}</h2>
        {month < thisMonth ? (
          <Link href={`/admin/?tab=morning&month=${shift(month, 1)}`} className="adm-chipbtn">
            {monthLabel(shift(month, 1))} <i className="bi bi-chevron-right" aria-hidden="true" />
          </Link>
        ) : (
          <span className="mg-monthbar__spacer" />
        )}
      </div>
      <MorningGarden spots={spots} people={people} today={v.today} selfId={session.id} canErase={session.role === "super"} />
      {month !== thisMonth && stats}
      {month === thisMonth && (
        <MorningToday
          spot={todaySpot}
          offReason={v.todayOff}
          people={people}
          members={v.members.filter((m) => m.active).map((m) => m.id)}
          selfId={session.id}
          canErase={session.role === "super"}
          next={{ day: v.next.day, mc: v.next.roles.mc, presenter: v.next.roles.presenter, commenter: v.next.roles.commenter }}
        >
          {stats}
        </MorningToday>
      )}
      <section className="adm-card">
        <p className="adm-card__en">Holidays</p>
        <h2 className="adm-card__title">会社の休み</h2>
        <p className="adm-card__help">土日と祝日（振替休日を含む）は自動でお休みになります。それ以外の会社のお休み（年末年始・夏季休業など）をここに足すと、その日は朝礼がない日になります。</p>
        <HolidayEditor holidays={v.holidays} />
      </section>
      {/* 担当した回数（特級の管理者だけ） */}
      {session.role === "super" && (
        <section className="adm-card">
          <p className="adm-card__en">Members</p>
          <h2 className="adm-card__title">
            担当した回数
            <em className="adm-role adm-role--super mg-superonly">
              <i className="bi bi-lock-fill" aria-hidden="true" /> 特級管理者のみ閲覧可能
            </em>
          </h2>
          <p className="adm-card__help">朝礼のあった日に担当した回数です（いなかった日・朝礼なしの日は数えません）。回数の少ない人から、新しいコメントの担当に選ばれます。当番から外す人（長期のお休みなど）は、右のスイッチで外せます。</p>
          <div className="adm-tablewrap">
            <table className="adm-table mg-members">
              <thead>
                <tr>
                  <th>名前</th>
                  <th>司会</th>
                  <th>発表</th>
                  <th>コメント</th>
                  <th>合計</th>
                  <th>最後に担当</th>
                  <th>当番</th>
                </tr>
              </thead>
              <tbody>
                {byMorningOrder(v.members, (m) => m.name).map((m) => (
                    <tr key={m.id} className={m.active ? undefined : "is-off"}>
                      <td>{m.name}</td>
                      <td>{m.mc}</td>
                      <td>{m.presenter}</td>
                      <td>{m.commenter}</td>
                      <td>
                        <strong>{m.total}</strong>
                      </td>
                      <td>{m.last ? dayLabel(m.last) : "－"}</td>
                      <td>
                        <MemberToggle id={m.id} active={m.active} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
