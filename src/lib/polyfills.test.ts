import { afterEach, describe, expect, it, vi } from "vitest";

const globals = globalThis as { Buffer?: unknown };
const original = globals.Buffer;

afterEach(() => {
  globals.Buffer = original;
  vi.resetModules();
});

describe("polyfills", () => {
  it("installs a global Buffer when missing", async () => {
    delete globals.Buffer;
    vi.resetModules();

    await import("./polyfills");

    expect(globals.Buffer).toBeDefined();
  });

  it("leaves an existing global Buffer untouched", async () => {
    const sentinel = { fake: true };
    globals.Buffer = sentinel;
    vi.resetModules();

    await import("./polyfills");

    expect(globals.Buffer).toBe(sentinel);
  });
});
