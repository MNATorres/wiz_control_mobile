import type { RGB } from "./lib/types";

// Futuristic dark palette shared across the app.
export const colors = {
  bg: "#0B0F1A",
  surface: "#121826",
  surfaceDeep: "#0E1524",
  border: "#233150",
  accent: "#22D3EE",
  accentSoft: "rgba(34, 211, 238, 0.12)",
  accentBorder: "rgba(34, 211, 238, 0.45)",
  text: "#E6EDF7",
  textMuted: "#8B9BB5",
  danger: "#F87171",
  dangerBg: "rgba(248, 113, 113, 0.12)",
};

// Static color choices offered by bulb cards and the Flat screen.
export const colorPalette: RGB[] = [
  { r: 255, g: 87, b: 87 },
  { r: 255, g: 150, b: 60 },
  { r: 255, g: 214, b: 90 },
  { r: 120, g: 220, b: 120 },
  { r: 70, g: 200, b: 200 },
  { r: 80, g: 140, b: 255 },
  { r: 150, g: 110, b: 255 },
  { r: 240, g: 130, b: 220 },
  { r: 255, g: 255, b: 255 },
];
