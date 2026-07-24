# CLAUDE.md

This file gives Claude Code (and other agents) context for working in this repository.

## What this is

A React Native + Expo app (Android/iOS) that controls WiZ (Philips/Signify) smart bulbs
directly over the local network. It is the mobile sibling of `wiz_control_backend` +
`wiz_control_frontend`, but **self-contained**: native apps can open raw UDP sockets, so
the discovery/control logic that the web version keeps in a Node backend lives inside
this app (`src/lib/`). There is no server, no cloud, no auth — everything assumes
local-network trust.

Protocol: WiZ bulbs listen on UDP port 38899 for JSON messages (`getPilot` reads state,
`setPilot` sets it). Discovery broadcasts `getPilot` to `255.255.255.255` and the
phone's `x.x.x.255` subnet address; each bulb replies once and the sender IP is the
bulb's address. Bulbs are persisted by MAC (IPs can change under DHCP) in AsyncStorage.

## Stack

- React Native 0.86, Expo SDK 57, TypeScript 6, React 19
- `react-native-udp` — raw UDP sockets (native module; ships broken TS types, see below)
- `@react-native-async-storage/async-storage` — persistence
- `@react-native-community/slider`, `expo-network`, `buffer` (global polyfill)

## Commands

```bash
npm install                # setup
npx tsc --noEmit           # type-check
npm test                   # vitest run — unit tests for src/lib/
npm run test:coverage      # per-file coverage (scoped to src/lib/, see vitest.config.ts)
npx expo start --dev-client  # dev server (requires a dev build installed on a phone)
npx expo-doctor            # config sanity check (should stay 20/20)
eas build --platform android --profile preview  # cloud APK build
```

No linter is configured yet. A change isn't done until `npx tsc --noEmit` and `npm test`
both pass — CI (`.github/workflows/ci.yml`) runs both on every push/PR to `main`.

Tests are colocated as `<name>.test.ts` next to the file they cover, run under Node with
vitest, and mock the native modules (`react-native-udp` via a FakeSocket class,
AsyncStorage via an in-memory Map, `expo-network` via vi.mock). Coverage is intentionally
scoped to `src/lib/**` — the UI layer can only be exercised on a real device. Keep
`src/lib/` at 100%: if you add a lib module, add its test in the same change.

## Critical constraint: no runnable environment

`react-native-udp` is a **native module**, so the app cannot run in Expo Go, on the web,
or in this dev environment. Claude cannot launch or visually verify this app; only
`tsc --noEmit`, `npm test`, and `expo-doctor` run here. Real verification
(discovery/control against physical bulbs, and anything in the UI layer) requires the
user to build a dev build/APK and test on a phone on the same Wi-Fi as the bulbs. Say so
explicitly instead of claiming something "works".

## Structure

```
index.ts                   # entry: loads src/lib/polyfills BEFORE App (Buffer global)
App.tsx                    # shell: safe-area header + custom Bulbs/Flat/Animated/Themes tab bar
src/
├── theme.ts               # dark futuristic palette — single source of truth for colors
├── screens/
│   ├── BulbsScreen.tsx    # discover button + Flat master switch + bulb card grid
│   ├── FlatScreen.tsx     # whole-apartment power/brightness/colors/favorites
│   ├── AnimatedScreen.tsx # animated WiZ scene themes applied to all bulbs
│   └── ThemesScreen.tsx   # preset cards with one-tap apply-to-all
├── components/
│   └── BulbCard.tsx       # one bulb: rename (✎), on/off, state indicator, brightness, collapsible color/white/scenes
└── lib/
    ├── api.ts             # high-level facade: discoverBulbs, setColor, setAll*, favorites, …
    ├── store.ts           # AsyncStorage persistence: bulbs (by MAC) + favorite colors
    ├── color.ts           # HSV->RGB + kelvin->RGB conversions, random vivid color
    ├── presets.ts         # curated multi-bulb color presets (data + helpers)
    ├── animatedThemes.ts  # WiZ dynamic-scene themes (data + helpers)
    ├── polyfills.ts       # global Buffer shim required by react-native-udp
    ├── types.ts           # Bulb, PilotState, Scene, RGB
    └── wiz/
        ├── udp.ts         # UDP transport: sendUnicast (retry) + sendBroadcast (collect window)
        ├── protocol.ts    # getPilot/setPilot message builders + PilotParams types
        └── scenes.ts      # WiZ built-in scene id -> name map
```

UI components call `src/lib/api.ts` only — never `store` or `wiz/udp` directly. Keep new
features in this same shape.

## Conventions

- This codebase mirrors `wiz_control_backend`/`wiz_control_frontend` (same protocol
  builders, presets, scene map, store semantics). If you change shared logic (e.g. add a
  preset), flag that the siblings may want the same change — don't silently diverge.
- Named exports only; PascalCase types (`Bulb`, `PilotParams`), camelCase functions.
- Double quotes, semicolons, 2-space indent, `async`/`await`.
- Errors: unknown mac/preset -> `throw new Error("Unknown bulb"/"Unknown preset")`;
  UDP timeout -> rejected promise from `sendUnicast` after 3 retries. UI catches and
  shows per-card errors without breaking the rest of the list.
- Styling: `StyleSheet.create` colocated at the bottom of each component file; all colors
  come from `src/theme.ts` (dark bg `#0B0F1A`, cyan accent `#22D3EE`) — never hardcode
  colors in components. No styling library. Navigation is a hand-rolled tab switch in
  App.tsx — no react-navigation (would pull in native modules and force a dev-client
  rebuild); prefer pure-JS solutions for the same reason.
- `react-native-udp` types are incomplete (EventEmitter methods missing): `wiz/udp.ts`
  defines a local `WizSocket` interface and casts the created socket once. Extend that
  interface rather than sprinkling `as any`.
- Atomic commits, messages in English, conventional-commit style (`feat:`, `fix:`,
  `chore:`, `docs:`).

## Notes for making changes

- WiZ UDP port (38899) is a protocol constant, not configuration.
- `index.ts` must import `./src/lib/polyfills` before `App` — react-native-udp reads the
  global `Buffer` at import time.
- Expo SDK 57 enables the New Architecture by default; `react-native-udp` is flagged
  unmaintained (warning silenced via `expo.doctor.reactNativeDirectoryCheck.exclude` in
  package.json). If UDP breaks in a build, first suspect: New Architecture — fallback is
  `"newArchEnabled": false` in app.json.
- `app.json`: Android package / iOS bundle id are `com.mnatorres.wizcontrol`.
- The README documents the full run/build flow — keep it in sync when changing scripts,
  dependencies, or build steps.
