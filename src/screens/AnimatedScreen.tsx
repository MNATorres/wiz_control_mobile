import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as api from "../lib/api";
import { colors } from "../theme";

export function AnimatedScreen() {
  const [themes] = useState(() => api.getAnimatedThemes());
  const [applying, setApplying] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (key: string) => {
    setApplying(key);
    setError(null);
    api
      .applyAnimatedTheme(key)
      .then(() => setActive(key))
      .catch((err: Error) => setError(err.message))
      .finally(() => setApplying(null));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Animations run on the bulbs themselves — they keep playing after you close the app.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.grid}>
        {themes.map((theme) => (
          <Pressable
            key={theme.key}
            style={[styles.card, active === theme.key && styles.cardActive]}
            disabled={applying !== null}
            onPress={() => apply(theme.key)}
          >
            <Text style={styles.emoji}>{theme.emoji}</Text>
            <Text style={[styles.name, active === theme.key && styles.nameActive]}>
              {applying === theme.key ? "Applying…" : theme.name}
            </Text>
          </Pressable>
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
  hint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  card: {
    width: "48.5%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  cardActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  emoji: {
    fontSize: 34,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  nameActive: {
    color: colors.accent,
  },
});
