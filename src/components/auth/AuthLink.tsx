"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ヘッダーの「ログイン／マイページ」リンク。ログイン中かどうかはページ遷移のたびに確認する
export function AuthLink({ className }: { className: string }) {
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

  return (
    <Link className={className} href={loggedIn ? "/mypage/" : "/login/"}>
      {loggedIn ? "マイページ" : "ログイン"}
    </Link>
  );
}
