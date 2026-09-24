/**
 * One-shot Open Graph image generator for El Colorado Resto Bar.
 *
 * Output: public/og-image.png — 1200×630, solid #0b0a0a, logo centered
 * with "contain" semantics. The logo is NEVER upscaled beyond its native
 * resolution (it is currently 150×150) so it stays sharp.
 *
 * Run: node scripts/generate-og-image.mjs
 * Requires: sharp (devDependency — not part of the site runtime).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = { r: 0x0b, g: 0x0a, b: 0x0a }; // #0b0a0a
/** Max fraction of the canvas the logo may occupy before native-size cap. */
const MAX_LOGO_W = 0.32;
const MAX_LOGO_H = 0.5;
const LOGO_PATH = path.join(root, "public", "elcolorado_logo.jpg");
const OUT_PATH = path.join(root, "public", "og-image.png");
const MAX_OUT_BYTES = 300 * 1024;

const logo = await readFile(LOGO_PATH);
const meta = await sharp(logo).metadata();

if (!meta.width || !meta.height) {
  throw new Error("Could not read logo dimensions");
}

// Fit inside the generous box, but never upscale past native pixels.
const boxW = Math.floor(WIDTH * MAX_LOGO_W);
const boxH = Math.floor(HEIGHT * MAX_LOGO_H);
const scale = Math.min(1, boxW / meta.width, boxH / meta.height);
const drawW = Math.round(meta.width * scale);
const drawH = Math.round(meta.height * scale);
const left = Math.round((WIDTH - drawW) / 2);
const top = Math.round((HEIGHT - drawH) / 2);

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: BACKGROUND,
  },
})
  .composite([{ input: logo, left, top }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(OUT_PATH);

const out = await sharp(OUT_PATH).metadata();
const { size } = await import("node:fs/promises").then((fs) =>
  fs.stat(OUT_PATH),
);

if (out.width !== WIDTH || out.height !== HEIGHT) {
  throw new Error(`Unexpected size ${out.width}×${out.height}`);
}
if (size >= MAX_OUT_BYTES) {
  throw new Error(`og-image.png is ${size} bytes (must be < 300 KB)`);
}

console.log(
  JSON.stringify(
    {
      out: "public/og-image.png",
      canvas: `${WIDTH}×${HEIGHT}`,
      logoNative: `${meta.width}×${meta.height}`,
      logoDrawn: `${drawW}×${drawH}`,
      upscaled: scale > 1,
      bytes: size,
      kb: Math.round(size / 102.4) / 10,
    },
    null,
    2,
  ),
);
