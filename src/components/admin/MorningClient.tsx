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
  presentationBy: number | null; // 書いた人（本人でなければ代筆）
  comment: string | null;
  commentBy: number | null;
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

// 木の葉のかたまり（中心 x, y と半径）。暗い色 → 明るい色 → 光の順に重ねて、もこもこした立体に見せる
const CANOPY: [number, number, number][] = [
  [600, 130, 96],
  [508, 170, 80],
  [694, 165, 86],
  [446, 222, 60],
  [758, 220, 62],
  [540, 86, 62],
  [662, 82, 66],
  [600, 62, 54],
  [528, 240, 70],
  [672, 242, 72],
  [600, 212, 80],
  [392, 252, 40],
  [808, 256, 42],
];
// 地平線の森（x, 高さ, 形 0=丸い木 1=とがった木）
const FOREST: [number, number, number][] = Array.from({ length: 34 }, (_, i) => {
  const x = i < 17 ? 10 + i * 24 + ((i * 7) % 9) : 770 + (i - 17) * 26 + ((i * 5) % 9);
  return [x, 16 + ((i * 13) % 14), i % 4 === 1 ? 1 : 0];
});
// 草原の小さな白い花（x, y, 大きさ）
const DAISIES: [number, number, number][] = [
  [42, 470, 1],
  [70, 488, 0.8],
  [30, 600, 1.1],
  [120, 618, 0.9],
  [300, 630, 0.8],
  [470, 618, 0.9],
  [1150, 452, 1],
  [1172, 470, 0.8],
  [1120, 600, 1.1],
  [1168, 622, 1],
  [1060, 628, 0.8],
  [760, 630, 0.8],
  [880, 432, 0.7],
  [320, 430, 0.7],
];

function Daisy({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {Array.from({ length: 6 }, (_, k) => (
        <ellipse key={k} rx="2.6" ry="5" cy="-4.5" fill="#fff" transform={`rotate(${k * 60})`} />
      ))}
      <circle r="2.6" fill="#ffd23f" />
    </g>
  );
}

