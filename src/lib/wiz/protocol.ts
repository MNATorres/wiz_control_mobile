export interface PilotParams {
  state?: boolean;
  dimming?: number;
  r?: number;
  g?: number;
  b?: number;
  w?: number;
  c?: number;
  temp?: number;
  sceneId?: number;
  speed?: number;
}

export interface PilotResult extends PilotParams {
  mac: string;
  rssi?: number;
  src?: string;
}

export function getPilotMessage() {
  return { method: "getPilot", params: {} };
}

export function setPilotMessage(params: PilotParams) {
  return { method: "setPilot", params };
}
