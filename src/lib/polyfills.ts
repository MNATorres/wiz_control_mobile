import { Buffer } from "buffer";

// react-native-udp relies on a global Buffer being available.
if (typeof (global as { Buffer?: unknown }).Buffer === "undefined") {
  (global as { Buffer?: unknown }).Buffer = Buffer;
}
