import dgram from "react-native-udp";
import * as Network from "expo-network";

const WIZ_PORT = 38899;

export interface UdpResponse {
  address: string;
  message: unknown;
}

// react-native-udp ships incomplete types (its socket's EventEmitter methods
// aren't surfaced), so we describe the subset we use and cast to it.
interface RemoteInfo {
  address: string;
  port: number;
}

interface WizSocket {
  on(event: "message", cb: (msg: { toString(): string }, rinfo: RemoteInfo) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
  once(event: "listening", cb: () => void): void;
  bind(port: number): void;
  setBroadcast(flag: boolean): void;
  send(
    msg: string,
    offset: number | undefined,
    length: number | undefined,
    port: number,
    address: string,
    callback?: (err?: Error) => void,
  ): void;
  close(): void;
}

function createSocket(): WizSocket {
  return dgram.createSocket({ type: "udp4" }) as unknown as WizSocket;
}

// A phone has a single Wi-Fi interface, so we derive its /24 subnet broadcast
// address (x.x.x.255) from the device IP and send there in addition to the
// limited broadcast address, mirroring the desktop backend's behavior.
async function broadcastAddresses(): Promise<string[]> {
  const addresses = ["255.255.255.255"];
  try {
    const ip = await Network.getIpAddressAsync();
    if (ip && ip !== "0.0.0.0" && ip.includes(".")) {
      const parts = ip.split(".");
      parts[3] = "255";
      addresses.push(parts.join("."));
    }
  } catch {
    // fall back to the limited broadcast address only
  }
  return addresses;
}

export function sendUnicast(
  ip: string,
  payload: unknown,
  { timeoutMs = 1000, retries = 3 }: { timeoutMs?: number; retries?: number } = {},
): Promise<unknown> {
  const data = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const socket = createSocket();
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // already closed
      }
    };

    const send = () => {
      attempt += 1;
      socket.send(data, undefined, undefined, WIZ_PORT, ip);
      timer = setTimeout(() => {
        if (attempt < retries) {
          send();
          return;
        }
        cleanup();
        reject(new Error(`No response from ${ip} after ${retries} attempts`));
      }, timeoutMs);
    };

    socket.on("message", (msg) => {
      cleanup();
      try {
        resolve(JSON.parse(msg.toString()));
      } catch (err) {
        reject(err);
      }
    });

    socket.on("error", (err) => {
      cleanup();
      reject(err);
    });

    socket.bind(0);
    socket.once("listening", () => send());
  });
}

export async function sendBroadcast(payload: unknown, windowMs = 2000): Promise<UdpResponse[]> {
  const data = JSON.stringify(payload);
  const addresses = await broadcastAddresses();

  return new Promise((resolve, reject) => {
    const socket = createSocket();
    const responses: UdpResponse[] = [];

    socket.on("message", (msg, rinfo) => {
      try {
        responses.push({ address: rinfo.address, message: JSON.parse(msg.toString()) });
      } catch {
        // ignore non-JSON replies
      }
    });

    socket.on("error", (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(0);
    socket.once("listening", () => {
      socket.setBroadcast(true);
      for (const address of addresses) {
        socket.send(data, undefined, undefined, WIZ_PORT, address);
      }
      setTimeout(() => {
        socket.close();
        resolve(responses);
      }, windowMs);
    });
  });
}
