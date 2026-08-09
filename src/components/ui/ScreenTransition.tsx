import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

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
 *
 * Uses the classic React Native `Animated` API rather than Reanimated —
 * on at least one real device seen in the field, Reanimated's worklet/
 * UI-thread updates for this component silently never reached the screen
 * (confirmed by directly setting a shared value's `.value` from plain JS and
 * seeing no visual change after 10+ seconds), while `AnimatedLaunchScreen`'s
 * classic-`Animated`-driven fade on the same device completed normally. This
 * component only needs a one-shot fade + slide, so it doesn't need
 * Reanimated's UI-thread guarantees — using the API that's proven to work
 * here removes the failure mode entirely rather than papering over it.
 */
export function ScreenTransition({ children, delay = 0, duration = 500 }: Props) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(24));

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    // Safety net: force full visibility once the animation should long be
    // done regardless of whether it actually completed — a no-op in the
    // normal case since both values are already at rest.
    const fallback = setTimeout(() => {
      opacity.setValue(1);
      translateY.setValue(0);
    }, delay + duration + 400);

    return () => {
      clearTimeout(fallback);
      animation.stop();
    };
    // Animated.Value refs are ref-stable; delay/duration only matter on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
