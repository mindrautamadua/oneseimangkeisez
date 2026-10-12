import { Lexend, Source_Sans_3 } from "next/font/google";

/**
 * Fonts are downloaded at build time and self-hosted by Next.js (no runtime request to
 * Google, compatible with CSP font-src 'self'). Replace when KINRA's typeface is supplied.
 */
export const heading = Lexend({ subsets: ["latin"], variable: "--font-heading", display: "swap", weight: ["500", "600", "700"] });
export const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body", display: "swap" });
