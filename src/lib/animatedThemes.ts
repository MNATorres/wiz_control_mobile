// Animated themes map to WiZ's built-in dynamic scenes: the animation runs in
// the bulb firmware, so it keeps playing after the app is closed.
export interface AnimatedTheme {
  key: string;
  name: string;
  emoji: string;
  sceneId: number;
  speed: number;
}

export const ANIMATED_THEMES: AnimatedTheme[] = [
  { key: "ocean", name: "Ocean", emoji: "🌊", sceneId: 1, speed: 100 },
  { key: "romance", name: "Romance", emoji: "💗", sceneId: 2, speed: 80 },
  { key: "sunset", name: "Sunset", emoji: "🌅", sceneId: 3, speed: 80 },
  { key: "party", name: "Party", emoji: "🎉", sceneId: 4, speed: 160 },
  { key: "fireplace", name: "Fireplace", emoji: "🔥", sceneId: 5, speed: 110 },
  { key: "forest", name: "Forest", emoji: "🌲", sceneId: 7, speed: 90 },
  { key: "pastel-flow", name: "Pastel Flow", emoji: "🎨", sceneId: 8, speed: 90 },
  { key: "candlelight", name: "Candlelight", emoji: "🕯️", sceneId: 29, speed: 60 },
];

export function getAnimatedTheme(key: string): AnimatedTheme | undefined {
  return ANIMATED_THEMES.find((t) => t.key === key);
}
