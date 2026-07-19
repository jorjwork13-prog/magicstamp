import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
