// 読み込み中に出す「仮の画面」（灰色の帯がゆっくり光る）。
// 押した直後にこれを出すことで、次の画面の準備ができるまで何も起きないように見える時間をなくす

// 数字のカードと表の形の仮表示（Google のデータを待つ間など、本文の中だけ）
export function AdminPanelSkeleton({ kpis = 4, cards = 2 }: { kpis?: number; cards?: number }) {
  return (
    <div className="adm-stack" aria-busy="true" aria-label="読み込み中">
      <div className="adm-skel adm-skel--summary" />
      <div className="adm-kpis">
        {Array.from({ length: kpis }, (_, i) => (
          <div key={i} className="adm-kpi">
            <span className="adm-skel adm-skel--line" style={{ width: "55%" }} />
            <span className="adm-skel adm-skel--big" />
            <span className="adm-skel adm-skel--line" style={{ width: "80%" }} />
          </div>
        ))}
      </div>
      <div className="adm-grid2">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="adm-card">
            <span className="adm-skel adm-skel--line" style={{ width: "40%" }} />
            {Array.from({ length: 5 }, (_, j) => (
              <span key={j} className="adm-skel adm-skel--line" style={{ width: `${90 - j * 12}%` }} />
            ))}
          </div>
        ))}
      </div>
      <p className="adm-loading">
        <span className="adm-loading__dot" aria-hidden="true" />
        データを読み込んでいます…
      </p>
    </div>
  );
}

// 画面ごと切り替わるときの仮表示（左のメニュー＋本文）
export function AdminShellSkeleton() {
  return (
    <div className="admin-shell">
      <div className="adm">
        <aside className="adm-side">
          <span className="adm-side__logo">
            <img src="/assets/img/logo-header-white.png" alt="EMORISLINK" width={341} height={84} />
            <span>ADMIN</span>
          </span>
          <div className="adm-nav">
            <div className="adm-nav__group">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="adm-skel adm-skel--nav" />
              ))}
            </div>
          </div>
        </aside>
        <div className="adm-body">
          <header className="adm-head">
            <span className="adm-skel adm-skel--line" style={{ width: 120 }} />
            <span className="adm-skel adm-skel--title" />
          </header>
          <AdminPanelSkeleton />
        </div>
      </div>
    </div>
  );
}
