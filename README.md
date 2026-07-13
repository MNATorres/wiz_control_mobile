# wiz_control_mobile

Native Android/iOS app to control WiZ (Philips/Signify) smart bulbs over the local network, built with React Native + Expo.

Unlike the sibling `wiz_control_backend` + `wiz_control_frontend` web setup, **this app has no backend**. A browser can't open raw UDP sockets, so the web version needed a Node server in the middle; a native app *can* speak UDP directly, so the discovery/control logic that used to live in the backend now runs inside the app itself. One codebase, one APK, no server.

## How it finds bulbs

WiZ bulbs speak a local UDP JSON protocol on port **38899** — no cloud or account involved. Discovery works by **broadcast**:

1. The app builds a `{"method":"getPilot","params":{}}` message.
2. It opens a UDP socket and sends that message to the broadcast addresses on port 38899 — both `255.255.255.255` and the phone's own `x.x.x.255` subnet address (derived from the device IP via `expo-network`).
3. Every WiZ bulb on the Wi-Fi replies with its state (mac, on/off, color, …); the sender IP is the bulb's address.
4. Replies are collected for ~2s and saved (keyed by **MAC**, since DHCP can reassign IPs) via `AsyncStorage`.

Control afterward is **unicast** — a `setPilot` message sent straight to a bulb's IP.

## Requirements

- Node.js 20+ and npm
- An Android phone (or emulator) on the **same Wi-Fi network as the WiZ bulbs**
- A free [Expo account](https://expo.dev/signup) (for cloud APK builds), **or** Android Studio + Android SDK (for local builds)

## ⚠️ Requires a development build (not Expo Go)

`react-native-udp` is a native module, so this app **cannot run in Expo Go**. You need a custom dev build or a release APK — steps below.

## Running the project

### 1. Clone and install

```bash
git clone https://github.com/MNATorres/wiz_control_mobile.git
cd wiz_control_mobile
npm install
```

### 2. Build and install the app on your phone

**Option A — Cloud build with EAS (recommended, no Android SDK needed):**

```bash
npm install -g eas-cli
eas login                                        # your Expo account
eas build --platform android --profile preview   # first run also creates eas.json
```

When the cloud build finishes, EAS prints a link — open it on the phone (or scan the QR) and install the `.apk`. The `preview` profile produces an installable APK rather than a Play Store bundle.

**Option B — Local build (needs Android Studio / Android SDK):**

```bash
npx expo prebuild --platform android   # generates the native android/ project
npm run android                        # builds & installs on a connected device/emulator
```

### 3. Use it

Open the app on the phone (connected to the same Wi-Fi as the bulbs) and tap **Discover**. That's it — the APK is fully standalone; there is no server to run.

### Day-to-day development

Once a dev build from step 2 is installed on the phone, you don't need to rebuild for JS/TS changes:

```bash
npx expo start --dev-client
```

Open the app and it connects to the Metro bundler on your PC (phone and PC must be on the same network); edits hot-reload. You only need to rebuild (step 2) when native modules or `app.json` change.

### Type-checking

```bash
npx tsc --noEmit
```

## Usage

Tap **Discover** to scan the Wi-Fi network, then use each bulb card: on/off, brightness, color (palette), white color temperature, and scenes. The **Presets** bar applies a relaxing multi-color combination across all bulbs at once.

## Stack

- React Native 0.86 + Expo SDK 57 + TypeScript
- `react-native-udp` — raw UDP sockets
- `@react-native-async-storage/async-storage` — persistence
- `@react-native-community/slider` — brightness/temperature sliders
- `expo-network` — device IP for subnet broadcast

## Project structure

```
App.tsx                    # main screen: discover + presets + bulb grid
index.ts                   # entry; registers the Buffer polyfill
src/
  components/
    BulbCard.tsx           # one bulb: on/off, brightness, color/white/scenes
  lib/
    api.ts                 # high-level discovery + control (replaces the old HTTP backend)
    store.ts               # AsyncStorage persistence for known bulbs
    presets.ts             # relaxing multi-bulb color presets
    polyfills.ts           # Buffer global for react-native-udp
    types.ts               # shared types
    wiz/
      udp.ts               # UDP unicast + broadcast (react-native-udp)
      protocol.ts          # getPilot/setPilot message builders
      scenes.ts            # WiZ scene id -> name map
```

## Notes

- There's no hardware in a CI/dev environment, so bulb discovery/control can only be verified on a real device on the same Wi-Fi as the bulbs — build the app (above) and tap **Discover**.
- `react-native-udp` is flagged as unmaintained by the React Native Directory (silenced in `package.json` under `expo.doctor`). It's the standard raw-UDP library for RN and works, but Expo SDK 57 enables the **New Architecture** by default — if the native module fails to load in a dev build, the fallback is to disable it by adding `"newArchEnabled": false` to `app.json`'s `expo` block and rebuilding.
