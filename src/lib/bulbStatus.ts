import type { PilotState } from "./types";

// The dimmed "offline" card style already signals unreachability, so the raw
// error text (often a generic UDP timeout message) would be redundant noise
// on top of it. Only show the message once the bulb is otherwise reachable.
export function shouldShowErrorMessage(pilot: PilotState | null, error: string | null): boolean {
  return pilot !== null && error !== null;
}
