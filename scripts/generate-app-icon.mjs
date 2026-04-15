/**
 * Rasterizes client/src/assets/brand/kennelsync-paw.svg to PNG app icons (1024×1024).
 * - app-icon.png — white mat, brand green paw (default / light)
 * - app-icon-dark.png — dark background, lighter emerald paw (dark appearance)
 * - app-icon-tinted.png — white paw on black (iOS 18+ tinted / template-friendly)
 *
 * Run: pnpm run generate:app-icon
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "client/src/assets/brand/kennelsync-paw.svg");
const brandDir = join(root, "client/src/assets/brand");

const size = 1024;
const pad = Math.round(size * 0.14);
const inner = size - 2 * pad;

/** @param {string} strokeHex e.g. #059669 */
function pawSvgBuffer(strokeHex) {
  const raw = readFileSync(svgPath, "utf8");
  const patched = raw.replace(/#059669/g, strokeHex);
  return Buffer.from(patched);
}

async function pawPng(strokeHex) {
  return sharp(pawSvgBuffer(strokeHex)).resize(inner, inner, { fit: "contain" }).png().toBuffer();
}

async function writeIcon(filename, background, strokeHex) {
  const outPath = join(brandDir, filename);
  const paw = await pawPng(strokeHex);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background,
    },
  })
    .composite([{ input: paw, top: pad, left: pad }])
    .png()
    .toFile(outPath);
  console.log("Wrote", outPath);
}

// Light: white + emerald-600
await writeIcon("app-icon.png", { r: 255, g: 255, b: 255 }, "#059669");

// Dark: slate-950 + emerald-400 (reads clearly on dark home screens)
await writeIcon("app-icon-dark.png", { r: 2, g: 6, b: 23 }, "#34d399");

// Tinted (iOS): high-contrast template — system applies user accent; keep glyph white on black
await writeIcon("app-icon-tinted.png", { r: 0, g: 0, b: 0 }, "#ffffff");
