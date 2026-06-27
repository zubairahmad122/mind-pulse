// ──────────────────────────────────────────────────────────────────────────────
// MPButton — Atomic button with variants, sizes, gradient, loading state
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { COLORS, GRADIENTS, RADIUS, SIZES, TYPOGRAPHY } from '@/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface MPButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title: string;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: object;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HEIGHT_MAP: Record<ButtonSize, number> = {
  sm: SIZES.buttonSm,
  md: SIZES.buttonMd,
  lg: SIZES.buttonLg,
};

const FONT_SIZE_MAP: Record<ButtonSize, number> = {
  sm: TYPOGRAPHY['body-sm'].fontSize,
  md: TYPOGRAPHY.body.fontSize,
  lg: 17,
};

const ICON_SIZE_MAP: Record<ButtonSize, number> = {
  sm: SIZES.iconSm,
  md: SIZES.iconMd,
  lg: SIZES.iconLg,
};

export function MPButton({
  variant = 'primary',
  size = 'md',
  title,
  iconLeft: IconLeft,
  iconRight: IconRight,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: MPButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const height = HEIGHT_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];
  const isDisabled = disabled || loading;

  // ── Primary: gradient fill ────────────────────────────────────────────
  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[{ width: fullWidth ? '100%' : undefined }, animatedStyle, style]}
      >
        <LinearGradient
          colors={
            isDisabled
              ? [COLORS.textMuted, COLORS.textMuted]
              : [...GRADIENTS.primary]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height,
            borderRadius: RADIUS.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 24,
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {IconLeft && (
                <IconLeft size={iconSize} color="#fff" />
              )}
              <Text
                style={{
                  fontSize,
                  fontWeight: '600',
                  color: '#fff',
                  fontFamily: TYPOGRAPHY['body-sm'].fontFamily,
                }}
              >
                {title}
              </Text>
              {IconRight && (
                <IconRight size={iconSize} color="#fff" />
              )}
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // ── Secondary / Ghost / Danger: non-gradient ──────────────────────────
  const bgMap: Record<string, string | undefined> = {
    secondary: COLORS.card,
    ghost: 'transparent',
    danger: 'transparent',
  };

  const textMap: Record<string, string> = {
    secondary: COLORS.textPrimary,
    ghost: COLORS.textSecondary,
    danger: COLORS.red,
  };

  const borderMap: Record<string, string | undefined> = {
    secondary: COLORS.borderSubtle,
    ghost: undefined,
    danger: undefined,
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[{ width: fullWidth ? '100%' : undefined }, animatedStyle, style]}
    >
      <View
        style={{
          height,
          borderRadius: RADIUS.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 24,
          backgroundColor: bgMap[variant],
          borderWidth: borderMap[variant] ? 1 : 0,
          borderColor: borderMap[variant],
          opacity: isDisabled ? 0.5 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={textMap[variant]} size="small" />
        ) : (
          <>
            {IconLeft && (
              <IconLeft size={iconSize} color={textMap[variant]} />
            )}
            <Text
              style={{
                fontSize,
                fontWeight: '600',
                color: textMap[variant],
                fontFamily: TYPOGRAPHY['body-sm'].fontFamily,
              }}
            >
              {title}
            </Text>
            {IconRight && (
              <IconRight size={iconSize} color={textMap[variant]} />
            )}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}
