"use client";

import { useEffect, useRef, useState } from "react";

// 登録完了のお祝い演出：ブランドカラー（ピンク・オレンジ・グリーン・ブルー）の紙吹雪が上から舞い、
// 画面の上の方に「ようこそ、エモリスリンクへ！」を一瞬出す。数秒で消え、画面の操作は邪魔しない（クリックは下に通る）
const COLORS = ["#ff6fb1", "#ffb36b", "#8fd65a", "#1fa0d8", "#3aafb9"];
const DURATION = 4200;

type Piece = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; color: string; wobble: number; ws: number };

export function Celebration({ message = "ようこそ、エモリスリンクへ！" }: { message?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const count = window.innerWidth < 768 ? 110 : 180;
    const pieces: Piece[] = Array.from({ length: count }, () => ({
      x: Math.random() * W(),
      y: -20 - Math.random() * window.innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 2 + Math.random() * 3,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 9,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      wobble: Math.random() * Math.PI * 2,
      ws: 0.05 + Math.random() * 0.08,
    }));

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 終わり際の 1 秒で、ふわっと消す
      ctx.globalAlpha = t > DURATION - 1000 ? Math.max(0, (DURATION - t) / 1000) : 1;
      for (const p of pieces) {
        p.wobble += p.ws;
        p.x += p.vx + Math.sin(p.wobble) * 0.8;
        p.y += p.vy;
        p.vy = Math.min(p.vy + 0.03, 6);
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.wobble)); // 紙がくるくる裏返るように見せる
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < DURATION) raf = requestAnimationFrame(tick);
      else setShow(false);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="celebration" aria-hidden="true">
      <canvas ref={canvasRef} className="celebration__canvas" />
      <p className="celebration__message">{message}</p>
    </div>
  );
}
