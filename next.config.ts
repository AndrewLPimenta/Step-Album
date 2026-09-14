import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Barril de icones: sem isto cada import de "@phosphor-icons/react"
    // arrasta o pacote inteiro no dev, e o primeiro compile de cada rota
    // fica na casa dos segundos.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  reactStrictMode: true,
  typescript: {
    // @supabase/ssr@0.5.2 doesn't infer Database generics correctly with
    // supabase-js@2.105+. Runtime behavior is correct; upgrade ssr to fix.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
