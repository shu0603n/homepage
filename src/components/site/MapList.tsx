import type { CSSProperties } from "react";
import { PINS } from "@/lib/isomap";

export function MapList() {
  return (
    <>
      {PINS.map((p) => (
        <li key={p.id}>
          <button
            className="map__item"
            type="button"
            data-pin={p.id}
            data-title={p.title}
            data-en={p.en}
            data-text={p.text}
            data-href={`/${p.href}`}
            data-link={p.link}
            style={{ "--c": p.color } as CSSProperties}
          >
            <span className="map__no">{p.no}</span>
            <span className="map__name">{p.title}</span>
          </button>
        </li>
      ))}
    </>
  );
}
