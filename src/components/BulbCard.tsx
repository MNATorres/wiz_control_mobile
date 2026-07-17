import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import * as api from "../lib/api";
import { shouldShowErrorMessage } from "../lib/bulbStatus";
import type { Bulb, PilotState, Scene } from "../lib/types";
import { colorPalette, colors } from "../theme";

type Mode = "color" | "white" | "scenes";

function rgbString(r?: number, g?: number, b?: number): string {
  return `rgb(${r ?? 255}, ${g ?? 255}, ${b ?? 255})`;
}

interface BulbCardProps {
  bulb: Bulb;
  scenes: Scene[];
  onRenamed: (bulb: Bulb) => void;
  onForgotten: (mac: string) => void;
  onStateChange: (mac: string, on: boolean) => void;
}

export function BulbCard({ bulb, scenes, onRenamed, onForgotten, onStateChange }: BulbCardProps) {
  const [pilot, setPilot] = useState<PilotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("color");
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(bulb.name ?? "");
  const nameRef = useRef(bulb.name ?? "");
  const nameInputRef = useRef<TextInput>(null);

  const refreshPilot = () => {
    api
      .getPilot(bulb.mac)
      .then((result) => {
        setPilot(result);
        setError(null);
        onStateChange(bulb.mac, result.state ?? false);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    refreshPilot();
    const interval = setInterval(refreshPilot, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulb.mac]);

  const toggle = (next: boolean) => {
    setPilot((p) => (p ? { ...p, state: next } : p));
    onStateChange(bulb.mac, next);
    api.setState(bulb.mac, next).catch((err: Error) => setError(err.message)).then(refreshPilot);
  };

  const commitDimming = (value: number) => {
    api.setDimming(bulb.mac, Math.round(value)).catch((err: Error) => setError(err.message));
  };

  const selectColor = (c: { r: number; g: number; b: number }) => {
    setPilot((p) => (p ? { ...p, ...c, sceneId: 0 } : p));
    api.setColor(bulb.mac, c).catch((err: Error) => setError(err.message));
  };

  const commitTemp = (value: number) => {
    const temp = Math.round(value);
    setPilot((p) => (p ? { ...p, temp } : p));
    api.setColorTemp(bulb.mac, temp).catch((err: Error) => setError(err.message));
  };

  const selectScene = (sceneId: number) => {
    setPilot((p) => (p ? { ...p, sceneId } : p));
    api.setScene(bulb.mac, sceneId, pilot?.speed).catch((err: Error) => setError(err.message));
  };

  const commitName = () => {
    if (name === nameRef.current) return;
    api
      .renameBulb(bulb.mac, name)
      .then((updated) => {
        nameRef.current = updated.name ?? "";
        onRenamed(updated);
      })
      .catch((err: Error) => setError(err.message));
  };

  const forget = () => {
    api.forgetBulb(bulb.mac).then(() => onForgotten(bulb.mac)).catch((err: Error) => setError(err.message));
  };

  // What the bulb is currently showing: a color dot (rgb), a white-tone dot
  // with its kelvin label (temp), or the active scene's name.
  const indicator = (() => {
    if (!pilot) return null;
    if (pilot.r !== undefined && pilot.g !== undefined && pilot.b !== undefined) {
      return { dot: rgbString(pilot.r, pilot.g, pilot.b), label: null };
    }
    if (pilot.temp) {
      const white = api.kelvinToRgb(pilot.temp);
      return { dot: rgbString(white.r, white.g, white.b), label: `${pilot.temp}K` };
    }
    if (pilot.sceneId) {
      return { dot: null, label: scenes.find((s) => s.id === pilot.sceneId)?.name ?? "Scene" };
    }
    return null;
  })();

  return (
    <View style={[styles.card, !pilot && styles.offline]}>
      <View style={styles.header}>
        <View style={styles.nameWrap}>
          <TextInput
            ref={nameInputRef}
            style={styles.name}
            value={name}
            placeholder={bulb.ip}
            placeholderTextColor={colors.textMuted}
            onChangeText={setName}
            onBlur={commitName}
            returnKeyType="done"
          />
          <Pressable onPress={() => nameInputRef.current?.focus()} hitSlop={8}>
            <Text style={styles.editIcon}>✎</Text>
          </Pressable>
        </View>
        <Switch
          value={pilot?.state ?? false}
          onValueChange={toggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.ip}>{bulb.ip}</Text>
        {indicator && (
          <View style={[styles.stateChip, !pilot?.state && styles.stateChipOff]}>
            {indicator.dot && <View style={[styles.stateDot, { backgroundColor: indicator.dot }]} />}
            {indicator.label && <Text style={styles.stateLabel}>{indicator.label}</Text>}
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorRow}>
          {shouldShowErrorMessage(pilot, error) && <Text style={styles.errorText}>{error}</Text>}
          <Pressable onPress={forget} style={styles.forgetWrap}>
            <Text style={styles.forget}>Forget</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.label}>BRIGHTNESS</Text>
      <Slider
        minimumValue={10}
        maximumValue={100}
        value={pilot?.dimming ?? 100}
        onSlidingComplete={commitDimming}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
      />

      <Pressable style={styles.expander} onPress={() => setExpanded((e) => !e)}>
        <Text style={styles.expanderText}>Colors & scenes</Text>
        <Text style={styles.expanderChevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.tabs}>
          {(["color", "white", "scenes"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.tab, mode === m && styles.tabActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === "color" ? "Color" : m === "white" ? "White" : "Scenes"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {expanded && mode === "color" && (
        <View style={styles.swatchGrid}>
          {colorPalette.map((c, i) => (
            <Pressable
              key={i}
              style={[styles.swatch, { backgroundColor: rgbString(c.r, c.g, c.b) }]}
              onPress={() => selectColor(c)}
            />
          ))}
        </View>
      )}

      {expanded && mode === "white" && (
        <>
          <Text style={styles.label}>COLOR TEMPERATURE ({pilot?.temp ?? 2700}K)</Text>
          <Slider
            minimumValue={2200}
            maximumValue={6500}
            step={100}
            value={pilot?.temp ?? 2700}
            onSlidingComplete={commitTemp}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </>
      )}

      {expanded && mode === "scenes" && (
        <View style={styles.sceneGrid}>
          {scenes.map((scene) => (
            <Pressable
              key={scene.id}
              style={[styles.scene, pilot?.sceneId === scene.id && styles.sceneActive]}
              onPress={() => selectScene(scene.id)}
            >
              <Text
                style={[styles.sceneText, pilot?.sceneId === scene.id && styles.sceneTextActive]}
              >
                {scene.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  offline: {
    opacity: 0.55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    padding: 0,
  },
  editIcon: {
    color: colors.textMuted,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -6,
  },
  ip: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stateChipOff: {
    opacity: 0.45,
  },
  stateDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flexShrink: 1,
  },
  forgetWrap: {
    marginLeft: "auto",
  },
  forget: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  expander: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceDeep,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  expanderText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  expanderChevron: {
    fontSize: 12,
    color: colors.accent,
  },
  tabs: {
    flexDirection: "row",
    gap: 2,
    backgroundColor: colors.surfaceDeep,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sceneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  scene: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sceneActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  sceneText: {
    fontSize: 12,
    color: colors.text,
  },
  sceneTextActive: {
    color: colors.accent,
  },
});
