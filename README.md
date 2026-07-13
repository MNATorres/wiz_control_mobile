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

## ⚠️ Requires a development build (not Expo Go)

`react-native-udp` is a native module, so this app **cannot run in Expo Go**. You need a custom dev build or a release APK:

### Option A — Build an APK with EAS (recommended)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

`preview` produces an installable `.apk`. EAS builds in the cloud and gives you a download link. (Requires a free Expo account.)

### Option B — Local build

```bash
npx expo prebuild --platform android   # generates the native android/ project
npm run android                        # builds & installs on a connected device/emulator
```

Requires Android Studio / the Android SDK installed locally.

### Running in development after the first dev build

Once a dev build is installed on the phone:

```bash
npx expo start --dev-client
```

Then open the app on the phone (same Wi-Fi as the bulbs) and it connects to the Metro bundler.

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
