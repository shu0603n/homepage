import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // 従来の静的サイトと同じ URL（末尾スラッシュあり）にそろえる
  trailingSlash: true,
};

export default nextConfig;