export function MorningGarden({ spots, people, today, selfId, canErase = false }: { spots: Spot[]; people: Person[]; today: string; selfId: number; canErase?: boolean }) {
  const [openDay, setOpen] = useState<string | null>(null);
  const open = openDay ? (spots.find((s) => s.day === openDay) ?? null) : null;
  const held = spots.filter((s) => s.status === "held" && s.day <= today);
  const bloomed = held.filter((s) => s.presentation && s.comment).length;
  // その月の朝礼が全部終わって、全部の日に花が咲いたら満開（木に花が咲いて、花びらが舞う）
  const full = held.length > 0 && bloomed === held.length && !spots.some((s) => !s.off && s.day > today);
  // 今月の達成状況：朝礼のある日（朝礼なしの日・お休みを除く。これからの日も含む）のうち、花が咲いた日
  const goal = spots.filter((s) => !s.off && s.status !== "skipped").length;
  const pct = goal ? Math.round((bloomed / goal) * 100) : 0;
  // 花壇：3段に並べ、左から日付順。手前の段ほど少し大きく
  const placed = useMemo(() => {
    const cols = Math.max(1, Math.ceil(spots.length / 3));
    return spots.map((s, i) => {
      const col = Math.floor(i / 3);
      const row = i % 3;
      const x = 90 + ((col + 0.5) / cols) * 1020 + jitter(s.day, 1) * 14;
      const y = 436 + row * 92 + jitter(s.day, 2) * 5;
      return { s, x, y, scale: 0.92 + row * 0.08 };
    });
  }, [spots]);
  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <div className="mg">
      <svg className="mg-scene" viewBox="0 0 1200 660" role="img" aria-label={`今月の朝礼の花（咲いた花 ${bloomed}）`}>
        <defs>
          <linearGradient id="mg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6fc2f3" />
            <stop offset=".55" stopColor="#b9e4fb" />
            <stop offset="1" stopColor="#eef9ef" />
          </linearGradient>
          <radialGradient id="mg-sunglow">
            <stop offset="0" stopColor="#fffbe3" stopOpacity="1" />
            <stop offset=".35" stopColor="#fff1a8" stopOpacity=".75" />
            <stop offset="1" stopColor="#fff1a8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mg-sun" cx=".42" cy=".4">
            <stop offset="0" stopColor="#fffef2" />
            <stop offset=".6" stopColor="#fff2a6" />
            <stop offset="1" stopColor="#ffd863" />
          </radialGradient>
          <linearGradient id="mg-hill-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fcfa2" />
            <stop offset="1" stopColor="#b7e2bd" />
          </linearGradient>
          <linearGradient id="mg-hill-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6fbb6d" />
            <stop offset="1" stopColor="#9ad283" />
          </linearGradient>
          <linearGradient id="mg-meadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a8dc6c" />
            <stop offset=".45" stopColor="#80c853" />
            <stop offset="1" stopColor="#56a63c" />
          </linearGradient>
          <radialGradient id="mg-light">
            <stop offset="0" stopColor="#f4ffd0" stopOpacity=".55" />
            <stop offset="1" stopColor="#f4ffd0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mg-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b3a22" />
            <stop offset=".45" stopColor="#8a5a36" />
            <stop offset="1" stopColor="#4e311c" />
          </linearGradient>
          <radialGradient id="mg-soil" cx=".5" cy=".3" r=".7">
            <stop offset="0" stopColor="#a97c55" />
            <stop offset=".7" stopColor="#80583a" />
            <stop offset="1" stopColor="#5f3f27" />
          </radialGradient>
          <filter id="mg-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="mg-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* 空と太陽 */}
        <rect width="1200" height="660" fill="url(#mg-sky)" />
        <circle className="mg-sunglow" cx="1050" cy="215" r="170" fill="url(#mg-sunglow)" />
        <circle cx="1050" cy="215" r="54" fill="url(#mg-sun)" />

        {/* 雲 */}
        {(
          [
            [150, 150, 0.9, 80],
            [470, 110, 0.7, 110],
            [820, 70, 0.6, 95],
            [1080, 290, 0.75, 120],
          ] as const
        ).map(([x, y, s, dur], i) => (
          <g key={i} className="mg-cloud" style={{ animationDuration: `${dur}s`, animationDelay: `${-i * 23}s` }}>
            <g transform={`translate(${x} ${y}) scale(${s})`}>
              <ellipse cx="4" cy="16" rx="98" ry="20" fill="#d9ecf8" />
              <ellipse cx="-50" cy="6" rx="46" ry="26" fill="#fff" />
              <ellipse cx="0" cy="-8" rx="52" ry="38" fill="#fff" />
              <ellipse cx="52" cy="2" rx="46" ry="30" fill="#fff" />
              <ellipse cx="-12" cy="-22" rx="28" ry="18" fill="#fff" opacity=".9" />
              <ellipse cx="8" cy="18" rx="92" ry="12" fill="#eef7fd" />
            </g>
          </g>
        ))}

        {/* 遠くの山と丘 */}
        <path d="M0 330 C 90 268 190 246 300 286 C 380 316 450 318 540 300 C 650 280 720 300 820 270 C 920 240 1010 226 1110 262 C 1150 276 1180 292 1200 300 V 660 H 0 Z" fill="url(#mg-hill-far)" opacity=".85" />
        <path d="M0 352 C 130 312 250 306 370 336 C 470 360 560 352 650 340 C 770 326 860 348 960 330 C 1060 314 1140 318 1200 330 V 660 H 0 Z" fill="url(#mg-hill-mid)" />

        {/* 地平線の森 */}
        {FOREST.map(([x, h, pointed], i) =>
          pointed ? (
            <path key={`f${i}`} d={`M${x} ${360 - h * 1.6} l ${h * 0.55} ${h * 1.6} h ${-h * 1.1} Z`} fill={i % 2 ? "#3f8648" : "#4a9450"} />
          ) : (
            <g key={`f${i}`}>
              <rect x={x - 1.5} y={354 - h * 0.4} width="3" height={h * 0.5} fill="#5b4630" />
              <circle cx={x} cy={356 - h} r={h * 0.72} fill={i % 3 ? "#4f9a4e" : "#5ea957"} />
              <circle cx={x - h * 0.22} cy={356 - h * 1.18} r={h * 0.32} fill="#79bd62" opacity=".7" />
            </g>
          ),
        )}

        {/* 草原 */}
        <path d="M0 370 C 200 350 420 360 600 368 C 800 376 1000 352 1200 362 V 660 H 0 Z" fill="url(#mg-meadow)" />
        <ellipse cx="300" cy="420" rx="260" ry="40" fill="url(#mg-light)" />
        <ellipse cx="930" cy="440" rx="240" ry="36" fill="url(#mg-light)" />
        <ellipse cx="600" cy="560" rx="380" ry="60" fill="url(#mg-light)" opacity=".6" />

        {/* 大きな木 */}
        <ellipse cx="604" cy="398" rx="190" ry="22" fill="#2f6b23" opacity=".35" filter="url(#mg-blur)" />
        <g className="mg-tree">
          <path d="M528 402 C 552 396 566 384 572 360 C 578 330 576 300 566 270 L 596 262 C 602 290 604 316 604 340 C 606 314 614 288 628 262 L 656 272 C 640 300 634 330 636 360 C 640 384 654 396 680 402 C 640 410 570 410 528 402 Z" fill="url(#mg-trunk)" />
          <path d="M540 404 C 556 398 562 392 566 384 M666 404 C 650 398 644 392 640 384 M604 408 V 392" stroke="#4e311c" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M582 300 C 552 272 512 262 470 232" stroke="#6b4428" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M628 296 C 664 270 704 262 744 230" stroke="#6b4428" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M600 300 C 598 250 600 210 604 170" stroke="#6b4428" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M590 344 C 594 320 598 304 600 290" stroke="#a87a50" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5" />
          <g className="mg-canopy">
            {CANOPY.map(([cx, cy, r], i) => (
              <circle key={`d${i}`} cx={cx + 6} cy={cy + 10} r={r} fill="#357d34" />
            ))}
            {CANOPY.map(([cx, cy, r], i) => (
              <circle key={`m${i}`} cx={cx} cy={cy} r={r * 0.94} fill={i % 2 ? "#59ab45" : "#63b44b"} />
            ))}
            {CANOPY.map(([cx, cy, r], i) => (
              <circle key={`l${i}`} cx={cx - r * 0.22} cy={cy - r * 0.26} r={r * 0.62} fill="#7cc55a" opacity=".5" />
            ))}
            {CANOPY.map(([cx, cy, r], i) => (
              <circle key={`h${i}`} cx={cx - r * 0.34} cy={cy - r * 0.42} r={r * 0.3} fill="#a8dc78" opacity=".32" />
            ))}
            {/* 葉っぱの細かい模様 */}
            {Array.from({ length: 26 }, (_, i) => (
              <circle key={`t${i}`} cx={410 + ((i * 67) % 380)} cy={50 + ((i * 41) % 250)} r={9 + (i % 3) * 4} fill={i % 2 ? "#4f9d40" : "#86cb5e"} opacity=".28" />
            ))}
            {full &&
              Array.from({ length: 52 }, (_, i) => (
                <g key={`b${i}`} transform={`translate(${420 + ((i * 53) % 360)} ${60 + ((i * 37) % 240)})`}>
                  <g className="mg-blossom" style={{ animationDelay: `${(i % 9) * 0.12}s` }}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <ellipse key={k} rx="3.4" ry="5.5" cy="-4.5" fill={i % 2 ? "#ffd0e4" : "#ff9cc9"} transform={`rotate(${k * 72})`} />
                    ))}
                    <circle r="2.4" fill="#fff3a8" />
                  </g>
                </g>
              ))}
          </g>
        </g>
        {full &&
          Array.from({ length: 22 }, (_, i) => (
            <ellipse key={`p${i}`} className="mg-petal" style={{ animationDelay: `${i * 0.55}s`, animationDuration: `${7 + (i % 4)}s` }} cx={360 + i * 24} cy={150} rx="6" ry="4" fill="#ffb3d6" />
          ))}

        {/* 草と小さな花 */}
        {Array.from({ length: 70 }, (_, i) => {
          const x = 8 + ((i * 97) % 1190);
          const y = 392 + ((i * 53) % 262);
          const h = 7 + (i % 4) * 2;
          return <path key={`g${i}`} d={`M${x} ${y} q -3 ${-h * 0.6} -6 ${-h} M${x} ${y} q 0 ${-h * 0.7} 1 ${-h * 1.25} M${x} ${y} q 3 ${-h * 0.6} 7 ${-h * 0.9}`} stroke={i % 3 ? "#4b9a3a" : "#3c8530"} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".6" />;
        })}
        {DAISIES.map(([x, y, s], i) => (
          <Daisy key={`dz${i}`} x={x} y={y} s={s} />
        ))}

        {/* 日ごとの花壇 */}
        {placed.map(({ s, x, y, scale }) => {
          const isToday = s.day === today;
          const n = (s.presentation ? 1 : 0) + (s.comment ? 1 : 0);
          const kind = s.off ? "off" : s.status === "skipped" ? "skipped" : s.status === null ? (s.day < today ? "empty" : "future") : n === 2 ? "bloom" : n === 1 ? "bud" : "sprout";
          const color = petalOf(s.day);
          const clickable = kind !== "future" && (kind !== "empty" || canErase); // 記録のない過去の日は、特級の管理者が登録できる
          return (
            <g
              key={s.day}
              className={`mg-spot is-${kind}${isToday ? " is-today" : ""}`}
              transform={`translate(${x} ${y}) scale(${scale})`}
              onClick={clickable ? () => setOpen(s.day) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(s.day)) : undefined}
              aria-label={`${dayLabel(s.day)}：${kind === "bloom" ? "花" : kind === "bud" ? "つぼみ" : kind === "sprout" ? "芽" : kind === "skipped" ? "朝礼なし" : kind === "off" ? s.off : kind === "empty" ? "記録なし" : "これから"}`}
            >
              <title>{`${dayLabel(s.day)}${s.off ? `（${s.off}）` : kind === "skipped" ? "（朝礼なし）" : ""}`}</title>
              {/* 今日：光る輪 */}
              {isToday && (
                <>
                  <circle cy="-14" r="46" fill="#fffbe0" opacity=".28" />
                  <circle className="mg-todayring" cy="-14" r="46" fill="none" stroke="#fff" strokeWidth="3" />
                  <circle cy="-14" r="46" fill="none" stroke="#fff" strokeWidth="3.5" />
                </>
              )}
              {/* 土の盛り */}
              <g className="mg-mound">
                <ellipse cy="6" rx="38" ry="11" fill="#2f6b23" opacity=".3" filter="url(#mg-soft)" />
                <ellipse rx="34" ry="14" fill="url(#mg-soil)" />
                <ellipse cy="-4" rx="26" ry="7" fill="#b88a60" opacity=".55" />
                <path d="M-30 -2 q 4 -3 7 0 M22 -4 q 4 -3 7 0 M-8 6 q 3 -2 6 0" stroke="#5b8f2f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>
              {kind === "off" && (
                <g>
                  <ellipse cx="-6" cy="-6" rx="7" ry="5" fill="#b5bcc0" />
                  <ellipse cx="6" cy="-4" rx="5" ry="4" fill="#cfd5d8" />
                </g>
              )}
              {kind === "empty" && (
                <g className="mg-empty">
                  <circle cy="-22" r="13" fill="#ffffff" fillOpacity=".4" stroke="#ffffff" strokeWidth="2" strokeDasharray="4 3" />
                  {canErase && <path d="M-5.5 -22 h11 M0 -27.5 v11" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />}
                </g>
              )}
              {/* 朝礼なし（人数不足など）の日：専用の花（うつむいた水色の釣鐘草） */}
              {kind === "skipped" && (
                <g className="mg-plant mg-rest">
                  <path d="M0 -4 C 0 -24 4 -38 16 -42" stroke="#3a8a35" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M0 -12 C -10 -14 -20 -22 -22 -30 C -10 -30 -3 -22 0 -14 Z" fill="#5cb04c" />
                  <path d="M2 -26 C -4 -34 -4 -42 -12 -50" stroke="#3a8a35" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                  <g transform="translate(16 -42)">
                    <path d="M0 0 C -9 2 -12 12 -11 20 C -7 23 -3 20 0 24 C 3 20 7 23 11 20 C 12 12 9 2 0 0 Z" fill="#8fb4ee" />
                    <path d="M-2 3 C -6 8 -7 14 -6 19" stroke="#fff" strokeOpacity=".5" strokeWidth="2" fill="none" />
                    <circle cy="23" r="2" fill="#f6e27a" />
                  </g>
                  <g transform="translate(-12 -50) scale(.75)">
                    <path d="M0 0 C -9 2 -12 12 -11 20 C -7 23 -3 20 0 24 C 3 20 7 23 11 20 C 12 12 9 2 0 0 Z" fill="#a9c4f3" />
                    <circle cy="23" r="2" fill="#f6e27a" />
                  </g>
                </g>
              )}
              {(kind === "sprout" || kind === "bud" || kind === "bloom") && (
                <g className="mg-plant">
                  {kind === "sprout" ? (
                    <>
                      <path d="M0 -4 V -16" stroke="#3a8a35" strokeWidth="3" strokeLinecap="round" />
                      <path d="M0 -14 C -4 -24 -16 -26 -20 -20 C -14 -14 -6 -12 0 -14 Z" fill="#5cbb4f" />
                      <path d="M0 -16 C 4 -27 17 -29 21 -22 C 15 -16 6 -14 0 -16 Z" fill="#78cc5c" />
                    </>
                  ) : (
                    <>
                      <path d={`M0 -4 C 2 -18 -2 -30 0 ${kind === "bud" ? -38 : -44}`} stroke="#3a8a35" strokeWidth="3.4" strokeLinecap="round" fill="none" />
                      <path d="M0 -10 C -10 -12 -22 -20 -24 -28 C -12 -28 -4 -20 0 -12 Z" fill="#4fae46" />
                      <path d="M0 -16 C 10 -18 22 -26 24 -34 C 12 -34 4 -26 0 -18 Z" fill="#6cc356" />
                    </>
                  )}
                  {kind === "bud" && (
                    <g transform="translate(0 -40)">
                      <g className="mg-bud">
                        <path d="M0 -24 C 10 -18 12 -6 8 2 C 4 6 -4 6 -8 2 C -12 -6 -10 -18 0 -24 Z" fill={color} />
                        <path d="M0 -24 C 4 -16 4 -4 2 4" stroke="#fff" strokeOpacity=".45" strokeWidth="2" fill="none" />
                        <path d="M-9 0 C -6 6 6 6 9 0 C 5 3 -5 3 -9 0 Z M-9 0 C -10 -6 -7 -8 -4 -4 Z M9 0 C 10 -6 7 -8 4 -4 Z" fill="#4fae46" />
                      </g>
                    </g>
                  )}
                  {kind === "bloom" && (
                    <g transform="translate(0 -50)">
                      <g className="mg-bloom">
                        {Array.from({ length: 5 }, (_, k) => (
                          <g key={k} transform={`rotate(${k * 72})`}>
                            <ellipse rx="10" ry="13" cy="-12" fill={color} />
                            <ellipse rx="4" ry="6" cy="-15" fill="#fff" opacity=".35" />
                          </g>
                        ))}
                        <circle r="8.5" fill="#ffd23f" />
                        <circle r="8.5" fill="none" stroke="#f0a91c" strokeWidth="1.5" />
                        <circle cx="-2.5" cy="-2.5" r="3" fill="#fff6c2" />
                      </g>
                      <g className="mg-sparkle" stroke="#ffd23f" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M22 -22 l 5 -7 M28 -12 l 8 -2 M14 -28 l 1 -8" />
                      </g>
                    </g>
                  )}
                </g>
              )}
              <text y="8" textAnchor="middle" className="mg-daynum">
                {Number(s.day.slice(8))}
              </text>
            </g>
          );
        })}

        {/* 手前の葉っぱ（左下・右下） */}
        <g opacity=".95">
          {(
            [
              [-10, 650, -30, 1.1],
              [40, 660, 10, 0.9],
              [1210, 650, 30, 1.1],
              [1160, 662, -12, 0.9],
            ] as const
          ).map(([x, y, rot, s], i) => (
            <g key={`lf${i}`} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
              <path d="M0 0 C -30 -30 -24 -70 0 -96 C 24 -70 30 -30 0 0 Z" fill={i % 2 ? "#4e9e3c" : "#3f8a33"} />
              <path d="M0 -4 V -88" stroke="#79c05a" strokeWidth="2" opacity=".7" />
              <path d="M0 0 C -40 -14 -60 -44 -62 -70 C -30 -60 -12 -36 0 0 Z" fill="#5aad45" />
              <path d="M0 0 C 40 -14 60 -44 62 -70 C 30 -60 12 -36 0 0 Z" fill="#64b84b" />
            </g>
          ))}
        </g>
      </svg>
      <div className="mg-progress">
        <span className="mg-progress__icon" aria-hidden="true">
          🌸
        </span>
        <div>
          <p>今月の達成状況</p>
          <strong>
            {bloomed} / {goal} 日
          </strong>
          <div className="mg-progress__bar">
            <span className="mg-progress__track">
              <span style={{ width: `${pct}%` }} />
            </span>
            <em>{pct}%</em>
          </div>
        </div>
      </div>
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
        ) : spot.status === null ? (
          <>
            <p className="adm-muted">この日の記録はまだありません。当番を選んで登録すると、発表・コメントも書けるようになります。朝礼をしなかった日は、いちばん下の「朝礼なし（人数不足など）として登録」を押してください。</p>
            {canErase && <AssignRoles key={spot.day} spot={spot} people={people} startOpen submitLabel="この日を登録する" />}
            {canErase && <SkipPast day={spot.day} skip label="朝礼なし（人数不足など）として登録" />}
          </>
        ) : spot.status === "skipped" ? (
          <>
            <p className="mg-modal__state">🔔 お休みの花（人数不足などで、この日は朝礼なしでした）</p>
            {canErase && spot.day < today && <SkipPast day={spot.day} skip={false} />}
          </>
        ) : (
          <>
            <p className="mg-modal__state">{n === 2 ? "🌸 花が咲きました" : n === 1 ? "🌱 つぼみ（あと1つで花が咲きます）" : "🌱 芽（発表かコメントでつぼみになります）"}</p>
            <RoleList spot={spot} people={people} selfId={selfId} />
            {canErase && <AssignRoles key={`${spot.day}-${spot.mc}-${spot.presenter}-${spot.commenter}`} spot={spot} people={people} />}
            <Entry key={`p-${spot.day}-${spot.presenter}`} spot={spot} kind="presentation" people={people} selfId={selfId} canErase={canErase} />
            <Entry key={`c-${spot.day}-${spot.commenter}`} spot={spot} kind="comment" people={people} selfId={selfId} canErase={canErase} />
            {canErase && spot.day < today && !spot.presentation && !spot.comment && <SkipPast day={spot.day} skip />}
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

// 発表・コメントの欄（担当の本人なら書ける。特級の管理者（canErase）は代筆・削除もできる）
function Entry({ spot, kind, people, selfId, canErase = false }: { spot: Spot; kind: "presentation" | "comment"; people: Map<number, Person>; selfId: number; canErase?: boolean }) {
  const router = useRouter();
  const owner = kind === "presentation" ? spot.presenter : spot.commenter;
  const value = kind === "presentation" ? spot.presentation : spot.comment;
  const by = kind === "presentation" ? spot.presentationBy : spot.commentBy; // 実際に書いた人（代筆した人も、過去の日も書き直せる）
  const mine = spot.status === "held" && (owner === selfId || (!!value && by === selfId));
  const proxy =canErase && spot.status === "held"; // 特級の管理者：だれの担当として書くか選んで代筆できる（選んだ人がその日の担当として保存される）
  const [as, setAs] = useState<number>(owner ?? 0);
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
          {proxy && (
            <label className="mg-entry__as">
              <span>だれの担当として書くか</span>
              <select value={as} onChange={(e) => setAs(Number(e.target.value))}>
                <option value={0}>選んでください</option>
                {[...people.values()]
                  .sort((a, b) => a.name.localeCompare(b.name, "ja"))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.id === owner ? "（この日の担当）" : ""}
                    </option>
                  ))}
              </select>
            </label>
          )}
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
              disabled={busy || !text.trim() || (proxy && !as)}
              onClick={async () => {
                setBusy(true);
                const err = await post({ action: "write", day: spot.day, kind, text, ...(proxy ? { as } : {}) });
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
              {(mine || proxy) && (
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
        <>
          <p className="adm-muted">まだ書かれていません{owner !== null && !mine && !proxy ? "（担当の人だけが書けます）" : ""}。</p>
          {proxy && !mine && (
            <button type="button" className="adm-chipbtn" onClick={() => setEditing(true)}>
              <i className="bi bi-pencil" aria-hidden="true" /> 代筆する
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ---------- 今日の朝礼（当番・自分の欄・いない人・朝礼なし） ----------

// children：次の朝礼の下に縦に並べるもの（今月の花・つぼみの数）
export function MorningToday({ spot, offReason, people, members, selfId, next, canErase = false, children }: { spot: Spot | null; offReason: string | null; people: Person[]; members: number[]; selfId: number; next: { day: string; mc: number | null; presenter: number | null; commenter: number | null }; canErase?: boolean; children?: React.ReactNode }) {
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
                {canErase && <AssignRoles key={`${spot.mc}-${spot.presenter}-${spot.commenter}`} spot={spot} people={byId} />}
                {(spot.presenter === selfId || spot.commenter === selfId || canErase) && (
                  <div className="mg-today__mine">
                    {(spot.presenter === selfId || canErase) && <Entry spot={spot} kind="presentation" people={byId} selfId={selfId} canErase={canErase} />}
                    {(spot.commenter === selfId || canErase) && <Entry spot={spot} kind="comment" people={byId} selfId={selfId} canErase={canErase} />}
                  </div>
                )}
              </>
            )}
            <Attendance spot={spot} members={members} people={byId} busy={busy} onToggle={(id, absent) => run({ action: "absent", admin_id: id, absent })} onSkip={(skip) => run({ action: "skip", skip })} />
            {error && <p className="adm-crm-error">{error}</p>}
          </>
        )}
      </section>
      <div className="mg-side">
        <section className="adm-card mg-next">
          <p className="adm-card__en">Next</p>
          <h2 className="adm-card__title">
            次の朝礼<small>{dayLabel(next.day)}・見込み</small>
          </h2>
          <RoleList spot={next} people={byId} selfId={selfId} />
          <p className="adm-card__help">今日の当番から決めた見込みです。いない人がいれば、当日に「今日はいない」にすると入れ替わります。</p>
        </section>
        {children}
      </div>
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

// 今日の当番を手で決める（特級の管理者。実際の朝礼に合わせるとき）
function AssignRoles({ spot, people, startOpen = false, submitLabel = "この当番にする" }: { spot: Spot; people: Map<number, Person>; startOpen?: boolean; submitLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [roles, setRoles] = useState({ mc: spot.mc ?? 0, presenter: spot.presenter ?? 0, commenter: spot.commenter ?? 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open)
    return (
      <button type="button" className="adm-linkbtn mg-assign__open" onClick={() => setOpen(true)}>
        <i className="bi bi-arrow-left-right" aria-hidden="true" /> 当番を変える
      </button>
    );
  const sorted = [...people.keys()].sort((a, b) => (people.get(a)?.name ?? "").localeCompare(people.get(b)?.name ?? "", "ja"));
  const written = !!(spot.presentation || spot.comment);
  return (
    <div className="mg-assign">
      <p className="adm-card__help">
        実際の朝礼の当番に合わせて選んでください。{spot.status === null ? "" : "今日を変えたときは、次の朝礼からここで決めた当番から順に回ります（今日の発表者 → 次の司会、今日のコメント → 次の発表）。"}
        {written ? "書かれている発表・コメントは、新しく選んだ担当の人のものになります。" : ""}
      </p>
      <div className="mg-assign__row">
        {(
          [
            ["mc", "司会"],
            ["presenter", "発表"],
            ["commenter", "コメント"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <select value={roles[key]} onChange={(e) => setRoles({ ...roles, [key]: Number(e.target.value) })}>
              <option value={0}>選んでください</option>
              {sorted.map((id) => (
                <option key={id} value={id}>
                  {people.get(id)?.name ?? id}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && <small className="adm-crm-error">{error}</small>}
      <div className="mg-entry__foot">
        {!startOpen && (
          <button type="button" className="adm-chipbtn" onClick={() => setOpen(false)}>
            やめる
          </button>
        )}
        <button
          type="button"
          className="adm-chipbtn adm-chipbtn--primary"
          disabled={busy || !roles.mc || !roles.presenter || !roles.commenter}
          onClick={async () => {
            setBusy(true);
            const err = await post({ action: "assign", day: spot.day, ...roles });
            setBusy(false);
            if (err) return setError(err);
            setError("");
            if (!startOpen) setOpen(false);
            router.refresh();
          }}
        >
          <i className="bi bi-check2" aria-hidden="true" /> {busy ? "保存しています…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

// 過去の日を朝礼なしにする・戻す（特級の管理者）
function SkipPast({ day, skip, label }: { day: string; skip: boolean; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="mg-skippast">
      <button
        type="button"
        className={`adm-linkbtn${skip ? " is-danger" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await post({ action: "skip_day", day, skip });
          setBusy(false);
          if (err) return setError(err);
          router.refresh();
        }}
      >
        <i className={`bi ${skip ? "bi-moon-stars" : "bi-sun"}`} aria-hidden="true" /> {label ?? (skip ? "この日は朝礼なしにする" : "朝礼ありに戻す")}
      </button>
      {error && <small className="adm-crm-error">{error}</small>}
    </div>
  );
}
