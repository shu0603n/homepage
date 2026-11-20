"use client";

import { useEffect } from "react";

// 管理ページを開いたら、ログイン状態の期限の延長を頼む（実際に延ばすかはサーバー側で判断。lib/admin/session.ts）
export function AdminSessionKeeper() {
  useEffect(() => {
    fetch("/api/admin/refresh/", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
