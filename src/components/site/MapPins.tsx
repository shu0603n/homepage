import type { CSSProperties } from "react";
import { PINS, pinPos } from "@/lib/isomap";

export function MapPins() {
  return (
    <>
      {PINS.map((p) => {
        const { left, top } = pinPos(p);
        return (
          <button
            key={p.id}
            className="map-pin"
            type="button"
            data-pin={p.id}
            style={{ left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%`, "--c": p.color } as CSSProperties}
            aria-label={`${p.no} ${p.title}`}
          >
            <span>{p.no}</span>
          </button>
        );
      })}
    </>
  );
}
