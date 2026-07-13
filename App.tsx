import { useState } from "react";
import { Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import { BulbsScreen } from "./src/screens/BulbsScreen";
import { ThemesScreen } from "./src/screens/ThemesScreen";

type Tab = "bulbs" | "themes";

const TABS: { key: Tab; label: string }[] = [
  { key: "bulbs", label: "Bulbs" },
  { key: "themes", label: "Themes" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("bulbs");

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>WiZ Control</Text>
        <View style={styles.titleUnderline} />
        <Text style={styles.subtitle}>Smart lighting, right on your network</Text>
      </View>

      <View style={styles.body}>{tab === "bulbs" ? <BulbsScreen /> : <ThemesScreen />}</View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <View style={[styles.tabDot, tab === t.key && styles.tabDotActive]} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: (RNStatusBar.currentHeight ?? 44) + 28,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.text,
  },
  titleUnderline: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceDeep,
    paddingTop: 10,
    paddingBottom: 22,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  tabDotActive: {
    backgroundColor: colors.accent,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
  },
});
