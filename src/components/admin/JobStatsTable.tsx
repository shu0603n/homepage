"use client";

import { Fragment, useState } from "react";

// 「案件の反応」の案件ごとの表。「気になる」の人数を押すと、その行のすぐ下に横いっぱいの行が開き、入れた人を一覧で見られる
// （列の幅は変わらない。もう一度押すと閉じる。いくつでも同時に開ける）

export type JobStatsTableRow = {
  key: string;
  kind: "project" | "recruit";
  title: string;
  href: string | null; // 掲載中ならホームページの案件ページ
  listViews: number;
  clicks: number;
  detailViews: number;
  favorites: number;
  applications: number;
  users: { key: string; name: string | null; tel: string | null; mail: string | null; addedAt: string }[];
};

const fmt = (n: number) => n.toLocaleString("ja-JP");
const rate = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");
const COLUMNS = 7;

export function JobStatsTable({ rows }: { rows: JobStatsTableRow[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="adm-tablewrap">
      <table className="adm-table adm-jobs">
        <thead>
          <tr>
            <th>案件</th>
            <th>一覧での表示</th>
            <th>クリック</th>
            <th>クリック率</th>
            <th>詳細の閲覧</th>
            <th>気になる</th>
            <th>HPからの応募</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open.has(r.key);
            return (
              <Fragment key={r.key}>
                <tr className={`${r.href ? "" : "is-ended"}${isOpen ? " is-open" : ""}`}>
                  <td>
                    <div className="adm-jobs__name">
                      <span className={`adm-pill adm-pill--${r.kind === "project" ? "employers" : "seekers"}`}>{r.kind === "project" ? "派遣など" : "人材紹介"}</span>
                      {r.href ? (
                        <a className="adm-jobs__title" href={r.href} target="_blank" rel="noopener">
                          {r.title}
                        </a>
                      ) : (
                        <span className="adm-jobs__title">{r.title}</span>
                      )}
                      {!r.href && <em className="adm-jobs__ended">掲載終了</em>}
                    </div>
                  </td>
                  <td>{fmt(r.listViews)}</td>
                  <td>{fmt(r.clicks)}</td>
                  <td>{rate(r.clicks, r.listViews)}</td>
                  <td>{fmt(r.detailViews)}</td>
                  <td>
                    {r.favorites === 0 ? (
                      <span className="adm-jobs__zero">0</span>
                    ) : (
                      <button type="button" className={`adm-favbtn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-controls={`fav-${r.key}`} onClick={() => toggle(r.key)}>
                        <i className="bi bi-heart-fill" aria-hidden="true" />
                        {fmt(r.favorites)}人
                        <i className={`bi ${isOpen ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                  <td>{fmt(r.applications)}</td>
                </tr>
                {isOpen && (
                  <tr className="adm-jobs__detail" id={`fav-${r.key}`}>
                    <td colSpan={COLUMNS}>
                      <div className="adm-favlist">
                        <p className="adm-favlist__title">
                          <i className="bi bi-heart-fill" aria-hidden="true" />
                          「{r.title}」を気になるに入れた人（{fmt(r.favorites)}人）
                        </p>
                        <table className="adm-favlist__table">
                          <thead>
                            <tr>
                              <th>お名前</th>
                              <th>電話番号</th>
                              <th>メール</th>
                              <th>追加した日時</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.users.map((u) => (
                              <tr key={u.key}>
                                <td data-label="お名前">{u.name ?? "（お名前未登録）"}</td>
                                <td data-label="電話番号">{u.tel ? <a href={`tel:${u.tel.replace(/[^\d+]/g, "")}`}>{u.tel}</a> : "—"}</td>
                                <td data-label="メール">{u.mail ? <a href={`mailto:${u.mail}`}>{u.mail}</a> : "—"}</td>
                                <td data-label="追加した日時">{u.addedAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {r.users.length < r.favorites && <p className="adm-favlist__more">ほか {r.favorites - r.users.length} 人（スタッフ情報が削除・変更された方）</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
