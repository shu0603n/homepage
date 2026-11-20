// LINE 公式アカウントの管理システム（Linext・line-recruit-hub）の URL。環境変数 LINEXT_URL で変えられる
export const LINEXT_URL = (process.env.LINEXT_URL || "https://line-recruit-hub.vercel.app").replace(/\/$/, "");

// 管理画面の左メニューに出す Linext のページ（/api/admin/linext/?to=… を通して、自動でログインして開く）
// （友だち管理・個別チャットは管理画面の「LINE 友だち・チャット」に移したので、Linext は移行中の予備としてだけ開けるようにしておく）
export const LINEXT_NAV = [{ to: "/dashboard", label: "Linext を開く（移行中）", icon: "bi-line" }] as const;
