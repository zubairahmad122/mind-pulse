import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

/**
 * Soft nebula glow rendered as an SVG radial gradient so it has NO hard edges
 * or seams — a smooth, premium "deep space" wash. A single restrained violet
 * haze drifting in from the upper-left, matching the clean reference look.
 */
function Nebula() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="nebulaViolet" cx="22%" cy="10%" r="85%">
          <Stop offset="0%" stopColor="#6d28d9" stopOpacity={0.22} />
          <Stop offset="45%" stopColor="#4f46c8" stopOpacity={0.07} />
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
      {/* Deep, clean near-black base with a faint purple tint up top that fades
          to black toward the bottom — soft and minimal, matching the reference. */}
      <LinearGradient
        colors={['#0B0918', '#07060F', '#040308']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Single smooth radial nebula glow (no hard edges, no stars). */}
      <Animated.View style={[StyleSheet.absoluteFill, nebulaStyle]}>
        <Nebula />
      </Animated.View>
    </Animated.View>
  );
}
