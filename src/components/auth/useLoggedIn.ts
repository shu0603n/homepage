"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ログイン中かどうか。ページ遷移のたびにサーバーに確認する（Cookie は httpOnly なので画面からは読めない）
export function useLoggedIn(): boolean {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me/", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { loggedIn?: boolean }) => {
        if (!cancelled) setLoggedIn(data.loggedIn === true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return loggedIn;
}
