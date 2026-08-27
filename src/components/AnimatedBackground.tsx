import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { BACKGROUND } from '@/constants/designSystem';

/**
 * Soft nebula glow rendered as an SVG radial gradient so it has NO hard edges
 * or seams — background is ~80% black, purple is a faint accent confined to
 * behind the header, not a wash across the whole screen.
 */
function Nebula() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="nebulaViolet" cx="24%" cy="0%" r="45%">
          <Stop offset="0%" stopColor="#6d28d9" stopOpacity={0.14} />
          <Stop offset="50%" stopColor="#4f46c8" stopOpacity={0.04} />
          <Stop offset="100%" stopColor="#4f46c8" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Full-bleed rect filled by the radial — the radial falloff is the only
          visible edge, so there is never a rectangular seam. */}
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#nebulaViolet)" />
    </Svg>
  );
}

export default function AnimatedBackground() {
  const progress = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    breathe.value = withRepeat(
      withTiming(1.015, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  // Gentle opacity breathing on the whole nebula layer — keeps it alive without
  // any visible banding.
  const nebulaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.7, 1]),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents="none">
      {/* Frozen global background (spec section 2) — identical on every screen. */}
      <LinearGradient
        colors={BACKGROUND.overlay}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Single smooth radial nebula glow (no hard edges, no stars). */}
      <Animated.View style={[StyleSheet.absoluteFill, nebulaStyle]}>
        <Nebula />
      </Animated.View>
    </Animated.View>
  );
}
