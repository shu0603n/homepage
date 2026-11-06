"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { initSite } from "@/lib/behavior";

// スクロール連動・メニュー・カルーセルなどの動きを、ページ遷移のたびに初期化し直す
export function SiteBehavior() {
  const pathname = usePathname();
  useEffect(() => initSite(), [pathname]);
  return null;
}
