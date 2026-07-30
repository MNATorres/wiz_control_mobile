import { describe, expect, it } from "vitest";
import { colorForIndex, getPreset, presetColorToRgb, PRESETS } from "./presets";

describe("getPreset", () => {
  it("returns the preset matching the given key", () => {
    expect(getPreset("blues")?.name).toBe("Blues");
    expect(getPreset("warm-reds")?.name).toBe("Warm Reds");
    expect(getPreset("sleep")?.name).toBe("Sleep");
    expect(getPreset("violets")?.name).toBe("Violets");
    expect(getPreset("white-gold")?.name).toBe("White & Gold");
  });

  it("keeps the Sleep preset dim enough for night use", () => {
    for (const c of getPreset("sleep")!.colors) {
      expect(c.dimming).toBeLessThanOrEqual(15);
    }
  });

  it("returns undefined for an unknown key", () => {
    expect(getPreset("does-not-exist")).toBeUndefined();
  });
});

describe("colorForIndex", () => {
  const preset = getPreset("blue-red-mix")!;

  it("cycles through the palette by index", () => {
    expect(colorForIndex(preset, 0)).toBe(preset.colors[0]);
    expect(colorForIndex(preset, 1)).toBe(preset.colors[1]);
  });

  it("wraps around when the index exceeds the palette length", () => {
    expect(colorForIndex(preset, preset.colors.length)).toBe(preset.colors[0]);
    expect(colorForIndex(preset, preset.colors.length + 1)).toBe(preset.colors[1]);
  });
});

describe("PRESETS", () => {
  it("has a unique key for every preset", () => {
    const keys = PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every preset at least one color", () => {
    for (const preset of PRESETS) {
      expect(preset.colors.length).toBeGreaterThan(0);
    }
  });

  it("keeps every tone within RGB/kelvin and dimming bounds", () => {
    for (const preset of PRESETS) {
      for (const c of preset.colors) {
        if ("temp" in c) {
          expect(c.temp).toBeGreaterThanOrEqual(2200);
          expect(c.temp).toBeLessThanOrEqual(6500);
        } else {
          for (const channel of [c.r, c.g, c.b]) {
            expect(channel).toBeGreaterThanOrEqual(0);
            expect(channel).toBeLessThanOrEqual(255);
          }
        }
        expect(c.dimming).toBeGreaterThanOrEqual(10);
        expect(c.dimming).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("classic white presets", () => {
  it("uses full-brightness kelvin whites, not RGB", () => {
    const white = getPreset("classic-white")!;
    const yellow = getPreset("classic-yellow")!;

    expect(white.colors).toEqual([{ temp: 6500, dimming: 100 }]);
    expect(yellow.colors).toEqual([{ temp: 2700, dimming: 100 }]);
  });
});

describe("presetColorToRgb", () => {
  it("passes RGB tones through unchanged", () => {
    expect(presetColorToRgb({ r: 10, g: 20, b: 30, dimming: 50 })).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
  });

  it("approximates kelvin tones for display", () => {
    const warm = presetColorToRgb({ temp: 2700, dimming: 100 });
    expect(warm.r).toBe(255);
    expect(warm.b).toBeLessThan(200);
  });
});
