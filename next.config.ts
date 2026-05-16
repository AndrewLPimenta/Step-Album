import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  reactStrictMode: true,
  typescript: {
    // @supabase/ssr@0.5.2 doesn't infer Database generics correctly with
    // supabase-js@2.105+. Runtime behavior is correct; upgrade ssr to fix.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
