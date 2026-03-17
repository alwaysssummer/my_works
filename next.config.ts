import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/m/:path*', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
