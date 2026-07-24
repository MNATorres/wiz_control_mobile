import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
  },
}));

const sendUnicast = vi.fn();
const sendBroadcast = vi.fn();
vi.mock("./wiz/udp", () => ({
  sendUnicast: (...args: unknown[]) => sendUnicast(...args),
  sendBroadcast: (...args: unknown[]) => sendBroadcast(...args),
}));

import * as api from "./api";

function seedBulbs(bulbs: { mac: string; ip: string; name?: string }[]) {
  memory.set(
    "wiz.bulbs",
    JSON.stringify(bulbs.map((b) => ({ ...b, lastSeen: "2026-01-01T00:00:00.000Z" }))),
  );
}

beforeEach(() => {
  memory.clear();
  sendUnicast.mockReset().mockResolvedValue({ result: { success: true } });
  sendBroadcast.mockReset();
});

describe("discoverBulbs", () => {
  it("persists every bulb that answered the broadcast, keyed by mac", async () => {
    sendBroadcast.mockResolvedValue([
      { address: "192.168.100.11", message: { result: { mac: "aa" } } },
      { address: "192.168.100.12", message: { result: { mac: "bb" } } },
    ]);

    const bulbs = await api.discoverBulbs();

    expect(sendBroadcast).toHaveBeenCalledWith({ method: "getPilot", params: {} });
    expect(bulbs.map((b) => [b.mac, b.ip])).toEqual([
      ["aa", "192.168.100.11"],
      ["bb", "192.168.100.12"],
    ]);
    expect(await api.listBulbs()).toHaveLength(2);
  });

  it("ignores replies without a mac in the result", async () => {
    sendBroadcast.mockResolvedValue([
      { address: "192.168.100.11", message: { result: { mac: "aa" } } },
      { address: "192.168.100.12", message: { result: {} } },
      { address: "192.168.100.13", message: {} },
    ]);

    expect(await api.discoverBulbs()).toHaveLength(1);
  });
});

describe("getPilot", () => {
  it("unicasts getPilot to the stored ip and unwraps the result", async () => {
    seedBulbs([{ mac: "aa", ip: "192.168.100.11" }]);
    sendUnicast.mockResolvedValue({ result: { mac: "aa", state: true, dimming: 80 } });

    const pilot = await api.getPilot("aa");

    expect(sendUnicast).toHaveBeenCalledWith("192.168.100.11", {
      method: "getPilot",
      params: {},
    });
    expect(pilot).toEqual({ mac: "aa", state: true, dimming: 80 });
  });

  it("returns an empty state when the reply has no result", async () => {
    seedBulbs([{ mac: "aa", ip: "192.168.100.11" }]);
    sendUnicast.mockResolvedValue({});

    expect(await api.getPilot("aa")).toEqual({});
  });

  it("throws for an unknown mac without touching the network", async () => {
    await expect(api.getPilot("nope")).rejects.toThrow("Unknown bulb");
    expect(sendUnicast).not.toHaveBeenCalled();
  });
});

describe("control commands", () => {
  beforeEach(() => {
    seedBulbs([{ mac: "aa", ip: "192.168.100.11" }]);
  });

  it("setState sends a setPilot with the state flag", async () => {
    await api.setState("aa", true);
    expect(sendUnicast).toHaveBeenCalledWith("192.168.100.11", {
      method: "setPilot",
      params: { state: true },
    });
  });

  it("setDimming sends the brightness value", async () => {
    await api.setDimming("aa", 55);
    expect(sendUnicast).toHaveBeenCalledWith("192.168.100.11", {
      method: "setPilot",
      params: { dimming: 55 },
    });
  });

  it("setColor sends the RGB channels", async () => {
    await api.setColor("aa", { r: 255, g: 0, b: 0 });
    expect(sendUnicast).toHaveBeenCalledWith("192.168.100.11", {
      method: "setPilot",
      params: { r: 255, g: 0, b: 0 },
    });
  });

  it("setColorTemp sends the temperature in kelvin", async () => {
    await api.setColorTemp("aa", 4200);
    expect(sendUnicast).toHaveBeenCalledWith("192.168.100.11", {
      method: "setPilot",
      params: { temp: 4200 },
    });
  });

  it("setScene sends the scene id and includes speed only when given", async () => {
    await api.setScene("aa", 4);
    expect(sendUnicast).toHaveBeenLastCalledWith("192.168.100.11", {
      method: "setPilot",
      params: { sceneId: 4 },
    });

    await api.setScene("aa", 4, 150);
    expect(sendUnicast).toHaveBeenLastCalledWith("192.168.100.11", {
      method: "setPilot",
      params: { sceneId: 4, speed: 150 },
    });
  });

  it("throws for an unknown mac", async () => {
    await expect(api.setState("nope", true)).rejects.toThrow("Unknown bulb");
  });
});

describe("setAllState", () => {
  it("sends the state to every stored bulb", async () => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
    ]);

    await api.setAllState(false);

    expect(sendUnicast.mock.calls).toEqual([
      ["192.168.100.11", { method: "setPilot", params: { state: false } }],
      ["192.168.100.12", { method: "setPilot", params: { state: false } }],
    ]);
  });

  it("keeps going when individual bulbs fail", async () => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
    ]);
    sendUnicast.mockRejectedValueOnce(new Error("offline"));

    await expect(api.setAllState(true)).resolves.toBeUndefined();
    expect(sendUnicast).toHaveBeenCalledTimes(2);
  });

  it("is a no-op with no stored bulbs", async () => {
    await api.setAllState(true);
    expect(sendUnicast).not.toHaveBeenCalled();
  });
});

