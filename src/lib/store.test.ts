import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage stand-in — the native module can't load under Node.
const memory = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
  },
}));

import * as store from "./store";

describe("store", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("returns an empty list when nothing has been persisted", async () => {
    expect(await store.listBulbs()).toEqual([]);
  });

  it("upserts a new bulb and persists it", async () => {
    const bulbs = await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);

    expect(bulbs).toHaveLength(1);
    expect(bulbs[0]).toMatchObject({ mac: "aa:bb", ip: "192.168.1.10" });
    expect(bulbs[0].lastSeen).toEqual(expect.any(String));
    expect(await store.listBulbs()).toEqual(bulbs);
  });

  it("updates ip/lastSeen for an already-known bulb instead of duplicating it", async () => {
    // Freeze time so the two upserts get deterministic, distinct timestamps.
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const [first] = await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
      vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
      const [updated] = await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.99" }]);

      expect(await store.listBulbs()).toHaveLength(1);
      expect(updated.ip).toBe("192.168.1.99");
      expect(updated.lastSeen).not.toBe(first.lastSeen);
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves the custom name when re-discovering a known bulb", async () => {
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    await store.renameBulb("aa:bb", "Living Room");
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.99" }]);

    expect((await store.getBulb("aa:bb"))?.name).toBe("Living Room");
  });

  it("finds a bulb by mac", async () => {
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    expect((await store.getBulb("aa:bb"))?.ip).toBe("192.168.1.10");
  });

  it("returns undefined for an unknown mac", async () => {
    expect(await store.getBulb("nope")).toBeUndefined();
  });

  it("renames a known bulb", async () => {
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    const renamed = await store.renameBulb("aa:bb", "Kitchen");

    expect(renamed?.name).toBe("Kitchen");
    expect((await store.getBulb("aa:bb"))?.name).toBe("Kitchen");
  });

  it("returns undefined when renaming an unknown bulb", async () => {
    expect(await store.renameBulb("nope", "X")).toBeUndefined();
  });

  it("removes a known bulb", async () => {
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);

    expect(await store.removeBulb("aa:bb")).toBe(true);
    expect(await store.listBulbs()).toEqual([]);
  });

  it("returns false when removing an unknown bulb", async () => {
    expect(await store.removeBulb("nope")).toBe(false);
  });
});
