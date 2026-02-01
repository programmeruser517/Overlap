/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@overlap/core", "@overlap/adapters"],
  output: process.env.TAURI_BUILD ? "export" : undefined,
  images: {
    unoptimized: process.env.TAURI_BUILD ? true : false,
  },
};

module.exports = nextConfig;
