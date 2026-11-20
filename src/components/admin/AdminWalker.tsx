"use client";

import { useEffect, useRef, useState } from "react";

// 管理ページの下をてくてく歩き、ときどき立ち止まって休憩するキャラクター（飾り）。
// 画像は public/assets/img/character/ に置く（3枚とも同じ高さ・同じ向きの基準で用意すると、足の切り替えが自然に見える）。
//   front.png        … 正面を向いた姿（休憩中）
//   walk-right-1.png … 右向きで右足が前
//   walk-right-2.png … 右向きで左足が前
//   happy.png        … 喜んでいる姿（クリックしたとき、一瞬だけ）
//   fall.png         … 落ちている姿（つかんで持ち上げて離したあと、下に着くまで）
//   lying.png        … 下に着いて倒れた姿（横長の画像。透明な余白は切り詰めておく）
// 左向きは右向きの画像を左右反転して使う。マウス（タッチ）でつかんで動かせる。離すと下に落ちて、休んでからまた歩き出す。画像がまだ無いあいだは何も表示しない
const BASE = "/assets/img/character";
const IMAGES = {
  front: `${BASE}/front.png`,
  step1: `${BASE}/walk-right-1.png`,
  step2: `${BASE}/walk-right-2.png`,
  happy: `${BASE}/happy.png`,
  fall: `${BASE}/fall.png`,
  lying: `${BASE}/lying.png`,
} as const;
type Frame = keyof typeof IMAGES;

const HEIGHT_PX = 100; // キャラクターの高さ
const SPEED_PX_PER_SEC = 55; // 歩く速さ
const STEP_MS = 240; // 足を入れ替える間隔
const WALK_SEC: [number, number] = [6, 14]; // 続けて歩く時間
const REST_SEC: [number, number] = [3, 7]; // 休憩する時間
const REST_CHANCE = 0.7; // 歩き終えたとき、休憩に入る確率（入らなければそのまま歩き続ける）
const EDGE_MARGIN_PX = 8;
const GRAVITY_PX_PER_SEC2 = 2400; // 手を離したときの落ちる勢い
const LIE_SEC: [number, number] = [2, 3.5]; // 着地して倒れている時間
const GETUP_REST_SEC: [number, number] = [0.6, 1.2]; // 起き上がってから歩き出すまでの、立ち止まっている時間
const LYING_WIDTH_PX = 120; // 倒れた姿の横幅（横長の画像なので、高さではなく幅で大きさを決める）
const CHEER_MS = 900; // クリックされたとき、喜んでいる姿を見せる時間
const CLICK_MOVE_PX = 6; // これ以上動かしたら、クリックではなく「つかんで動かした」とみなす

const random = ([min, max]: [number, number]) => min + Math.random() * (max - min);

