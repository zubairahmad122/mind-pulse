import { RADIUS, SHADOWS, DURATION, FONTS } from '@/constants/designSystem';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

/**
 * Real streak-event celebration — reads the wellness store's own
 * `lastStreakEvent` (set whenever `checkAndUpdateStreak` credits or freezes a
 * day) rather than any invented currency. One shared component so every
 * screen that can trigger a completion (Challenges, Relax, ...) shows the
 * exact same banner instead of hand-rolled copies drifting apart.
 */
export function StreakCelebrationBanner() {
  const streak = useWellnessStore((s) => s.streak);
  const lastStreakEvent = useWellnessStore((s) => s.lastStreakEvent);
  const acknowledgeStreakEvent = useWellnessStore((s) => s.acknowledgeStreakEvent);

  const celebration =
    lastStreakEvent === 'incremented'
      ? { title: '🎉 Challenge Complete', message: `🔥 Day ${streak} — keep it going!` }
      : lastStreakEvent === 'frozen'
        ? { title: '🧊 Streak Saved', message: `Your weekly freeze protected day ${streak}.` }
        : lastStreakEvent === 'perfectDay'
          ? { title: '⭐ Perfect Day', message: 'All 4 pillars complete today — well done.' }
          : null;

  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!lastStreakEvent) return;
    Animated.spring(anim, { toValue: 1, tension: 200, friction: 16, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: DURATION.normal, useNativeDriver: true }).start(() => {
        acknowledgeStreakEvent();
      });
    }, 2800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastStreakEvent]);

  if (!celebration) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        },
      ]}
    >
      <Text style={styles.title}>{celebration.title}</Text>
      <Text style={styles.message}>{celebration.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 8,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    backgroundColor: 'rgba(16,24,39,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.card,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: colors.text.primary,
  },
  message: {
    fontSize: 12.5,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
