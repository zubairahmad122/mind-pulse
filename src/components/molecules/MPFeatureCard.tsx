// ──────────────────────────────────────────────────────────────────────────────
// MPFeatureCard — Feature grid card with icon, label, badge slot, and dots
// ──────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { MPBadge } from '@/components/atoms/MPBadge';
import { COLORS, RADIUS, SPACING } from '@/theme';

const DOT_SIZE = 5;
const TOTAL_DOTS = 4;

type Props = {
  iconName: string;
  label: string;
  iconBgColor: string;
  /** 0–4 filled dots representing weekly progress */
  weeklyCompleted?: number;
  /** Show a "START HERE" gold badge */
  showStartBadge?: boolean;
  /** Pulse the icon to draw attention */
  pulse?: boolean;
  onPress?: () => void;
};

export function MPFeatureCard({
  iconName,
  label,
  iconBgColor,
  weeklyCompleted = 0,
  showStartBadge = false,
  pulse = false,
  onPress,
}: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseAnim]);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
      style={{
        flex: 1,
        minWidth: 64,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 6,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
        gap: 8,
      }}
    >
      {/* Badge — absolute top-right */}
      {showStartBadge && (
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <MPBadge text="START HERE" variant="premium" />
        </View>
      )}

      {/* Icon circle */}
      <Animated.View style={pulse ? { transform: [{ scale: pulseAnim }] } : undefined}>
        <MPIcon
          name={iconName}
          size="sm"
          iconColor={COLORS.textPrimary}
          containerBg={iconBgColor}
        />
      </Animated.View>

      {/* Label — never truncate */}
      <MPText
        variant="caption-xs"
        color="primary"
        numberOfLines={2}
        style={{ textAlign: 'center', letterSpacing: 0.2, minHeight: 28 }}
      >
        {label}
      </MPText>

      {/* Progress dots */}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
          <View
            key={i}
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: i < weeklyCompleted ? COLORS.purple : COLORS.elevated,
            }}
          />
        ))}
      </View>
    </Container>
  );
}
