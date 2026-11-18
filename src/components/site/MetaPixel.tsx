"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackMeta } from "@/lib/meta-pixel";

// Meta Pixel の PageView。最初に開いたときと、サイト内で別のページへ移るたび（URL のパスが変わるたび）に1回送る。
//   - 同じパスのままの再描画・絞り込み（?以降だけの変化）では送らない
//   - React の開発モードで effect が2回動いても二重に送らないよう、最後に送ったパスをこの部品の外で覚えておく
// 送るかどうかの判定（本番のドメインだけ・管理ページは除く）は lib/meta-pixel.ts
let lastPath: string | null = null;

export function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname === lastPath) return;
    lastPath = pathname;
    trackMeta("PageView");
  }, [pathname]);
  return null;
}