describe("setAllDimming / setAllColor", () => {
  beforeEach(() => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
    ]);
  });

  it("sends the brightness to every stored bulb", async () => {
    await api.setAllDimming(35);
    expect(sendUnicast.mock.calls).toEqual([
      ["192.168.100.11", { method: "setPilot", params: { dimming: 35 } }],
      ["192.168.100.12", { method: "setPilot", params: { dimming: 35 } }],
    ]);
  });

  it("sends the color to every stored bulb, turning them on", async () => {
    await api.setAllColor({ r: 10, g: 20, b: 30 });
    expect(sendUnicast.mock.calls).toEqual([
      ["192.168.100.11", { method: "setPilot", params: { state: true, r: 10, g: 20, b: 30 } }],
      ["192.168.100.12", { method: "setPilot", params: { state: true, r: 10, g: 20, b: 30 } }],
    ]);
  });

  it("keeps going when individual bulbs fail", async () => {
    sendUnicast.mockRejectedValueOnce(new Error("offline"));
    await expect(api.setAllColor({ r: 1, g: 2, b: 3 })).resolves.toBeUndefined();
    expect(sendUnicast).toHaveBeenCalledTimes(2);
  });
});

describe("favorite colors", () => {
  const red = { r: 255, g: 0, b: 0 };

  it("adds, lists, and removes favorites through the facade", async () => {
    expect(await api.getFavoriteColors()).toEqual([]);
    expect(await api.addFavoriteColor(red)).toEqual([red]);
    expect(await api.removeFavoriteColor(red)).toEqual([]);
  });
});

describe("randomColor", () => {
  it("is exposed through the facade", () => {
    const c = api.randomColor();
    for (const channel of [c.r, c.g, c.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe("applyPreset", () => {
  it("cycles the preset palette across all stored bulbs by index", async () => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
      { mac: "cc", ip: "192.168.100.13" },
    ]);

    await api.applyPreset("blue-red-mix");

    const preset = api.getPresets().find((p) => p.key === "blue-red-mix")!;
    const expected = (ip: string, i: number) => [
      ip,
      {
        method: "setPilot",
        params: {
          state: true,
          r: preset.colors[i % preset.colors.length].r,
          g: preset.colors[i % preset.colors.length].g,
          b: preset.colors[i % preset.colors.length].b,
          dimming: preset.colors[i % preset.colors.length].dimming,
        },
      },
    ];
    expect(sendUnicast.mock.calls).toEqual([
      expected("192.168.100.11", 0),
      expected("192.168.100.12", 1),
      expected("192.168.100.13", 2), // wraps back to the first color
    ]);
  });

  it("keeps going when individual bulbs fail", async () => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
    ]);
    sendUnicast.mockRejectedValueOnce(new Error("offline"));

    await expect(api.applyPreset("blues")).resolves.toBeUndefined();
    expect(sendUnicast).toHaveBeenCalledTimes(2);
  });

  it("throws for an unknown preset", async () => {
    await expect(api.applyPreset("nope")).rejects.toThrow("Unknown preset");
  });
});

describe("applyAnimatedTheme", () => {
  it("sends the theme's scene and speed to every stored bulb, turning them on", async () => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
    ]);

    await api.applyAnimatedTheme("fireplace");

    const fireplace = api.getAnimatedThemes().find((t) => t.key === "fireplace")!;
    const expected = {
      method: "setPilot",
      params: { state: true, sceneId: fireplace.sceneId, speed: fireplace.speed },
    };
    expect(sendUnicast.mock.calls).toEqual([
      ["192.168.100.11", expected],
      ["192.168.100.12", expected],
    ]);
  });

  it("keeps going when individual bulbs fail", async () => {
    seedBulbs([
      { mac: "aa", ip: "192.168.100.11" },
      { mac: "bb", ip: "192.168.100.12" },
    ]);
    sendUnicast.mockRejectedValueOnce(new Error("offline"));

    await expect(api.applyAnimatedTheme("ocean")).resolves.toBeUndefined();
    expect(sendUnicast).toHaveBeenCalledTimes(2);
  });

  it("throws for an unknown theme", async () => {
    await expect(api.applyAnimatedTheme("nope")).rejects.toThrow("Unknown animated theme");
  });
});

describe("renameBulb / forgetBulb", () => {
  it("renames a known bulb and returns it", async () => {
    seedBulbs([{ mac: "aa", ip: "192.168.100.11" }]);

    expect((await api.renameBulb("aa", "Kitchen")).name).toBe("Kitchen");
  });

  it("throws when renaming an unknown bulb", async () => {
    await expect(api.renameBulb("nope", "X")).rejects.toThrow("Unknown bulb");
  });

  it("forgets a known bulb", async () => {
    seedBulbs([{ mac: "aa", ip: "192.168.100.11" }]);

    await api.forgetBulb("aa");
    expect(await api.listBulbs()).toEqual([]);
  });

  it("throws when forgetting an unknown bulb", async () => {
    await expect(api.forgetBulb("nope")).rejects.toThrow("Unknown bulb");
  });
});

describe("getScenes / getPresets", () => {
  it("returns scenes as {id, name} pairs", async () => {
    const scenes = api.getScenes();
    expect(scenes).toContainEqual({ id: 4, name: "Party" });
    expect(scenes).toContainEqual({ id: 1000, name: "Rhythm" });
  });

  it("returns the preset list", () => {
    expect(api.getPresets().map((p) => p.key)).toContain("warm-reds");
  });
});
