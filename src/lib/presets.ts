import { kelvinToRgb } from "./color";
import type { RGB } from "./types";

// A preset tone is either an RGB color or a kelvin white. Kelvin tones drive
// the bulbs' dedicated white LEDs, which shine much brighter than RGB white.
export type PresetColor = { dimming: number } & (
  | { r: number; g: number; b: number }
  | { temp: number }
);

export interface Preset {
  key: string;
  name: string;
  colors: PresetColor[];
}

// How a preset tone should look in the UI (kelvin whites approximated via kelvinToRgb).
export function presetColorToRgb(color: PresetColor): RGB {
  return "temp" in color ? kelvinToRgb(color.temp) : { r: color.r, g: color.g, b: color.b };
}

export const PRESETS: Preset[] = [
  {
    key: "classic-white",
    name: "Classic White",
    colors: [{ temp: 6500, dimming: 100 }],
  },
  {
    key: "classic-yellow",
    name: "Classic Yellow",
    colors: [{ temp: 2700, dimming: 100 }],
  },
  {
    key: "soft-pastels",
    name: "Soft Pastels",
    colors: [
      { r: 255, g: 214, b: 170, dimming: 45 },
      { r: 255, g: 200, b: 220, dimming: 45 },
      { r: 214, g: 200, b: 255, dimming: 45 },
    ],
  },
  {
    key: "blues",
    name: "Blues",
    colors: [
      { r: 80, g: 140, b: 255, dimming: 40 },
      { r: 40, g: 80, b: 200, dimming: 40 },
      { r: 60, g: 160, b: 200, dimming: 40 },
    ],
  },
  {
    key: "blue-red-mix",
    name: "Blue & Red Mix",
    colors: [
      { r: 60, g: 90, b: 200, dimming: 40 },
      { r: 200, g: 60, b: 70, dimming: 40 },
    ],
  },
  {
    key: "modern-greens",
    name: "Modern Greens",
    colors: [
      { r: 20, g: 120, b: 80, dimming: 45 },
      { r: 90, g: 140, b: 90, dimming: 45 },
      { r: 10, g: 90, b: 60, dimming: 40 },
      { r: 140, g: 200, b: 160, dimming: 45 },
    ],
  },
  {
    key: "golden-yellows",
    name: "Golden Yellows",
    colors: [
      { r: 255, g: 200, b: 60, dimming: 45 },
      { r: 255, g: 225, b: 120, dimming: 45 },
      { r: 230, g: 160, b: 30, dimming: 40 },
      { r: 255, g: 240, b: 180, dimming: 50 },
    ],
  },
  {
    key: "turquoise",
    name: "Turquoise",
    colors: [
      { r: 30, g: 200, b: 190, dimming: 45 },
      { r: 20, g: 160, b: 170, dimming: 40 },
      { r: 90, g: 220, b: 210, dimming: 45 },
      { r: 10, g: 130, b: 140, dimming: 40 },
    ],
  },
  {
    key: "warm-reds",
    name: "Warm Reds",
    colors: [
      { r: 220, g: 40, b: 40, dimming: 40 },
      { r: 180, g: 30, b: 50, dimming: 40 },
      { r: 255, g: 80, b: 60, dimming: 45 },
      { r: 140, g: 20, b: 30, dimming: 35 },
    ],
  },
  {
    key: "sleep",
    name: "Sleep",
    colors: [
      { r: 255, g: 120, b: 40, dimming: 10 },
      { r: 255, g: 140, b: 60, dimming: 12 },
      { r: 255, g: 100, b: 30, dimming: 10 },
    ],
  },
  {
    key: "violets",
    name: "Violets",
    colors: [
      { r: 140, g: 70, b: 255, dimming: 40 },
      { r: 100, g: 40, b: 200, dimming: 40 },
      { r: 180, g: 120, b: 255, dimming: 45 },
      { r: 70, g: 20, b: 150, dimming: 35 },
    ],
  },
  {
    key: "white-gold",
    name: "White & Gold",
    colors: [
      { r: 255, g: 255, b: 255, dimming: 80 },
      { r: 255, g: 230, b: 150, dimming: 70 },
      { r: 255, g: 250, b: 235, dimming: 75 },
      { r: 255, g: 210, b: 100, dimming: 65 },
    ],
  },
];

export function getPreset(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}

export function colorForIndex(preset: Preset, index: number): PresetColor {
  return preset.colors[index % preset.colors.length];
}
