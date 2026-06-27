// ──────────────────────────────────────────────────────────────────────────────
// MPCard — Atomic card wrapper with glass-card styling
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '@/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface MPCardProps extends ViewProps {
  onPress?: () => void;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MPCard({
  onPress,
  children,
  style,
  ...rest
}: MPCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 150 });
    opacity.value = withTiming(0.9, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const cardStyle = {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.lg,
    ...SHADOWS.card,
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle, style]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}
