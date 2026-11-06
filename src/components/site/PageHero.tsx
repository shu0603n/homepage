import Link from "next/link";
import type { PageMeta } from "@/lib/metadata";

// 写真を全面に敷き、タイトル（英字＋日本語）とパンくずだけを重ねる
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
          {hero.en}
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
