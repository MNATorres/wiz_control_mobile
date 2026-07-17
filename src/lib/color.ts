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

// Tanner Helland's approximation of black-body color temperature -> RGB,
// used to preview a bulb's white mode (WiZ range is ~2200K-6500K).
export function kelvinToRgb(kelvin: number): RGB {
  const t = kelvin / 100;
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  const r = t <= 66 ? 255 : clamp(329.698727446 * Math.pow(t - 60, -0.1332047592));
  const g =
    t <= 66
      ? clamp(99.4708025861 * Math.log(t) - 161.1195681661)
      : clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492));
  const b = t >= 66 ? 255 : t <= 19 ? 0 : clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307);
  return { r, g, b };
}
