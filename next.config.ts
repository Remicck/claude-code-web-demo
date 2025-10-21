import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Ignore LICENSE files to prevent build errors
    config.module.rules.push({
      test: /LICENSE$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
