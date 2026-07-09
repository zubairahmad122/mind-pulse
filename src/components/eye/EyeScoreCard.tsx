import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { Flame } from 'lucide-react-native';
import { ScoreResult } from '@/utils/scoring';
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

interface Props {
  result: ScoreResult;
  loading: boolean;
  hasAnySessions?: boolean;
  streak?: number;
}

const SEGMENT_MARKS = [25, 50, 75];

export function EyeScoreCard({ result, loading, hasAnySessions = true, streak = 0 }: Props) {
  const { score, theme } = result;

  const scoreScale   = useSharedValue(0.6);
  const scoreOpacity = useSharedValue(0);
  const glowOpacity  = useSharedValue(0);
  const pulseScale   = useSharedValue(1);

  useEffect(() => {
    if (loading) return;
    scoreScale.value   = withDelay(100, withSpring(1, { damping: 12, stiffness: 120 }));
    scoreOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    glowOpacity.value  = withDelay(300, withTiming(score >= 75 ? 0.5 : 0.35, { duration: 700 }));

    if (score >= 75) {
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
    <GlassCard style={{ marginBottom: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.cardLabel}>EYE SCORE</Text>
        {!loading && hasAnySessions && (
          <View style={[styles.statusPill, { backgroundColor: theme.color + '22', borderColor: theme.color + '55' }]}>
            <Text style={[styles.statusPillText, { color: theme.color }]}>
              {theme.emoji ? `${theme.emoji}  ` : ''}{theme.label}
            </Text>
          </View>
        )}
        {!loading && !hasAnySessions && (
          <View style={[styles.statusPill, { backgroundColor: '#06B6D4' + '22', borderColor: '#06B6D4' + '55' }]}>
            <Text style={[styles.statusPillText, { color: '#06B6D4' }]}>Start your eye care journey</Text>
          </View>
        )}
      </View>

      {/* Score circle */}
      <View style={styles.scoreRow}>
        <Animated.View style={pulseAnim}>
          <Animated.View style={[styles.scoreGlow, { backgroundColor: theme.color }, glowAnim]} />
          <Animated.View style={[styles.scoreCircle, { borderColor: theme.color, backgroundColor: colors.background.secondary + 'cc' }, scoreAnim]}>
            <Text style={[styles.scoreNumber, { color: hasAnySessions ? theme.color : colors.text.tertiary }]}>
              {loading ? '–' : hasAnySessions ? score : '—'}
            </Text>
            {hasAnySessions && <Text style={styles.scoreMax}>/100</Text>}
          </Animated.View>
        </Animated.View>

        <View style={styles.scoreInfo}>
          <Text style={styles.messageSub}>
            {loading
              ? 'Loading today’s score…'
              : score >= 75
                ? 'Keep up the breaks and recovery sessions.'
                : 'Complete a session to raise your score.'}
          </Text>
          {!loading && hasAnySessions && streak >= 2 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.streakText}>{streak}-day streak</Text>
            </View>
          )}
        </View>
      </View>

      {/* Score bar with segment markers — hidden for first-time users */}
      {hasAnySessions && (
        <View style={styles.barSection}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: theme.color }]}
            />
            {SEGMENT_MARKS.map(mark => (
              <View key={mark} style={[styles.segmentMark, { left: `${mark}%` as any }]} />
            ))}
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabelText}>Building habits</Text>
            <Text style={styles.barLabelText}>Balanced</Text>
            <Text style={styles.barLabelText}>Feeling Fresh</Text>
          </View>
        </View>
      )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
    shadowRadius: 24,
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
  messageSub: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B33',
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },

  /* Bar */
  barSection: {
    gap: 6,
    marginTop: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.09)',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
