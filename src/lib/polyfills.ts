import { Buffer } from "buffer";

// react-native-udp relies on a global Buffer being available.
const globals = globalThis as { Buffer?: unknown };
if (typeof globals.Buffer === "undefined") {
  globals.Buffer = Buffer;
}
