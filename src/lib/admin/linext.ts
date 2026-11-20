// LINE 公式アカウントの管理システム（Linext・line-recruit-hub）の URL。環境変数 LINEXT_URL で変えられる
export const LINEXT_URL = (process.env.LINEXT_URL || "https://line-recruit-hub.vercel.app").replace(/\/$/, "");

// 管理画面の左メニューに出す Linext のページ（/api/admin/linext/?to=… を通して、自動でログインして開く）
export const LINEXT_NAV = [
  { to: "/candidates", label: "友だち・求職者管理", icon: "bi-people" },
  { to: "/dashboard", label: "Linext を開く", icon: "bi-line" },
] as const;
