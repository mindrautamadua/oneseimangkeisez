import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

/**
 * Build identity used by the PWA update mechanism. Every deployment gets a unique build ID
 * (override with APP_BUILD_ID, e.g. a git SHA from CI). It is inlined into both server and
 * client bundles, so the browser can compare "the version I am running" with "the version
 * the server is running" via /api/version.
 */
const buildId = process.env.APP_BUILD_ID || new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

const nextConfig: NextConfig = {
  // E2E builds use a separate output dir so they never clobber a running `next dev` cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
  generateBuildId: async () => buildId,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  // Server-only packages that must not be bundled for the client.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
