import { getPilotMessage, setPilotMessage, type PilotParams } from "./wiz/protocol";
import { sendBroadcast, sendUnicast } from "./wiz/udp";
import { SCENES } from "./wiz/scenes";
import { PRESETS, colorForIndex, getPreset, type Preset } from "./presets";
import * as store from "./store";
import type { Bulb, PilotState, Scene } from "./types";

export function listBulbs(): Promise<Bulb[]> {
  return store.listBulbs();
}

export async function discoverBulbs(): Promise<Bulb[]> {
  const responses = await sendBroadcast(getPilotMessage());
  const found = responses
    .map((r) => {
      const result = (r.message as { result?: { mac?: string } } | undefined)?.result;
      return result?.mac ? { mac: result.mac, ip: r.address } : null;
    })
    .filter((x): x is { mac: string; ip: string } => x !== null);

  return store.upsertBulbs(found);
}

export function getScenes(): Scene[] {
  return Object.entries(SCENES).map(([id, name]) => ({ id: Number(id), name }));
}

export function getPresets(): Preset[] {
  return PRESETS;
}

export async function getPilot(mac: string): Promise<PilotState> {
  const bulb = await store.getBulb(mac);
  if (!bulb) throw new Error("Unknown bulb");
  const res = (await sendUnicast(bulb.ip, getPilotMessage())) as { result?: PilotState };
  return res.result ?? {};
}

async function control(mac: string, params: PilotParams): Promise<void> {
  const bulb = await store.getBulb(mac);
  if (!bulb) throw new Error("Unknown bulb");
  await sendUnicast(bulb.ip, setPilotMessage(params));
}

export function setState(mac: string, on: boolean): Promise<void> {
  return control(mac, { state: on });
}

export function setDimming(mac: string, value: number): Promise<void> {
  return control(mac, { dimming: value });
}

export function setColor(mac: string, rgb: { r: number; g: number; b: number }): Promise<void> {
  return control(mac, rgb);
}

export function setColorTemp(mac: string, temp: number): Promise<void> {
  return control(mac, { temp });
}

export function setScene(mac: string, sceneId: number, speed?: number): Promise<void> {
  return control(mac, { sceneId, ...(speed ? { speed } : {}) });
}

export async function applyPreset(key: string): Promise<void> {
  const preset = getPreset(key);
  if (!preset) throw new Error("Unknown preset");

  const bulbs = await store.listBulbs();
  await Promise.allSettled(
    bulbs.map((bulb, index) => {
      const color = colorForIndex(preset, index);
      return sendUnicast(
        bulb.ip,
        setPilotMessage({ state: true, r: color.r, g: color.g, b: color.b, dimming: color.dimming }),
      );
    }),
  );
}

export async function renameBulb(mac: string, name: string): Promise<Bulb> {
  const bulb = await store.renameBulb(mac, name);
  if (!bulb) throw new Error("Unknown bulb");
  return bulb;
}

export async function forgetBulb(mac: string): Promise<void> {
  const removed = await store.removeBulb(mac);
  if (!removed) throw new Error("Unknown bulb");
}
