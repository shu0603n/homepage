"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/jobs/JobsExplorer";
import type { JobCard, RecruitCard } from "@/lib/jobs";

// 「気になる」に入れた案件の一覧。♡を外すと、その場で一覧から消える
export function FavoritesList({ items, ended }: { items: (JobCard | RecruitCard)[]; ended: number }) {
  const [list, setList] = useState(items);

  return (
    <div className="jobs">
      <div className="jobs__bar">
        <p className="jobs__count" role="status">
          気になる案件 {list.length} 件
        </p>
        <Link className="jobs__favlink" href="/jobs/">
          <i className="bi bi-search" aria-hidden="true" />
          案件一覧に戻る
        </Link>
      </div>
      {ended > 0 && <p className="jobs__note">掲載が終了した案件が {ended} 件あります（募集が終わったため、一覧には表示していません）。</p>}
      {list.length === 0 ? (
        <div className="jobs__empty">
          <p>
            まだ「気になる」に入れた案件はありません。
            <br />
            案件一覧で ♡ を押すと、ここに集まります。
          </p>
          <Link className="btn" href="/jobs/">
            案件一覧を見る
          </Link>
        </div>
      ) : (
        <div className="jobs__list">
          {list.map((item) => (
            <Card
              key={`${item.kind}-${item.id}`}
              item={item}
              favorite
              onFavorite={(on) => {
                if (!on) setList((prev) => prev.filter((i) => !(i.kind === item.kind && i.id === item.id)));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
