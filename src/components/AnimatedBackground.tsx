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
  const scale = useSharedValue(1);

  useEffect(() => {
    // 🎨 Continuous smooth gradient motion (no harsh jump)
    progress.value = withRepeat(
      withTiming(1, {
        duration: 20000, // slow = relaxing
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // 🫁 Very subtle breathing
    scale.value = withRepeat(
      withTiming(1.015, {
        duration: 8000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [progress, scale]);


  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.2, 0.8]),
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
      
      {/* 🌌 Base Gradient (deep night) */}
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e293b']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ✨ Moving Soft Overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <LinearGradient
          colors={['#1e1b4b', '#312e81', '#1e293b']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 🌙 Very soft top light */}
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: 260,
        }}
      />

    </Animated.View>
  );
}