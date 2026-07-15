import { afterEach, describe, expect, it, vi } from "vitest";
import { hsvToRgb, randomColor } from "./color";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hsvToRgb", () => {
  it("converts each hue sextant correctly", () => {
    expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 }); // red
    expect(hsvToRgb(60, 1, 1)).toEqual({ r: 255, g: 255, b: 0 }); // yellow
    expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 }); // green
    expect(hsvToRgb(180, 1, 1)).toEqual({ r: 0, g: 255, b: 255 }); // cyan
    expect(hsvToRgb(240, 1, 1)).toEqual({ r: 0, g: 0, b: 255 }); // blue
    expect(hsvToRgb(300, 1, 1)).toEqual({ r: 255, g: 0, b: 255 }); // magenta
  });

  it("returns gray tones when saturation is zero", () => {
    expect(hsvToRgb(180, 0, 0.5)).toEqual({ r: 128, g: 128, b: 128 });
  });
});

describe("randomColor", () => {
  it("derives a vivid color from the random hue", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // hue 0 -> red
      .mockReturnValueOnce(1); // saturation 1
    expect(randomColor()).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("always stays within RGB bounds", () => {
    for (let i = 0; i < 50; i++) {
      const c = randomColor();
      for (const channel of [c.r, c.g, c.b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});
