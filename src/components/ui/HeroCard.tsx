import type { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { GlassCard } from "./GlassCard";
import { HERO_CARD, SURFACE_TINT } from "@/constants/designSystem";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The one card allowed a distinct fill (spec section 4: radius 30, padding
 * 24, gradient #51308F → #2C194D). Every screen's hero journey card should
 * be built from this instead of hand-rolling its own gradient/radius/shadow.
 */
export function HeroCard({ children, style }: Props) {
  return (
    <GlassCard
      noPadding
      tint={SURFACE_TINT.hero}
      style={[styles.card, style]}
    >
      {children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: HERO_CARD.radius,
  },
});
