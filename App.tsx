import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as api from "./src/lib/api";
import type { Bulb, Scene } from "./src/lib/types";
import type { Preset } from "./src/lib/presets";
import { BulbCard } from "./src/components/BulbCard";

export default function App() {
  const [bulbs, setBulbs] = useState<Bulb[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    api.listBulbs().then(setBulbs).catch((err: Error) => setError(err.message));
    setScenes(api.getScenes());
    setPresets(api.getPresets());
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

  const applyPreset = (key: string) => {
    setApplyingPreset(key);
    setError(null);
    api
      .applyPreset(key)
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setApplyingPreset(null);
        setRefreshSignal((n) => n + 1);
      });
  };

  const handleRenamed = (updated: Bulb) => {
    setBulbs((current) => current.map((b) => (b.mac === updated.mac ? updated : b)));
  };

  const handleForgotten = (mac: string) => {
    setBulbs((current) => current.filter((b) => b.mac !== mac));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>WiZ Control</Text>
            <Text style={styles.subtitle}>Smart lighting, right on your network</Text>
          </View>
          <Pressable
            style={[styles.discoverBtn, discovering && styles.discoverBtnDisabled]}
            onPress={discover}
            disabled={discovering}
          >
            <Text style={styles.discoverBtnText}>
              {discovering ? "Discovering…" : "Discover"}
            </Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {bulbs.length > 0 && presets.length > 0 && (
          <View style={styles.presetSection}>
            <Text style={styles.sectionLabel}>Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetBar}>
              {presets.map((preset) => (
                <Pressable
                  key={preset.key}
                  style={styles.presetButton}
                  disabled={applyingPreset !== null}
                  onPress={() => applyPreset(preset.key)}
                >
                  <View style={styles.swatches}>
                    {preset.colors.map((c, i) => (
                      <View
                        key={i}
                        style={[
                          styles.presetSwatch,
                          { backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` },
                          i > 0 && styles.presetSwatchOverlap,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.presetName}>
                    {applyingPreset === preset.key ? "Applying…" : preset.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {bulbs.length === 0 && !discovering && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No bulbs yet</Text>
            <Text style={styles.emptyHint}>Tap "Discover" to scan your Wi-Fi network.</Text>
          </View>
        )}

        {discovering && bulbs.length === 0 && (
          <ActivityIndicator style={styles.spinner} color="#6366f1" />
        )}

        <View style={styles.grid}>
          {bulbs.map((bulb) => (
            <BulbCard
              key={bulb.mac}
              bulb={bulb}
              scenes={scenes}
              onRenamed={handleRenamed}
              onForgotten={handleForgotten}
              refreshSignal={refreshSignal}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  discoverBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  discoverBtnDisabled: {
    opacity: 0.6,
  },
  discoverBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
  },
  presetSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  presetBar: {
    gap: 8,
    paddingRight: 8,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  swatches: {
    flexDirection: "row",
  },
  presetSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  presetSwatchOverlap: {
    marginLeft: -6,
  },
  presetName: {
    fontSize: 13,
    color: "#111827",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  emptyHint: {
    fontSize: 13,
    color: "#9ca3af",
  },
  spinner: {
    marginTop: 24,
  },
  grid: {
    gap: 12,
  },
});
