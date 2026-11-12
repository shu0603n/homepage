import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // 従来の静的サイトと同じ URL（末尾スラッシュあり）にそろえる
  trailingSlash: true,
  // 応答に「x-powered-by: Next.js」を付けない（使っている技術を外に知らせない）
  poweredByHeader: false,
};

export default nextConfig;
