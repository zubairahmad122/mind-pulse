import { GLASS_CARD, RADIUS, SHADOWS, SURFACE_TINT } from "@/constants/designSystem";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional fill override — defaults to the frozen flat glass fill
   * (`SURFACE_TINT.card`). Every "normal" card uses the same fill (spec:
   * "No different card styles") — the one legitimate exception is the Hero
   * card, which should pass `tint={SURFACE_TINT.hero}`.
   */
  tint?: readonly [string, string, ...string[]];
  /** Skip padding — useful when the children manage their own padding. */
  noPadding?: boolean;
  /**
   * Lightweight variant: renders border + fill only, no BlurView.
   * Use for list items (e.g. history session cards) where blur on every row
   * would hurt scroll performance.
   */
  simple?: boolean;
}

/**
 * The single canonical glass card — flat rgba(255,255,255,0.05) fill,
 * rgba(255,255,255,0.08) border, a soft top highlight, and the frozen card
 * shadow. Every card in the app should be built from this (or `HeroCard`
 * for the one screen-level hero surface), never a one-off `StyleSheet`.
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
  "flexDirection",
  "alignItems",
  "justifyContent",
  "flexWrap",
  "gap",
  "rowGap",
  "columnGap",
] as const;

function splitCardStyle(style: StyleProp<ViewStyle>): {
  outer: ViewStyle;
  inner: ViewStyle;
} {
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const outer: ViewStyle = {};
  const inner: ViewStyle = {};
  for (const key of Object.keys(flat) as (keyof ViewStyle)[]) {
    // `flex` sizes the card's own box (outer, against its parent) AND must
    // also propagate to the inner content wrapper — otherwise a `flex: 1`
    // card whose content is a `ScrollView` collapses to zero height, because
    // the inner wrapper (which the ScrollView actually sits inside) never
    // gets a bounded size to flex within.
    if (key === 'flex') {
      outer.flex = flat.flex;
      inner.flex = flat.flex;
    } else if ((CHILD_LAYOUT_KEYS as readonly string[]).includes(key)) {
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
  const fill = tint ?? SURFACE_TINT.card;
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
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top highlight — the spec's single subtle light catch across the top edge. */}
      <LinearGradient
        colors={[GLASS_CARD.topHighlight, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={baseStyles.topSheen}
        pointerEvents="none"
      />
      <View style={[noPadding ? undefined : baseStyles.padding, inner]}>
        {children}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GLASS_CARD.border,
    ...SHADOWS.card,
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  padding: {
    padding: 18,
  },
});
