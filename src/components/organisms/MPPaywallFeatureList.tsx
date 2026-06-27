// ──────────────────────────────────────────────────────────────────────────────
// MPPaywallFeatureList — Staggered list of premium features with check/lock
// ──────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SIZES, SPACING } from '@/theme';

interface Feature {
  label: string;
  /** If true, show lock icon and dim opacity (non-Pro feature) */
  locked?: boolean;
}

type Props = {
  features: Feature[];
  /** Delay between each item's stagger animation (ms). Default 100. */
  staggerDelay?: number;
};

interface FeatureRowProps {
  label: string;
  locked?: boolean;
  index: number;
  staggerDelay: number;
}

function FeatureRow({ label, locked, index, staggerDelay }: FeatureRowProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const delay = index * staggerDelay;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }));
  }, [index, staggerDelay, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          gap: 14,
        },
        style,
      ]}
    >
      {/* Check or lock circle */}
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: locked ? COLORS.elevated : COLORS.purple,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MPIcon
          name={locked ? 'Lock' : 'Check'}
          size="xs"
          iconColor={locked ? COLORS.textMuted : COLORS.textPrimary}
        />
      </View>

      <MPText
        variant="body"
        color={locked ? 'muted' : 'primary'}
        style={{ flex: 1, opacity: locked ? 0.5 : 1 }}
      >
        {label}
      </MPText>
    </Animated.View>
  );
}

export function MPPaywallFeatureList({ features, staggerDelay = 100 }: Props) {
  return (
    <View style={{ gap: 4 }}>
      {features.map((feat, i) => (
        <FeatureRow
          key={feat.label}
          label={feat.label}
          locked={feat.locked}
          index={i}
          staggerDelay={staggerDelay}
        />
      ))}
    </View>
  );
}
