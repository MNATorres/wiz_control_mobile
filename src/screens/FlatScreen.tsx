import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import * as api from "../lib/api";
import type { RGB } from "../lib/types";
import { colorPalette, colors } from "../theme";

function rgbString(c: RGB): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function sameColor(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

// Fixed rainbow strip rendered above the hue slider as a visual reference.
const HUE_STEPS = Array.from({ length: 24 }, (_, i) => api.hsvToRgb(i * 15, 1, 1));

export function FlatScreen() {
  const [on, setOn] = useState(false);
  const [brightness, setBrightness] = useState(70);
  const [current, setCurrent] = useState<RGB | null>(null);
  const [favorites, setFavorites] = useState<RGB[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(100);
  const [pickerValue, setPickerValue] = useState(100);

  const pickerColor = api.hsvToRgb(hue, saturation / 100, pickerValue / 100);

  // The power switch reflects reality: on if at least one bulb reports on.
  const refreshPower = async () => {
    try {
      const bulbs = await api.listBulbs();
      if (bulbs.length === 0) return;
      const results = await Promise.allSettled(bulbs.map((b) => api.getPilot(b.mac)));
      const states = results
        .filter((r): r is PromiseFulfilledResult<{ state?: boolean }> => r.status === "fulfilled")
        .map((r) => r.value.state ?? false);
      if (states.length > 0) setOn(states.some(Boolean));
    } catch {
      // ignore — the next poll retries
    }
  };

  useEffect(() => {
    refreshPower();
    api.getFavoriteColors().then(setFavorites).catch(() => {});
    const interval = setInterval(refreshPower, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePower = (next: boolean) => {
    setOn(next);
    setError(null);
    api.setAllState(next).catch((err: Error) => setError(err.message));
  };

  const commitBrightness = (value: number) => {
    const v = Math.round(value);
    setBrightness(v);
    api.setAllDimming(v).catch((err: Error) => setError(err.message));
  };

  const applyColor = (c: RGB) => {
    setCurrent(c);
    setOn(true); // setAllColor turns the bulbs on
    setError(null);
    api.setAllColor(c).catch((err: Error) => setError(err.message));
  };

  const rollRandom = () => {
    applyColor(api.randomColor());
  };

  // Slider callbacks receive the final value directly — state updates from
  // onValueChange may not be flushed yet when onSlidingComplete fires.
  const applyHsv = (h: number, s: number, v: number) => {
    applyColor(api.hsvToRgb(h, s / 100, v / 100));
  };

  const isFavorite = current !== null && favorites.some((f) => sameColor(f, current));

  const saveFavorite = () => {
    if (!current || isFavorite) return;
    api.addFavoriteColor(current).then(setFavorites).catch((err: Error) => setError(err.message));
  };

  const removeFavorite = (c: RGB) => {
    api.removeFavoriteColor(c).then(setFavorites).catch((err: Error) => setError(err.message));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Power</Text>
          <Switch
            value={on}
            onValueChange={togglePower}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>BRIGHTNESS</Text>
        <Slider
          minimumValue={10}
          maximumValue={100}
          value={brightness}
          onSlidingComplete={commitBrightness}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>STATIC COLORS</Text>
        <View style={styles.swatchGrid}>
          {colorPalette.map((c, i) => (
            <Pressable
              key={i}
              style={[
                styles.swatch,
                { backgroundColor: rgbString(c) },
                current !== null && sameColor(c, current) && styles.swatchActive,
              ]}
              onPress={() => applyColor(c)}
            />
          ))}
        </View>

        <View style={styles.colorActions}>
          <Pressable style={styles.randomBtn} onPress={rollRandom}>
            <Text style={styles.randomBtnText}>🎲 Random</Text>
          </Pressable>
          {current && (
            <Pressable
              style={[styles.saveBtn, isFavorite && styles.saveBtnDisabled]}
              onPress={saveFavorite}
              disabled={isFavorite}
            >
              <View style={[styles.currentSwatch, { backgroundColor: rgbString(current) }]} />
              <Text style={styles.saveBtnText}>{isFavorite ? "★ Saved" : "☆ Save color"}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.pickerHeader}>
          <Text style={styles.sectionLabel}>COLOR PICKER</Text>
          <View style={[styles.pickerPreview, { backgroundColor: rgbString(pickerColor) }]} />
        </View>

        <View style={styles.rainbow}>
          {HUE_STEPS.map((c, i) => (
            <View key={i} style={[styles.rainbowSeg, { backgroundColor: rgbString(c) }]} />
          ))}
        </View>
        <Slider
          minimumValue={0}
          maximumValue={360}
          step={1}
          value={hue}
          onValueChange={setHue}
          onSlidingComplete={(v) => applyHsv(v, saturation, pickerValue)}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />

        <Text style={styles.pickerLabel}>SATURATION</Text>
        <Slider
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={saturation}
          onValueChange={setSaturation}
          onSlidingComplete={(v) => applyHsv(hue, v, pickerValue)}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />

        <Text style={styles.pickerLabel}>BRIGHTNESS</Text>
        <Slider
          minimumValue={5}
          maximumValue={100}
          step={1}
          value={pickerValue}
          onValueChange={setPickerValue}
          onSlidingComplete={(v) => applyHsv(hue, saturation, v)}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>FAVORITES</Text>
        {favorites.length === 0 ? (
          <Text style={styles.hint}>No favorites yet — apply a color and tap "☆ Save color".</Text>
        ) : (
          <>
            <View style={styles.swatchGrid}>
              {favorites.map((c, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.swatch,
                    { backgroundColor: rgbString(c) },
                    current !== null && sameColor(c, current) && styles.swatchActive,
                  ]}
                  onPress={() => applyColor(c)}
                  onLongPress={() => removeFavorite(c)}
                />
              ))}
            </View>
            <Text style={styles.hint}>Tap to apply · long-press to remove</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  colorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  randomBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  randomBtnText: {
    color: colors.bg,
    fontWeight: "700",
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 13,
  },
  currentSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  pickerPreview: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginTop: -4,
  },
  rainbow: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  rainbowSeg: {
    flex: 1,
  },
});
