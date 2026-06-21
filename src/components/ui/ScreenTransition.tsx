import { useEffect, type ReactNode } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  /** Delay in ms before the animation starts. Default 0. */
  delay?: number;
  /** Duration in ms. Default 500. */
  duration?: number;
};

/**
 * Wraps screen content with a subtle fade + slide-up entrance animation.
 * Use on push/stack screens for a polished, modern feel.
 */
export function ScreenTransition({ children, delay = 0, duration = 500 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    }));
    translateY.value = withDelay(delay, withTiming(0, {
      duration,
      easing: Easing.out(Easing.cubic),
    }));
    // Shared values are ref-stable; delay/duration only matter on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
