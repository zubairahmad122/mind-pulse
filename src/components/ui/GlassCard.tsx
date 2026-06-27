import { GLASS_CARD } from "@/constants/theme";
import { usePillarTheme } from "@/context/PillarContext";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional card tint gradient — defaults to the app's default (mind-blue tint).
   * Example: pass `['rgba(245,245,250,0.85)', 'rgba(255,255,255,0.95)']` for light-mode cards.
   */
  tint?: readonly [string, string];
  /** Skip padding — useful when the children manage their own padding. */
  noPadding?: boolean;
  /**
   * Lightweight variant: renders border + gradient only, no BlurView.
   * Use for list items (e.g. history session cards) where blur on every row
   * would hurt scroll performance.
   */
  simple?: boolean;
}

/**
 * Premium glassmorphism card.
 *
 * Clean, modern glass: a full subtle border all the way around, a soft uniform
 * tint gradient fill, an optional frosted blur, and a gentle ambient glow — no
 * harsh top-only border line, no bright highlight edge, and no heavy inner
 * shadows (the old look read as a muddy double-layer card on the dark bg).
 *
 * Use `simple` for list items to skip the blur layer (better scroll perf).
 */
// Layout props describe how *children* should be arranged, so they belong on
// the inner content wrapper. Everything else (margin, width, border overrides,
// etc.) describes the card box itself and belongs on the outer wrapper. Without
// this split, a caller passing `flexDirection: 'row'` / `gap` via `style`
// (expecting it to lay out their content) silently does nothing — the outer
// wrapper only ever has one non-absolute child, so those props have no visible
// effect there, and content falls back to the default column with no gap.
const CHILD_LAYOUT_KEYS = [
  'flexDirection',
  'alignItems',
  'justifyContent',
  'flexWrap',
  'gap',
  'rowGap',
  'columnGap',
] as const;

function splitCardStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const outer: ViewStyle = {};
  const inner: ViewStyle = {};
  for (const key of Object.keys(flat) as (keyof ViewStyle)[]) {
    if ((CHILD_LAYOUT_KEYS as readonly string[]).includes(key)) {
      (inner as Record<string, unknown>)[key] = flat[key];
    } else {
      (outer as Record<string, unknown>)[key] = flat[key];
    }
  }
  return { outer, inner };
}

export function GlassCard({
  children,
  style,
  tint,
  noPadding,
  simple,
}: GlassCardProps) {
  const pillar = usePillarTheme();
  const colors = tint ?? pillar.cardTint;
  const { outer, inner } = splitCardStyle(style);
  return (
    <View style={[baseStyles.outer, outer]}>
      {!simple && (
        <BlurView
          intensity={GLASS_CARD.blurIntensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft top inner highlight — a gentle light catch across the top edge
          (subtle wash, NOT the old harsh 1.5px line). Gives the glass depth. */}
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={baseStyles.topSheen}
        pointerEvents="none"
      />
      {/* Soft bottom shade — grounds the glass with a faint inner shadow so the
          card reads as raised, not flat. */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.22)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={baseStyles.bottomShade}
        pointerEvents="none"
      />
      <View style={[noPadding ? undefined : baseStyles.padding, inner]}>{children}</View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  outer: {
    // Softer, more generous rounding for the premium "pill card" look.
    borderRadius: 24,
    overflow: "hidden",
    // Clean full border all around — soft, even, no top-only edge.
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    // Gentle ambient glow for depth without the muddy inner-shadow look.
    shadowColor: "rgba(124, 58, 237, 0.18)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  padding: {
    padding: 18,
  },
});
