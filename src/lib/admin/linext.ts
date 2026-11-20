// LINE 公式アカウントの管理システム（Linext・line-recruit-hub）の URL。環境変数 LINEXT_URL で変えられる
export const LINEXT_URL = (process.env.LINEXT_URL || "https://line-recruit-hub.vercel.app").replace(/\/$/, "");

