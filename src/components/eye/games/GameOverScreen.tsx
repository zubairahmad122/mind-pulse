import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export interface GameEndStats {
  headline: string;
  subline: string;
  rating: 1 | 2 | 3;
  stats: { label: string; value: string }[];
  survived: boolean;
  disclaimer?: string;
}

interface Props {
  stats: GameEndStats;
  onReplay: () => void;
  onDismiss?: () => void;
}

const RATING_LABEL = ['😐 Keep going', '🔥 Well played!', '🏆 Outstanding!'];
const RATING_COLOR = ['#FFB300', '#4CAF50', '#FFD700'];

function StatRow({ label, value, delay }: { label: string; value: string; delay: number }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 280 }));
    tx.value = withDelay(delay, withSpring(0, { damping: 18 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[styles.statRow, style]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Animated.View>
  );
}

export function GameOverScreen({ stats, onReplay, onDismiss }: Props) {
  const scale   = useSharedValue(0.88);
  const opacity = useSharedValue(0);
  const btnScale = useSharedValue(0);

  useEffect(() => {
    void Haptics.notificationAsync(
      stats.survived
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    // Gentle fade + scale — no bounce
    opacity.value = withTiming(1, { duration: 220 });
    scale.value   = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    btnScale.value = withDelay(450, withSpring(1, { damping: 14, stiffness: 160 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle    = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const btnStyle     = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const ratingColor = RATING_COLOR[stats.rating - 1];

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>

        {/* X dismiss button */}
        {onDismiss && (
          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={13} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.resultBadge, { color: ratingColor }]}>
            {stats.survived ? '⏱ TIME UP' : '💀 GAME OVER'}
          </Text>
          <Text style={styles.headline}>{stats.headline}</Text>
          <Text style={[styles.rating, { color: ratingColor }]}>
            {RATING_LABEL[stats.rating - 1]}
          </Text>
          {stats.subline ? (
            <Text style={styles.subline}>{stats.subline}</Text>
          ) : null}
        </View>

        {/* Stats list */}
        <View style={styles.statsList}>
          {stats.stats.map((s, i) => (
            <StatRow key={s.label} label={s.label} value={s.value} delay={160 + i * 100} />
          ))}
        </View>

        {/* Optional honest disclaimer */}
        {stats.disclaimer ? (
          <Text style={styles.disclaimer}>{stats.disclaimer}</Text>
        ) : null}

        {/* Replay button */}
        <Animated.View style={btnStyle}>
          <TouchableOpacity style={styles.replayBtn} onPress={onReplay} activeOpacity={0.85}>
            <View style={styles.replayInner}>
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.replayText}>Play Again</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 7, 20, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  card: {
    width: '88%',
    backgroundColor: '#0F1228',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(123,97,255,0.35)',
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.4,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeIcon: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    lineHeight: 14,
  },
  header: { alignItems: 'center', gap: spacing.xs },
  resultBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
  },
  headline: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  rating: {
    fontSize: 18,
    fontWeight: '700',
  },
  subline: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statsList: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  statLabel: { ...typography.body, color: colors.text.secondary },
  statValue: { ...typography.body, color: colors.text.primary, fontWeight: '700' },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.sm,
  },
  replayBtn: {
    backgroundColor: colors.accent.purple,
    paddingVertical: spacing.md,
    borderRadius: 100,
    alignItems: 'center',
  },
  replayInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replayText: { ...typography.bodyLarge, color: '#FFF', fontWeight: '800' },
});
