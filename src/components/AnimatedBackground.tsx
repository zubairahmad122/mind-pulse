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

export default function AnimatedBackground() {
  const progress = useSharedValue(0);
  const breathe  = useSharedValue(1);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    breathe.value = withRepeat(
      withTiming(1.012, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.08, 0.22]),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
      {/* True deep-space base */}
      <LinearGradient
        colors={['#030712', '#050B18', '#080F22']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle purple ambient glow — very restrained */}
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <LinearGradient
          colors={['#1a1040', '#0f0830', '#030712']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Feathered top light — depth cue */}
      <LinearGradient
        colors={['rgba(123,97,255,0.06)', 'transparent']}
        style={{ position: 'absolute', top: 0, width: '100%', height: 220 }}
      />
    </Animated.View>
  );
}
