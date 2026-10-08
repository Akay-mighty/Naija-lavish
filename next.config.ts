import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow preview subdomain dev-origin to silence Next 16 warning
  allowedDevOrigins: ["*.space-z.ai", "*.z.ai", "*.vercel.app"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
