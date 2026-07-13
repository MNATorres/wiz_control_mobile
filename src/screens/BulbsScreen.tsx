import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as api from "../lib/api";
import type { Bulb, Scene } from "../lib/types";
import { BulbCard } from "../components/BulbCard";
import { colors } from "../theme";

export function BulbsScreen() {
  const [bulbs, setBulbs] = useState<Bulb[]>([]);
  const [scenes] = useState<Scene[]>(() => api.getScenes());
  const [discovering, setDiscovering] = useState(false);
  const [allOn, setAllOn] = useState(true);
  const [gridKey, setGridKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBulbs().then(setBulbs).catch((err: Error) => setError(err.message));
  }, []);

  const discover = () => {
    setDiscovering(true);
    setError(null);
    api
      .discoverBulbs()
      .then(setBulbs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setDiscovering(false));
  };

  const handleRenamed = (updated: Bulb) => {
    setBulbs((current) => current.map((b) => (b.mac === updated.mac ? updated : b)));
  };

  const handleForgotten = (mac: string) => {
    setBulbs((current) => current.filter((b) => b.mac !== mac));
  };

  const toggleAll = (next: boolean) => {
    setAllOn(next);
    api
      .setAllState(next)
      .catch((err: Error) => setError(err.message))
      // Remount the cards so they re-read pilot state right away.
      .finally(() => setGridKey((k) => k + 1));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {bulbs.length > 0 ? `${bulbs.length} bulb${bulbs.length === 1 ? "" : "s"}` : " "}
        </Text>
        <Pressable
          style={[styles.discoverBtn, discovering && styles.discoverBtnDisabled]}
          onPress={discover}
          disabled={discovering}
        >
          <Text style={styles.discoverBtnText}>{discovering ? "Discovering…" : "Discover"}</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {bulbs.length > 0 && (
        <View style={styles.masterRow}>
          <Text style={styles.masterLabel}>All lights</Text>
          <Switch
            value={allOn}
            onValueChange={toggleAll}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
      )}

      {bulbs.length === 0 && !discovering && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No bulbs yet</Text>
          <Text style={styles.emptyHint}>Tap "Discover" to scan your Wi-Fi network.</Text>
        </View>
      )}

      {discovering && bulbs.length === 0 && <ActivityIndicator style={styles.spinner} color={colors.accent} />}

      <View style={styles.grid} key={gridKey}>
        {bulbs.map((bulb) => (
          <View key={bulb.mac} style={styles.gridItem}>
            <BulbCard
              bulb={bulb}
              scenes={scenes}
              onRenamed={handleRenamed}
              onForgotten={handleForgotten}
            />
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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
  },
  discoverBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  discoverBtnDisabled: {
    opacity: 0.6,
  },
  discoverBtnText: {
    color: colors.bg,
    fontWeight: "700",
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  masterLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  spinner: {
    marginTop: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  gridItem: {
    width: "48.5%",
  },
});
