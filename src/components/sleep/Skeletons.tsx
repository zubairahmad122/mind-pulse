// ─────────────────────────────────────────────────────────────────────────────
// Shared loading skeletons for the Sleep tab (Tonight / Routine / Analysis).
// Built from the same GlassCard the live screens use, so the loading state
// reads as the real layout settling in — not a different, flatter design.
// ─────────────────────────────────────────────────────────────────────────────

import { GlassCard } from "@/components/ui/GlassCard";
import { useEffect } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// ── Self-animating shimmer block ────────────────────────────────────────────
export function Shimmer({
  w = "100%",
  h,
  r = 8,
  style,
}: {
  w?: DimensionValue;
  h: number;
  r?: number;
  style?: ViewStyle;
}) {
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.8, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[
        {
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: "rgba(255,255,255,0.08)",
        },
        anim,
        style,
      ]}
    />
  );
}

export const ShimmerCircle = ({ size }: { size: number }) => (
  <Shimmer w={size} h={size} r={size / 2} />
);

// ── Routine tab skeleton ────────────────────────────────────────────────────
export function RoutineSkeleton() {
  return (
    <View style={{ gap: 16, paddingBottom: 120 }}>
      {/* AI recommendation */}
      <GlassCard style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ShimmerCircle size={14} />
          <Shimmer w={130} h={11} r={3} />
        </View>
        <Shimmer h={13} />
        <Shimmer w="70%" h={13} />
      </GlassCard>

      {/* Two time-picker rows */}
      {[0, 1].map((i) => (
        <GlassCard key={i} style={{ gap: 14 }}>
          <Shimmer w={90} h={14} r={4} />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Shimmer w={56} h={44} r={14} />
            <Shimmer w={110} h={32} r={6} />
            <Shimmer w={56} h={44} r={14} />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Shimmer h={36} r={12} style={{ flex: 1 }} />
            <Shimmer h={36} r={12} style={{ flex: 1 }} />
          </View>
        </GlassCard>
      ))}

      {/* Sleep goal */}
      <GlassCard style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Shimmer w={70} h={12} r={3} />
          <Shimmer w={64} h={16} r={4} />
        </View>
        <Shimmer h={10} r={5} />
      </GlassCard>

      {/* Active days */}
      <View style={{ gap: 10 }}>
        <Shimmer w={90} h={14} r={4} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <ShimmerCircle key={i} size={40} />
          ))}
        </View>
      </View>

      {/* Reminder */}
      <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Shimmer w={130} h={14} r={4} />
          <Shimmer w={100} h={11} r={3} />
        </View>
        <Shimmer w={48} h={28} r={14} />
      </GlassCard>

      {/* Save button */}
      <Shimmer h={52} r={16} style={{ marginTop: 4 }} />
    </View>
  );
}

// ── Analysis tab skeleton ───────────────────────────────────────────────────
export function AnalysisSkeleton() {
  return (
    <View style={{ gap: 20 }}>
      {/* Summary card */}
      <GlassCard noPadding style={{ padding: 18, gap: 18 }}>
        <View style={{ gap: 10 }}>
          <Shimmer w={90} h={11} r={3} />
          <Shimmer w={130} h={34} r={6} />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Shimmer w={50} h={10} r={3} />
              <Shimmer w={80} h={14} r={4} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", gap: 6 }}>
              <Shimmer w={50} h={10} r={3} />
              <Shimmer w={80} h={14} r={4} />
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />

        {/* Stages bar */}
        <View style={{ gap: 12 }}>
          <Shimmer w={80} h={11} r={3} />
          <Shimmer h={10} r={5} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Shimmer h={11} r={3} style={{ flex: 1 }} />
            <Shimmer h={11} r={3} style={{ flex: 1 }} />
            <Shimmer h={11} r={3} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />

        {/* Insight + button */}
        <View style={{ gap: 8 }}>
          <Shimmer w={60} h={11} r={3} />
          <Shimmer h={13} />
          <Shimmer w="65%" h={13} />
        </View>
        <Shimmer h={48} r={14} />
      </GlassCard>

      {/* Trends card */}
      <View style={{ gap: 11 }}>
        <Shimmer w={90} h={10} r={3} />
        <GlassCard style={{ gap: 16 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ gap: 6 }}>
              <Shimmer w={56} h={16} r={4} />
              <Shimmer w={50} h={10} r={3} />
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Shimmer w={56} h={16} r={4} />
              <Shimmer w={50} h={10} r={3} />
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              height: 56,
            }}
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <Shimmer
                key={i}
                w={22}
                h={[28, 44, 20, 52, 36, 48, 30][i]}
                r={5}
              />
            ))}
          </View>
        </GlassCard>
      </View>
    </View>
  );
}
