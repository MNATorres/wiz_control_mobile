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
eas build --platform android --profile preview   # profiles are defined in eas.json
```

When the cloud build finishes, EAS prints a link — open it on the phone (or scan the QR) and install the `.apk`. The `preview` profile produces an installable APK rather than a Play Store bundle.

**Option B — Local APK build (needs JDK 17+ and the Android SDK; much faster after the first build):**

```bash
npx expo prebuild --platform android   # 1. generate/sync the native android/ project
cd android
./gradlew assembleRelease              # 2. build the APK (Windows: .\gradlew assembleRelease)
```

The APK lands in `android/app/build/outputs/apk/release/app-release.apk` (~67 MB). Install it either by copying the file to the phone, or directly over USB with debugging enabled:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

The **first** Gradle build downloads dependencies and takes ~10-30 min; after that, rebuilds take **2-5 min**. Re-run `npx expo prebuild --platform android` only when `app.json`, icons, or native dependencies change — for plain code changes, `./gradlew assembleRelease` alone is enough.

> ⚠️ **Don't mix Options A and B on the same phone**: EAS builds and local builds are signed with different keys, so installing one over the other fails with "App not installed" — uninstall the existing app first (this wipes saved bulb names).

(Alternative: `npm run android` builds and installs a debug variant directly on a connected device/emulator in one step.)

### 3. Install and use it

When installing, Google Play Protect will warn that it hasn't seen this developer before — tap **"Install anyway"** (the small text link, *not* "Got it", which cancels the install). That's expected for any self-built APK.

Open the app on the phone (connected to the same Wi-Fi as the bulbs) and tap **Discover**. That's it — the APK is fully standalone; there is no server to run.

### Day-to-day development (debugging with hot-reload)

> **Expo Go does not work with this app** — `react-native-udp` is a native module that Expo Go doesn't include, so scanning the QR from `npx expo start` with Expo Go fails (e.g. "Project is incompatible with this version of Expo Go"). Use a **development build** instead: your own Expo Go-like client that bundles the native modules.

One-time: build and install the development client on the phone:

```bash
eas build --platform android --profile development
```

Then, for every coding session:

```bash
npx expo start --dev-client
```

Open the installed **WiZ Control (dev)** app on the phone — it connects to the Metro bundler on your PC (phone and PC on the same network) and JS/TS edits hot-reload. You only need to rebuild the dev client when native modules or `app.json` change.

Note: the `preview` APK from step 2 is a standalone release build — it runs the app but does **not** connect to Metro; use the `development` profile for debugging.

### Type-checking and tests

```bash
npx tsc --noEmit        # type-check
npm test                # unit tests (vitest)
npm run test:coverage   # coverage report for src/lib/
```

The logic layer (`src/lib/` — UDP transport, protocol, store, presets, api facade) is fully unit-tested with the native modules mocked, so no device or bulbs are needed to run the suite. CI runs type-check + tests on every push and PR to `main`. The UI layer (components/screens) is verified on-device.

## Usage

The app has three tabs. **Bulbs**: tap **Discover** to scan the Wi-Fi network; a **Flat** master switch turns every bulb on/off at once (it reads as *on* whenever at least one bulb is on), and each bulb card (laid out two per row) has rename (✎), its own on/off switch, brightness, and a collapsible **Colors & scenes** section with color palette, white color temperature, and scenes. **Flat**: whole-apartment controls — power, brightness, static colors, a 🎲 random vivid color, a full HSV color picker (hue/saturation/brightness sliders — any of the 16M colors), and favorite colors (save the current color, tap to apply, long-press to remove; persisted on the device). **Themes**: one-tap presets that apply a multi-color combination across all bulbs at once (Soft Pastels, Blues, Sleep, Violets, White & Gold, …).

## Stack

- React Native 0.86 + Expo SDK 57 + TypeScript
- `react-native-udp` — raw UDP sockets
- `@react-native-async-storage/async-storage` — persistence
- `@react-native-community/slider` — brightness/temperature sliders
- `expo-network` — device IP for subnet broadcast

## Project structure

```
App.tsx                    # shell: header + Bulbs/Themes tab bar
index.ts                   # entry; registers the Buffer polyfill
scripts/
  generate-icons.mjs       # regenerates all app icon assets (npm run icons)
src/
  theme.ts                 # dark futuristic color palette + shared static color swatches
  screens/
    BulbsScreen.tsx        # discover + Flat master switch + bulb card grid
    FlatScreen.tsx         # whole-apartment power/brightness/colors/favorites
    ThemesScreen.tsx       # multi-bulb preset cards with one-tap apply
  components/
    BulbCard.tsx           # one bulb: rename, on/off, brightness, color/white/scenes
  lib/
    api.ts                 # high-level discovery + control (replaces the old HTTP backend)
    store.ts               # AsyncStorage persistence for known bulbs + favorite colors
    color.ts               # HSV->RGB conversion + random vivid color
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
