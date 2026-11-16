import Link from "next/link";
import type { CSSProperties } from "react";
import type { PageMeta } from "@/lib/metadata";

// 写真を全面に敷き、タイトル（英字＋日本語）とパンくずだけを重ねる。
// 英字の見出しは1文字ずつ順番にせり上がる。写真はスクロールに合わせてゆっくり動き、奥行きを出す（lib/behavior.ts）
export function PageHero({ hero }: { hero: NonNullable<PageMeta["hero"]> }) {
  const crumbs: ReadonlyArray<readonly [string, string]> = [["", "HOME"], ...(hero.crumbs ?? [])];
  const Title = hero.noH1 ? "p" : "h1";
  return (
    <section className="page-hero">
      <div className="page-hero__media" aria-hidden="true">
        <img src={`/assets/img/${hero.img || "hero-company.jpg"}`} alt="" />
      </div>
      <div className="page-hero__inner">
        <p className="page-hero__en" aria-hidden="true">
          <span className="page-hero__word">
            {[...hero.en].map((ch, i) => (
              <span key={i} className="page-hero__char" style={{ "--ci": i } as CSSProperties}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
        </p>
        <Title className="page-hero__title">{hero.ja}</Title>
      </div>
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <ol>
          {crumbs.map(([h, t]) => (
            <li key={h}>
              <Link href={`/${h}`}>{t}</Link>
            </li>
          ))}
          <li aria-current="page">{hero.current || hero.ja}</li>
        </ol>
      </nav>
    </section>
  );
}
