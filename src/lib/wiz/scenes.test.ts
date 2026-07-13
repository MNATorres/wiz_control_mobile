import { describe, expect, it } from "vitest";
import { SCENES } from "./scenes";

describe("SCENES", () => {
  it("contains the 36 built-in scenes plus Rhythm (1000)", () => {
    expect(Object.keys(SCENES)).toHaveLength(37);
    expect(SCENES[1000]).toBe("Rhythm");
  });

  it("maps well-known scene ids to their names", () => {
    expect(SCENES[1]).toBe("Ocean");
    expect(SCENES[4]).toBe("Party");
    expect(SCENES[11]).toBe("Warm white");
    expect(SCENES[36]).toBe("Snowy sky");
  });

  it("has a non-empty name for every id", () => {
    for (const name of Object.values(SCENES)) {
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
