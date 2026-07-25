import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { GradientCTA } from '@/components/ui/GradientCTA';

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
  /** Real, verified callout — e.g. "🏆 New Personal Best!" — only ever set
   * from an actual record check, never a guessed/invented achievement. */
  celebration?: string;
}

const RATING_LABEL = ['😐 Keep going', '🔥 Well played!', '🏆 Outstanding!'];
const RATING_COLOR = ['#FFB300', '#4CAF50', '#FFD700'];

function StatRow({ label, value, delay }: { label: string; value: string; delay: number }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
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

export function GameOverScreen({ stats, onReplay, onDismiss, celebration }: Props) {
  const scale   = useSharedValue(0.95);
  const opacity = useSharedValue(0);
  const btnScale = useSharedValue(0);

  useEffect(() => {
    void Haptics.notificationAsync(
      stats.survived
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    // Quicker settle than before — this is a result screen shown after every
    // round, so a snappy entrance matters more than a showy one.
    opacity.value = withTiming(1, { duration: 200 });
    scale.value   = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    btnScale.value = withDelay(250, withSpring(1, { damping: 16, stiffness: 200 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle    = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const btnStyle     = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const ratingColor = RATING_COLOR[stats.rating - 1];

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Animated.View style={[styles.card, cardStyle]}>

          {/* X dismiss button */}
          {onDismiss && (
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close" size={13} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}

          {/* Header — motivational read comes before the raw number, per the
              latest design pass, so the encouragement lands first. */}
          <View style={styles.header}>
            <Text style={[styles.resultBadge, { color: ratingColor }]}>
              {stats.survived ? "⏱ TIME'S UP" : '💀 GAME OVER'}
            </Text>
            <Text style={[styles.rating, { color: ratingColor }]}>
              {RATING_LABEL[stats.rating - 1]}
            </Text>
            <Text style={styles.headline}>{stats.headline}</Text>
            {celebration ? (
              <View style={styles.celebrationChip}>
                <Text style={styles.celebrationText}>{celebration}</Text>
              </View>
            ) : null}
            {stats.subline ? (
              <Text style={styles.subline}>{stats.subline}</Text>
            ) : null}
          </View>

          {/* Stats list */}
          <View style={styles.statsList}>
            {stats.stats.map((s, i) => (
              <StatRow key={s.label} label={s.label} value={s.value} delay={100 + i * 60} />
            ))}
          </View>

          {/* Optional honest disclaimer */}
          {stats.disclaimer ? (
            <Text style={styles.disclaimer}>{stats.disclaimer}</Text>
          ) : null}

          {/* Replay + secondary action */}
          <Animated.View style={[styles.actions, btnStyle]}>
            <GradientCTA
              label="Beat Your Best"
              icon={<Ionicons name="play" size={16} color="#03212C" />}
              onPress={onReplay}
              textColor="#03212C"
            />
            {onDismiss && (
              <TouchableOpacity onPress={onDismiss} style={styles.secondaryBtn} activeOpacity={0.7}>
                <Text style={styles.secondaryText}>Continue →</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 8, 11, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  card: {
    width: '88%',
    backgroundColor: '#081720',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,224,255,0.35)',
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: PILLAR_COLORS.eye,
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
  header: { alignItems: 'center', gap: 4 },
  resultBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
  },
  rating: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  headline: {
    fontFamily: FONTS.heading,
    fontSize: 46,
    fontWeight: '900',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  celebrationChip: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 4,
    marginTop: 4,
  },
  celebrationText: { fontSize: 12, fontWeight: '800', color: '#FFD700' },
  subline: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  statsList: {
    gap: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: { fontSize: 14, color: colors.text.secondary },
  statValue: { fontSize: 18, color: colors.text.primary, fontWeight: '700' },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.sm,
  },
  actions: { gap: spacing.sm },
  secondaryBtn: { alignItems: 'center', paddingVertical: 6 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
});
