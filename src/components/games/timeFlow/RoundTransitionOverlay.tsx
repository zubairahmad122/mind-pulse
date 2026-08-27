import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { FONTS } from "@/constants/designSystem";

export type RoundTransitionState =
  | "none"
  | "correct"
  | "incorrect"
  | "milestone"
  | "nextRound"
  | "resume";

export function RoundTransitionOverlay({
  state,
  title,
  detail,
  reducedMotion,
}: {
  state: RoundTransitionState;
  title: string;
  detail?: string;
  reducedMotion: boolean;
}) {
  const opacity = useSharedValue(0),
    scale = useSharedValue(0.98);
  useEffect(() => {
    opacity.value = withTiming(state === "none" ? 0 : 1, {
      duration: reducedMotion ? 60 : 170,
    });
    scale.value = withTiming(state === "none" ? 0.98 : 1, {
      duration: reducedMotion ? 60 : 190,
    });
  }, [opacity, reducedMotion, scale, state]);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  if (state === "none") return null;
  const positive = state === "correct" || state === "milestone";
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.overlay, animated]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, positive && styles.positive]}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </Animated.View>
  );
}

export function TimeFlowSessionProgress({
  roundIndex,
  total,
}: {
  roundIndex: number;
  total: number;
}) {
  const phase =
    roundIndex < 3
      ? "WARM-UP"
      : roundIndex < 6
        ? "BUILD"
        : roundIndex < 9
          ? "FOCUS"
          : roundIndex < 11
            ? "PUSH"
            : "FINAL FLOW";
  return (
    <View style={styles.session}>
      <View style={styles.row}>
        <Text style={styles.phase}>{phase}</Text>
        <Text style={styles.count}>
          {roundIndex + 1} / {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${((roundIndex + 1) / total) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,8,22,.58)",
  },
  copy: { alignItems: "center", paddingHorizontal: 28 },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 25,
    letterSpacing: 0.5,
    color: "#F2E9FF",
    textAlign: "center",
  },
  positive: { color: "#72E8C0" },
  detail: {
    marginTop: 6,
    fontFamily: FONTS.headingSemi,
    fontSize: 12,
    color: "rgba(219,226,247,.7)",
    textAlign: "center",
  },
  session: { marginTop: 7 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phase: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#B89AFF",
  },
  count: { fontSize: 9.5, fontWeight: "700", color: "rgba(255,255,255,.42)" },
  track: {
    height: 3,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,.075)",
    marginTop: 6,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "rgba(125,235,250,.65)",
  },
});
