import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getScoreMessage } from '@/constants/eyeRoast';
import { scoreTheme } from '@/utils/eyeStressScore';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props {
  score: number;
  primaryReason: string;
  loading: boolean;
}

const SCORE_SEGMENTS = [
  { label: 'Healthy', color: '#6ee7b7', threshold: 0 },
  { label: 'Moderate', color: '#f59e0b', threshold: 33 },
  { label: 'High', color: '#f97316', threshold: 66 },
  { label: 'Critical', color: '#e24b4a', threshold: 85 },
];

function getSegmentColor(score: number) {
  for (let i = SCORE_SEGMENTS.length - 1; i >= 0; i--) {
    if (score >= SCORE_SEGMENTS[i].threshold) return SCORE_SEGMENTS[i].color;
  }
  return SCORE_SEGMENTS[0].color;
}

export function EyeScoreCard({ score, primaryReason, loading }: Props) {
  const theme = scoreTheme(score);
  const message = getScoreMessage(score, 'gentle');

  const scoreScale   = useSharedValue(0.6);
  const scoreOpacity = useSharedValue(0);
  const glowOpacity  = useSharedValue(0);
  const pulseScale   = useSharedValue(1);

  useEffect(() => {
    if (loading) return;
    scoreScale.value   = withDelay(100, withSpring(1, { damping: 12, stiffness: 120 }));
    scoreOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    glowOpacity.value  = withDelay(300, withTiming(score >= 76 ? 0.5 : 0.35, { duration: 700 }));

    if (score >= 76) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true,
      );
    }
  }, [loading, score]);

  const scoreAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
    opacity: scoreOpacity.value,
  }));

  const glowAnim = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const pulseAnim = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  const barWidth = loading ? 0 : Math.min(score, 100);

  return (
    <View style={styles.card}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.cardLabel}>EYE STRESS SCORE</Text>
        {!loading && (
          <View style={[styles.statusPill, { backgroundColor: theme.color + '22', borderColor: theme.color + '55' }]}>
            <Text style={[styles.statusPillText, { color: theme.color }]}>
              {theme.emoji}  {theme.label}
            </Text>
          </View>
        )}
      </View>

      {/* Score + info row */}
      <View style={styles.scoreRow}>
        <Animated.View style={pulseAnim}>
          <Animated.View style={[styles.scoreGlow, { backgroundColor: theme.color }, glowAnim]} />
          <Animated.View style={[styles.scoreCircle, { borderColor: theme.color, backgroundColor: theme.bg + 'cc' }, scoreAnim]}>
            <Text style={[styles.scoreNumber, { color: theme.color }]}>
              {loading ? '–' : score}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.scoreInfo}>
          <Text style={styles.messageTitle}>{loading ? '…' : message.title}</Text>
          <Text style={styles.messageSub} numberOfLines={3}>
            {loading ? '' : message.sub}
          </Text>
        </View>
      </View>

      {/* Reason chip */}
      {!loading && primaryReason ? (
        <View style={[styles.reasonRow, { borderLeftColor: theme.color }]}>
          <View style={[styles.reasonDot, { backgroundColor: theme.color }]} />
          <Text style={styles.reasonText} numberOfLines={2}>{primaryReason}</Text>
        </View>
      ) : null}

      {/* Score bar with segment markers */}
      <View style={styles.barSection}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: theme.color }]}
          />
          {/* Segment dividers */}
          {SCORE_SEGMENTS.slice(1).map(seg => (
            <View
              key={seg.threshold}
              style={[styles.segmentMark, { left: `${seg.threshold}%` as any }]}
            />
          ))}
        </View>
        <View style={styles.barLabels}>
          <Text style={styles.barLabelText}>Healthy</Text>
          <Text style={styles.barLabelText}>Moderate</Text>
          <Text style={styles.barLabelText}>Critical</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text.tertiary,
  },
  statusPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Score circle */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: 4,
  },
  scoreGlow: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 76,
    height: 76,
    borderRadius: 38,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 1,
    elevation: 0,
  },
  scoreCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
  },
  scoreMax: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  scoreInfo: {
    flex: 1,
    gap: 6,
  },
  messageTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  messageSub: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 17,
  },

  /* Reason */
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  reasonText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 16,
  },

  /* Bar */
  barSection: {
    gap: 6,
    marginTop: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  segmentMark: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabelText: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
});
