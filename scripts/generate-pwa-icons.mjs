/**
 * Generates PWA icons from the official logo (public/brand/kinra-logo.png).
 * The logo is placed UNCHANGED (no crop/recolour) and centred on a white square canvas.
 * Replace with a high-resolution square app icon from KINRA when available.
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
// sharp is installed as a dependency of Next.js.
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next/package.json")] }));

const SRC = "public/brand/kinra-logo.png";
mkdirSync("public/icons", { recursive: true });

async function make(size, logoRatio, out) {
  const logo = await sharp(SRC)
    .resize({ width: Math.round(size * logoRatio), kernel: "lanczos3", withoutEnlargement: false })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out);
}

await make(192, 0.82, "public/icons/icon-192.png");
await make(512, 0.82, "public/icons/icon-512.png");
// Maskable: keep the logo inside the 80% safe zone (circle) -> ~60% width.
await make(512, 0.6, "public/icons/maskable-512.png");
await make(180, 0.82, "src/app/apple-icon.png");
await make(48, 0.9, "src/app/icon.png");
