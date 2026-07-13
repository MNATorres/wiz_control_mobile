// Regenerates every app icon asset from a single SVG design.
// Run with: npm run icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "assets");

// Brand palette (mirrors src/theme.ts)
const BG = "#0B0F1A";
const BG_LIGHT = "#16223A";
const CYAN = "#22D3EE";
const CYAN_CORE = "#A5F3FC";

// The same lucide-style bulb glyph the app header uses, in its 24x24 space.
// Drawn three times (wide/mid/core strokes) to fake a neon glow without SVG filters.
function bulbGlyph(coreColor, glow) {
  const paths = (stroke, width, opacity) => `
    <g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${opacity}"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.16 1 1.94V16h5v-.16c0-.78.4-1.49 1-1.94A6 6 0 0 0 12 3Z" />
      <path d="M12 0.4v1.1" />
      <path d="M5.2 2.6l0.8 0.8" />
      <path d="M18.8 2.6l-0.8 0.8" />
    </g>`;
  return glow
    ? paths(CYAN, 4.2, 0.14) + paths(CYAN, 2.4, 0.4) + paths(coreColor, 1.3, 1)
    : paths(coreColor, 1.3, 1);
}

// scale/center a 24-unit glyph on a 1024 canvas
function centered(glyphSvg, scale) {
  const size = 24 * scale;
  const offset = (1024 - size) / 2;
  return `<g transform="translate(${offset}, ${offset}) scale(${scale})">${glyphSvg}</g>`;
}

const defs = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${BG_LIGHT}" />
      <stop offset="100%" stop-color="${BG}" />
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0.28" />
      <stop offset="70%" stop-color="${CYAN}" stop-opacity="0.06" />
      <stop offset="100%" stop-color="${CYAN}" stop-opacity="0" />
    </radialGradient>
  </defs>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}${body}</svg>`;

const halo = `<circle cx="512" cy="490" r="330" fill="url(#halo)" />`;

// Full icon: background + halo + glowing glyph
const iconSvg = svg(`
  <rect width="1024" height="1024" fill="url(#bg)" />
  ${halo}
  ${centered(bulbGlyph(CYAN_CORE, true), 26)}
`);

// Adaptive foreground: transparent, glyph kept inside the ~61% safe zone
const foregroundSvg = svg(`
  ${halo}
  ${centered(bulbGlyph(CYAN_CORE, true), 21)}
`);

// Adaptive background: just the dark gradient
const backgroundSvg = svg(`<rect width="1024" height="1024" fill="url(#bg)" />`);

// Monochrome (themed icons): plain white glyph on transparent
const monochromeSvg = svg(centered(bulbGlyph("#FFFFFF", false), 21));

// Splash: glyph with glow on transparent (shown over the splash background color)
const splashSvg = svg(`
  ${halo}
  ${centered(bulbGlyph(CYAN_CORE, true), 22)}
`);

async function render(svgString, file, size = 1024) {
  await sharp(Buffer.from(svgString)).resize(size, size).png().toFile(path.join(OUT, file));
  console.log(`✓ ${file} (${size}x${size})`);
}

await mkdir(OUT, { recursive: true });
await render(iconSvg, "icon.png");
await render(foregroundSvg, "android-icon-foreground.png");
await render(backgroundSvg, "android-icon-background.png");
await render(monochromeSvg, "android-icon-monochrome.png");
await render(splashSvg, "splash-icon.png");
await render(iconSvg, "favicon.png", 48);
console.log("Done.");
