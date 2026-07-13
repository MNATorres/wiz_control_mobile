import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Bulb } from "./types";

const STORAGE_KEY = "wiz.bulbs";

async function readStore(): Promise<Bulb[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Bulb[]) : [];
}

async function writeStore(bulbs: Bulb[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bulbs));
}

export function listBulbs(): Promise<Bulb[]> {
  return readStore();
}

export async function getBulb(mac: string): Promise<Bulb | undefined> {
  const bulbs = await readStore();
  return bulbs.find((b) => b.mac === mac);
}

export async function upsertBulbs(found: { mac: string; ip: string }[]): Promise<Bulb[]> {
  const bulbs = await readStore();
  const now = new Date().toISOString();

  for (const { mac, ip } of found) {
    const existing = bulbs.find((b) => b.mac === mac);
    if (existing) {
      existing.ip = ip;
      existing.lastSeen = now;
    } else {
      bulbs.push({ mac, ip, lastSeen: now });
    }
  }

  await writeStore(bulbs);
  return bulbs;
}

export async function renameBulb(mac: string, name: string): Promise<Bulb | undefined> {
  const bulbs = await readStore();
  const bulb = bulbs.find((b) => b.mac === mac);
  if (!bulb) return undefined;
  bulb.name = name;
  await writeStore(bulbs);
  return bulb;
}

export async function removeBulb(mac: string): Promise<boolean> {
  const bulbs = await readStore();
  const remaining = bulbs.filter((b) => b.mac !== mac);
  if (remaining.length === bulbs.length) return false;
  await writeStore(remaining);
  return true;
}
