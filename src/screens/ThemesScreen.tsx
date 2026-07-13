import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as api from "../lib/api";
import { colors } from "../theme";

export function ThemesScreen() {
  const presets = api.getPresets();
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [hasBulbs, setHasBulbs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listBulbs()
      .then((bulbs) => setHasBulbs(bulbs.length > 0))
      .catch(() => setHasBulbs(false));
  }, []);

  const apply = (key: string) => {
    setApplying(key);
    setApplied(null);
    setError(null);
    api
      .applyPreset(key)
      .then(() => setApplied(key))
      .catch((err: Error) => setError(err.message))
      .finally(() => setApplying(null));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        One tap applies a color combination across every bulb at once.
      </Text>

      {!hasBulbs && (
        <Text style={styles.hint}>No bulbs saved yet — discover them from the Bulbs tab first.</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.grid}>
        {presets.map((preset) => (
          <View key={preset.key} style={[styles.card, applied === preset.key && styles.cardApplied]}>
            <View style={styles.swatches}>
              {preset.colors.map((c, i) => (
                <View
                  key={i}
                  style={[
                    styles.swatch,
                    { backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` },
                    i > 0 && styles.swatchOverlap,
                  ]}
                />
              ))}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{preset.name}</Text>
              <Text style={styles.cardMeta}>
                {preset.colors.length} tone{preset.colors.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Pressable
              style={[styles.applyBtn, applying !== null && styles.applyBtnDisabled]}
              disabled={applying !== null || !hasBulbs}
              onPress={() => apply(preset.key)}
            >
              <Text style={styles.applyBtnText}>
                {applying === preset.key ? "Applying…" : applied === preset.key ? "Applied ✓" : "Apply"}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
  },
  intro: {
    fontSize: 13,
    color: colors.textMuted,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardApplied: {
    borderColor: colors.accentBorder,
  },
  swatches: {
    flexDirection: "row",
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  swatchOverlap: {
    marginLeft: -10,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  applyBtn: {
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
