import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { BUTTON, FONTS, SHADOWS } from '@/constants/designSystem';

type Props = {
  label: string;
  /** Optional smaller line beneath the label (e.g. "Wake at 6:30 AM"). */
  sublabel?: string;
  /** Optional leading icon node. */
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /**
   * `primary` (default): the frozen spec gradient (#48D9FF → #54A8FF).
   * `secondary`: transparent fill with the spec outline border — use for
   * secondary actions instead of a second gradient CTA.
   */
  variant?: 'primary' | 'secondary';
  /** Gradient colours (2 or more stops). Overrides `variant="primary"`'s default gradient. */
  colors?: readonly [string, string, ...string[]];
  /** Glow/shadow colour. Defaults to the frozen button shadow. */
  glowColor?: string;
  /** Text colour. Defaults to white. */
  textColor?: string;
  /** Letter spacing on the main label. Defaults to 1. */
  letterSpacing?: number;
  /** ~20% shorter button — for dense layouts (e.g. exercise players). */
  compact?: boolean;
  /** Keep full opacity while disabled — for status-style CTAs ("Following…"). */
  keepBright?: boolean;
  /**
   * Override the button's min-height (default `BUTTON.height`, 56 — the same
   * value every other CTA in the app uses). Only pass this when a screen has
   * an explicit, repeated design need for a taller button; leaving it unset
   * keeps the app-wide default untouched.
   */
  height?: number;
  style?: ViewStyle;
};

const DEFAULT_GLOW = 'rgba(84,168,255,0.45)';

/**
 * The single canonical CTA button — frozen spec gradient, height 56, radius
 * 18, soft outer glow, press-scale spring, optional leading icon and a small
 * sublabel. Reusable across every module so primary CTAs feel identical
 * everywhere. Pass `variant="secondary"` for the outline secondary button.
 */
export function GradientCTA({
  label,
  sublabel,
  icon,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  colors,
  glowColor = DEFAULT_GLOW,
  textColor = '#FFFFFF',
  letterSpacing = 1,
  compact = false,
  keepBright = false,
  height,
  style,
}: Props) {
  const isSecondary = variant === 'secondary';
  const fillColors = colors ?? BUTTON.primaryGradient;
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

  const handlePress = () => {
    if (isDisabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={[
          styles.shell,
          isSecondary
            ? styles.shellSecondary
            : {
                shadowColor: glowColor,
                shadowOpacity: isDisabled ? 0 : 0.55,
                opacity: isDisabled && !loading && !keepBright ? 0.55 : 1,
              },
        ]}
      >
        {isSecondary ? (
          <View style={[styles.fill, compact && styles.fillCompact, height ? { minHeight: height } : null]}>
            {loading ? (
              <ActivityIndicator color={textColor} size="small" />
            ) : (
              <View style={styles.content}>
                {icon}
                <View style={styles.labels}>
                  <Text style={[styles.label, { color: textColor, letterSpacing }]}>{label}</Text>
                  {sublabel ? (
                    <Text style={[styles.sublabel, { color: textColor }]}>{sublabel}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        ) : (
          <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, compact && styles.fillCompact, height ? { minHeight: height } : null]}>
            {/* Glossy top highlight — gives the fill a shiny, glass-like sheen */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.sheen}
            />
            {loading ? (
              <ActivityIndicator color={textColor} size="small" />
            ) : (
              <View style={styles.content}>
                {icon}
                <View style={styles.labels}>
                  <Text style={[styles.label, { color: textColor, letterSpacing }]}>{label}</Text>
                  {sublabel ? (
                    <Text style={[styles.sublabel, { color: textColor }]}>{sublabel}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: BUTTON.radius,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 10,
  },
  shellSecondary: {
    borderWidth: 1,
    borderColor: BUTTON.secondaryBorder,
    ...SHADOWS.button,
  },
  fill: {
    minHeight: BUTTON.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  fillCompact: {
    minHeight: 44,
    paddingVertical: 8,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labels: {
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sublabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    opacity: 0.65,
    marginTop: 1,
  },
});
