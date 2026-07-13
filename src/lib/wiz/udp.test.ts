import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake react-native-udp socket: records calls and lets tests emit events.
type Handler = (...args: unknown[]) => void;

class FakeSocket {
  handlers = new Map<string, Handler[]>();
  sent: { data: string; port: number; address: string }[] = [];
  broadcast = false;
  closed = false;

  on(event: string, cb: Handler) {
    const list = this.handlers.get(event) ?? [];
    list.push(cb);
    this.handlers.set(event, list);
  }

  once(event: string, cb: Handler) {
    this.on(event, cb);
  }

  bind(_port: number) {
    // listening is emitted manually by tests via emit("listening")
  }

  setBroadcast(flag: boolean) {
    this.broadcast = flag;
  }

  send(
    msg: string,
    _offset: number | undefined,
    _length: number | undefined,
    port: number,
    address: string,
  ) {
    this.sent.push({ data: msg, port, address });
  }

  close() {
    this.closed = true;
  }

  emit(event: string, ...args: unknown[]) {
    for (const cb of this.handlers.get(event) ?? []) cb(...args);
  }
}

let socket: FakeSocket;

vi.mock("react-native-udp", () => ({
  default: { createSocket: () => socket },
}));

const getIpAddressAsync = vi.fn<() => Promise<string>>();
vi.mock("expo-network", () => ({
  getIpAddressAsync: () => getIpAddressAsync(),
}));

import { sendBroadcast, sendUnicast } from "./udp";

beforeEach(() => {
  socket = new FakeSocket();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("sendUnicast", () => {
  it("sends the JSON payload to the bulb on port 38899 and resolves with the parsed reply", async () => {
    const promise = sendUnicast("192.168.1.10", { method: "getPilot", params: {} });
    socket.emit("listening");

    expect(socket.sent).toEqual([
      { data: '{"method":"getPilot","params":{}}', port: 38899, address: "192.168.1.10" },
    ]);

    socket.emit("message", { toString: () => '{"result":{"mac":"aa"}}' });
    await expect(promise).resolves.toEqual({ result: { mac: "aa" } });
    expect(socket.closed).toBe(true);
  });

  it("retries on timeout and rejects after the configured attempts", async () => {
    const promise = sendUnicast("192.168.1.10", {}, { timeoutMs: 1000, retries: 3 });
    const rejection = expect(promise).rejects.toThrow(
      "No response from 192.168.1.10 after 3 attempts",
    );
    socket.emit("listening");

    await vi.advanceTimersByTimeAsync(1000);
    expect(socket.sent).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(socket.sent).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(1000);

    await rejection;
    expect(socket.closed).toBe(true);
  });

  it("stops retrying once a reply arrives", async () => {
    const promise = sendUnicast("192.168.1.10", {}, { timeoutMs: 1000, retries: 3 });
    socket.emit("listening");

    await vi.advanceTimersByTimeAsync(1000);
    socket.emit("message", { toString: () => "{}" });
    await promise;

    await vi.advanceTimersByTimeAsync(5000);
    expect(socket.sent).toHaveLength(2);
  });

  it("rejects when the reply is not valid JSON", async () => {
    const promise = sendUnicast("192.168.1.10", {});
    socket.emit("listening");
    socket.emit("message", { toString: () => "not-json" });

    await expect(promise).rejects.toThrow();
  });

  it("rejects on socket error", async () => {
    const promise = sendUnicast("192.168.1.10", {});
    socket.emit("listening");
    socket.emit("error", new Error("boom"));

    await expect(promise).rejects.toThrow("boom");
  });
});

describe("sendBroadcast", () => {
  it("broadcasts to the limited and subnet addresses and collects replies for the window", async () => {
    getIpAddressAsync.mockResolvedValue("192.168.100.6");

    const promise = sendBroadcast({ method: "getPilot", params: {} }, 2000);
    await vi.advanceTimersByTimeAsync(0); // let broadcastAddresses() resolve
    socket.emit("listening");

    expect(socket.broadcast).toBe(true);
    expect(socket.sent.map((s) => s.address)).toEqual(["255.255.255.255", "192.168.100.255"]);
    expect(socket.sent.every((s) => s.port === 38899)).toBe(true);

    socket.emit("message", { toString: () => '{"result":{"mac":"aa"}}' }, { address: "192.168.100.11", port: 38899 });
    socket.emit("message", { toString: () => "garbage" }, { address: "192.168.100.12", port: 38899 });
    socket.emit("message", { toString: () => '{"result":{"mac":"bb"}}' }, { address: "192.168.100.13", port: 38899 });

    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toEqual([
      { address: "192.168.100.11", message: { result: { mac: "aa" } } },
      { address: "192.168.100.13", message: { result: { mac: "bb" } } },
    ]);
    expect(socket.closed).toBe(true);
  });

  it("falls back to the limited broadcast address when the device IP is unavailable", async () => {
    getIpAddressAsync.mockRejectedValue(new Error("no network"));

    const promise = sendBroadcast({}, 1000);
    await vi.advanceTimersByTimeAsync(0);
    socket.emit("listening");

    expect(socket.sent.map((s) => s.address)).toEqual(["255.255.255.255"]);

    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toEqual([]);
  });

  it("ignores a 0.0.0.0 device IP", async () => {
    getIpAddressAsync.mockResolvedValue("0.0.0.0");

    const promise = sendBroadcast({}, 1000);
    await vi.advanceTimersByTimeAsync(0);
    socket.emit("listening");

    expect(socket.sent.map((s) => s.address)).toEqual(["255.255.255.255"]);

    await vi.advanceTimersByTimeAsync(1000);
    await promise;
  });

  it("rejects on socket error", async () => {
    getIpAddressAsync.mockResolvedValue("192.168.100.6");

    const promise = sendBroadcast({}, 1000);
    await vi.advanceTimersByTimeAsync(0);
    socket.emit("listening");
    socket.emit("error", new Error("boom"));

    await expect(promise).rejects.toThrow("boom");
    expect(socket.closed).toBe(true);
  });
});
