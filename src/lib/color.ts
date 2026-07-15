import type { RGB } from "./types";

// Standard HSV -> RGB conversion (h in degrees, s/v in 0..1).
export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

// A random vivid color: any hue, high saturation, full value — avoids the
// washed-out grays a naive random r/g/b would often produce.
export function randomColor(): RGB {
  const hue = Math.random() * 360;
  const saturation = 0.85 + Math.random() * 0.15;
  return hsvToRgb(hue, saturation, 1);
}
