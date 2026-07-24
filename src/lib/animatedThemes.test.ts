import { describe, expect, it } from "vitest";
import { ANIMATED_THEMES, getAnimatedTheme } from "./animatedThemes";
import { SCENES } from "./wiz/scenes";

describe("getAnimatedTheme", () => {
  it("returns the theme matching the given key", () => {
    expect(getAnimatedTheme("fireplace")?.name).toBe("Fireplace");
    expect(getAnimatedTheme("ocean")?.sceneId).toBe(1);
  });

  it("returns undefined for an unknown key", () => {
    expect(getAnimatedTheme("does-not-exist")).toBeUndefined();
  });
});

describe("ANIMATED_THEMES", () => {
  it("has a unique key for every theme", () => {
    const keys = ANIMATED_THEMES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("references only scenes that exist in the WiZ scene map", () => {
    for (const theme of ANIMATED_THEMES) {
      expect(SCENES[theme.sceneId]).toBeDefined();
    }
  });

  it("keeps every speed within the WiZ range (20-200)", () => {
    for (const theme of ANIMATED_THEMES) {
      expect(theme.speed).toBeGreaterThanOrEqual(20);
      expect(theme.speed).toBeLessThanOrEqual(200);
    }
  });

  it("gives every theme a display name and emoji", () => {
    for (const theme of ANIMATED_THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.emoji.length).toBeGreaterThan(0);
    }
  });
});
