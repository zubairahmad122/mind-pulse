import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { FONTS } from '@/constants/theme';

type Props = {
  label: string;
  /** Optional smaller line beneath the label (e.g. "Wake at 6:30 AM"). */
  sublabel?: string;
  /** Optional leading icon node. */
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Gradient colours (2 or more stops). Defaults to the app's blue→violet→pink sweep. */
  colors?: readonly [string, string, ...string[]];
  /** Glow/shadow colour. Defaults to a soft blue. */
  glowColor?: string;
  /** Text colour. Defaults to white. */
  textColor?: string;
  /** Letter spacing on the main label. Defaults to 1. */
  letterSpacing?: number;
  style?: ViewStyle;
};

const DEFAULT_COLORS = ['#3b82f6', '#7c3aed', '#c026d3'] as const;
const DEFAULT_GLOW = 'rgba(124,58,237,0.45)';

/**
 * Premium gradient call-to-action button — the same look as the onboarding
 * screen's primary button (gradient fill, soft outer glow, press-scale spring,
 * optional leading icon and a small sublabel). Reusable across every module so
 * primary CTAs feel identical everywhere.
 */
export function GradientCTA({
  label,
  sublabel,
  icon,
  onPress,
  disabled = false,
  loading = false,
  colors = DEFAULT_COLORS,
  glowColor = DEFAULT_GLOW,
  textColor = '#FFFFFF',
  letterSpacing = 1,
  style,
}: Props) {
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
          {
            shadowColor: glowColor,
            shadowOpacity: isDisabled ? 0 : 0.55,
            opacity: isDisabled && !loading ? 0.55 : 1,
          },
        ]}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
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
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 10,
  },
  fill: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
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
    fontSize: 15,
    fontWeight: '800',
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