export function AdminWalker() {
  const rootRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<Record<Frame, HTMLImageElement | null>>({ front: null, step1: null, step2: null, happy: null, fall: null, lying: null });
  const [ready, setReady] = useState(false);
  const [hasFront, setHasFront] = useState(false); // 正面の画像があるか（無いあいだは、休憩中も歩きの画像で代用する）
  const [hasHappy, setHasHappy] = useState(false); // 喜んでいる画像があるか（無いあいだは、クリックしても姿は変わらない）
  const [hasFall, setHasFall] = useState(false); // 落ちている画像があるか（無いあいだは、落ちている間も正面の画像）
  const [hasLying, setHasLying] = useState(false); // 倒れた画像があるか（無いあいだは、着地しても正面の画像）

  // 歩きの2枚が読み込めたときだけ表示する（正面の画像は無くてもよい）
  useEffect(() => {
    let cancelled = false;
    const load = (src: string) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
    Promise.all([load(IMAGES.step1), load(IMAGES.step2), load(IMAGES.front), load(IMAGES.happy), load(IMAGES.fall), load(IMAGES.lying)]).then(([a, b, front, happy, fall, lying]) => {
      if (cancelled || !a || !b) return;
      setHasFront(front);
      setHasHappy(happy);
      setHasFall(fall);
      setHasLying(lying);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const flip = flipRef.current;
    if (!ready || !root || !flip) return;

    const show = (wanted: Frame) => {
      // 画像が無いときの代わり：喜び・落下・倒れ → 正面 → 歩きの1枚目
      let frame: Frame = wanted;
      if ((frame === "happy" && !hasHappy) || (frame === "fall" && !hasFall) || (frame === "lying" && !hasLying)) frame = "front";
      if (frame === "front" && !hasFront) frame = "step1";
      for (const key of Object.keys(IMAGES) as Frame[]) {
        const img = imgRefs.current[key];
        if (img) img.style.display = key === frame ? "block" : "none";
      }
    };
    // 歩ける範囲は、本文の領域（左のメニューを除いた部分）の中
    const bounds = () => {
      const area = document.querySelector(".adm-body")?.getBoundingClientRect();
      const left = (area?.left ?? 0) + EDGE_MARGIN_PX;
      const right = (area?.right ?? window.innerWidth) - root.offsetWidth - EDGE_MARGIN_PX;
      return { min: left, max: Math.max(left, right) };
    };

    // 「動きを減らす」設定の端末では歩かず、正面を向いて右下に立っているだけにする
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show("front");
      root.style.transform = `translate3d(${bounds().max}px,0,0)`;
      return;
    }

    const first = bounds();
    let x = first.min + Math.random() * (first.max - first.min);
    let y = 0; // 下の端から持ち上がっている高さ（つかんで持ち上げたり、落ちている間だけ 0 より大きくなる）
    let vy = 0; // 落ちる速さ
    let dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    let mode: "walk" | "rest" | "fall" | "cheer" | "lie" = "walk";
    let dragging = false;
    let until = performance.now() + random(WALK_SEC) * 1000;
    let nextStep = 0;
    let step: 1 | 2 = 1;
    let last = performance.now();
    let raf = 0;

    const startWalk = (now: number, newDir: 1 | -1) => {
      mode = "walk";
      dir = newDir;
      until = now + random(WALK_SEC) * 1000;
      nextStep = 0;
      root.classList.add("is-walking");
    };
    const startRest = (now: number, seconds: [number, number] = REST_SEC) => {
      mode = "rest";
      until = now + random(seconds) * 1000;
      root.classList.remove("is-walking");
      show("front");
    };

    // ---------- マウス・タッチでつかんで動かす ----------
    // つかんでいる間は正面を向いてぶら下がり、離すと下まで落ちて、少し休んでからまた歩き出す
    let grabX = 0;
    let grabY = 0;
    let downX = 0;
    let downY = 0;
    const moveTo = (clientX: number, clientY: number) => {
      const maxX = Math.max(0, window.innerWidth - root.offsetWidth);
      const maxY = Math.max(0, window.innerHeight - root.offsetHeight);
      x = Math.min(maxX, Math.max(0, clientX - grabX));
      y = Math.min(maxY, Math.max(0, window.innerHeight - clientY - grabY));
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = root.getBoundingClientRect();
      grabX = e.clientX - rect.left;
      grabY = rect.bottom - e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      dragging = true;
      mode = "rest";
      vy = 0;
      root.classList.remove("is-walking");
      root.classList.add("is-dragging");
      show("front");
      root.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) moveTo(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
      vy = 0;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < CLICK_MOVE_PX) {
        // つかんで動かさずに押しただけ（クリック）：喜んでいる姿を一瞬だけ見せる
        mode = "cheer";
        until = performance.now() + CHEER_MS;
        show("happy");
      } else {
        mode = "fall"; // 動かして手を離したら、下まで落ちる（落ちている姿で）
        show("fall");
      }
    };
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // タブを切り替えて戻ったときに飛ばないよう上限をつける
      last = now;
      const { min, max } = bounds();

      if (dragging) {
        // つかまれている間は自分では動かない
      } else if (mode === "fall") {
        vy += GRAVITY_PX_PER_SEC2 * dt;
        y -= vy * dt;
        if (y <= 0) {
          y = 0;
          // 着地したら倒れて、しばらくしてから起き上がる
          mode = "lie";
          until = now + random(LIE_SEC) * 1000;
          root.classList.remove("is-walking");
          show("lying");
        }
      } else if (mode === "cheer") {
        if (now >= until) {
          if (y > 0) {
            mode = "fall"; // 落ちている途中でクリックされたなら、続きを落ちる
            vy = 0;
            show("fall");
          } else {
            startWalk(now, dir); // 喜んだあとは、そのまま歩き出す
          }
        }
      } else if (mode === "lie") {
        if (now >= until) startRest(now, GETUP_REST_SEC); // 起き上がって、少し立ち止まってから歩き出す
      } else if (mode === "walk") {
        if (x < min) dir = 1; // 持ち運ばれて範囲の外に降りたときは、範囲に向かって歩いて戻る
        else if (x > max) dir = -1;
        x += dir * SPEED_PX_PER_SEC * dt;
        if ((dir === 1 && x >= max) || (dir === -1 && x <= min)) {
          x = Math.min(max, Math.max(min, x));
          dir = dir === 1 ? -1 : 1; // 端まで来たら引き返す
          if (Math.random() < 0.5) startRest(now); // 端で一休みすることもある
        }
        if (mode === "walk") {
          if (now >= nextStep) {
            step = step === 1 ? 2 : 1;
            show(step === 1 ? "step1" : "step2");
            nextStep = now + STEP_MS;
          }
          if (now >= until && Math.random() < REST_CHANCE) startRest(now);
          else if (now >= until) until = now + random(WALK_SEC) * 1000;
        }
      } else if (now >= until) {
        startWalk(now, Math.random() < 0.5 ? 1 : -1); // 休憩のあとは、向きを変えて歩き出すこともある
      }

      root.style.transform = `translate3d(${x}px,${-y}px,0)`;
      flip.style.transform = mode !== "walk" || dir === 1 ? "none" : "scaleX(-1)";
      raf = requestAnimationFrame(tick);
    };

    show("step1");
    root.classList.add("is-walking");
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, [ready, hasFront, hasHappy, hasFall, hasLying]);

  if (!ready) return null;
  return (
    <div ref={rootRef} className="adm-walker" aria-hidden="true" style={{ height: HEIGHT_PX }}>
      <div ref={flipRef} className="adm-walker__flip">
        {(Object.keys(IMAGES) as Frame[]).filter((key) => (key !== "front" || hasFront) && (key !== "happy" || hasHappy) && (key !== "fall" || hasFall) && (key !== "lying" || hasLying)).map((key) => (
          <img
            key={key}
            ref={(el) => {
              imgRefs.current[key] = el;
            }}
            src={IMAGES[key]}
            alt=""
            draggable={false}
            style={{ display: key === "step1" ? "block" : "none", ...(key === "lying" ? { width: LYING_WIDTH_PX, height: "auto" } : { height: HEIGHT_PX, width: "auto" }) }}
          />
        ))}
      </div>
    </div>
  );
}
