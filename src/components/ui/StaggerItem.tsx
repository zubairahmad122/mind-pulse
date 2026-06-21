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
  /** Position in the stagger sequence (0-based). Each step adds `interval` ms. */
  index: number;
  /** Time between each stagger step in ms. Default 80. */
  interval?: number;
  /** Base delay before the first item starts in ms. Default 100. */
  baseDelay?: number;
  /** Individual animation duration in ms. Default 450. */
  duration?: number;
  /** Starting translateY offset in px. Default 16. */
  offset?: number;
};

/**
 * Wraps a section with a fade + slide-up entrance animation that
 * is delayed based on its `index` in the stagger sequence.
 *
 * Use multiple `<StaggerItem>` children inside a screen (inside a single
 * `<ScreenTransition>` or directly in `<ScreenShell>`) so each section
 * animates in one after another for a polished, sequenced feel.
 *
 * @example
 * ```tsx
 * <ScreenShell>
 *   <StaggerItem index={0}><Header /></StaggerItem>
 *   <StaggerItem index={1}><HeroCard /></StaggerItem>
 *   <StaggerItem index={2}><Footer /></StaggerItem>
 * </ScreenShell>
 * ```
 */
export function StaggerItem({
  children,
  index,
  interval = 80,
  baseDelay = 100,
  duration = 450,
  offset = 16,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offset);

  const delay = baseDelay + index * interval;

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    }));
    translateY.value = withDelay(delay, withTiming(0, {
      duration,
      easing: Easing.out(Easing.cubic),
    }));
    // Shared values are ref-stable; props only matter on mount
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
