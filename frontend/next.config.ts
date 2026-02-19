import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: '/home/didac/projects/dockerclaw/dockerclaw-web/frontend',
  },
};

export default nextConfig;
