import type { Metadata } from "next";
import type { ReactNode } from "react";

// 内勤専用の管理ページ。検索エンジンには載せない（robots.txt でも /admin/ を対象外にしている）。
// サイトのヘッダー・フッター・右端のタブは、.admin-shell があるページでは CSS で隠す
export const metadata: Metadata = {
  title: { absolute: "管理ページ | 株式会社エモリスリンク" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}
