import { describe, expect, it } from "vitest";
import { colorForIndex, getPreset, PRESETS } from "./presets";

describe("getPreset", () => {
  it("returns the preset matching the given key", () => {
    expect(getPreset("blues")?.name).toBe("Blues");
    expect(getPreset("warm-reds")?.name).toBe("Warm Reds");
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

  it("keeps every color within RGB and dimming bounds", () => {
    for (const preset of PRESETS) {
      for (const c of preset.colors) {
        expect(c.r).toBeGreaterThanOrEqual(0);
        expect(c.r).toBeLessThanOrEqual(255);
        expect(c.g).toBeGreaterThanOrEqual(0);
        expect(c.g).toBeLessThanOrEqual(255);
        expect(c.b).toBeGreaterThanOrEqual(0);
        expect(c.b).toBeLessThanOrEqual(255);
        expect(c.dimming).toBeGreaterThanOrEqual(10);
        expect(c.dimming).toBeLessThanOrEqual(100);
      }
    }
  });
});
