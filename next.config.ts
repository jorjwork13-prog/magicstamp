import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Apple strip and Google hero draw their text from bundled fonts read
  // off disk at runtime (lib/stamp-graphic.ts); make sure they ship with both.
  outputFileTracingIncludes: {
    "/api/wallet/apple": ["./assets/fonts/*.ttf"],
    "/api/stamp-image": ["./assets/fonts/*.ttf"],
  },
  experimental: {
    // Turbopack's persistent dev cache (on by default in Next 16, beta)
    // served stale Tailwind v4 output twice when @theme tokens in
    // globals.css changed — new utilities never regenerated without
    // deleting .next/dev. Disable until the cache invalidates CSS
    // reliably. Trade-off: slower cold dev starts, correct hot updates.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
// redeploy trigger: 2026-07-23
