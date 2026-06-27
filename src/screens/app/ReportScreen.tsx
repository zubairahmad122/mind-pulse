import { Activity, BarChart3, Eye, Flame, Moon, Share2, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ScoreTrendChart } from '@/components/report/ScoreTrendChart';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { useWeeklyReflection } from '@/hooks/useWeeklyReflection';
import { ScoreBreakdownCard } from '@/components/ui/ScoreBreakdownCard';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { PaywallGate } from '@/components/paywall/PaywallGate';
import { getLastNDayScores } from '@/services/dailyScorePersistence';
import { calculateStreak } from '@/utils/sleepUtils';
import {
  calculateMindPulseScore,
  getFocusArea,
  pulseScoreTheme,
} from '@/utils/scoring';

const FOCUS_AREA_ICON: Record<string, LucideIcon> = {
  Sleep: Moon,
  Eyes: Eye,
  Mind: Activity,
};

function StatRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Icon size={16} color={colors.text.secondary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function BreakdownItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.breakdownItem}>
      <Icon size={24} color={colors.text.secondary} />
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

/** Animated score display with pulsing glow + breathing scale, like the home page gauge. */
function AnimatedBigScore({ score, statusColor, label, status, isLoading }: {
  score: number;
  statusColor: string;
  label: string;
  status: string;
  isLoading: boolean;
}) {
  const glowPulse = useSharedValue(0.25);
  const scalePulse = useSharedValue(1);

  useEffect(() => {
    if (isLoading) return;
    glowPulse.value = withRepeat(
      withTiming(0.55, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    scalePulse.value = withRepeat(
      withTiming(1.02, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(glowPulse);
      cancelAnimation(scalePulse);
    };
  }, [isLoading]);

  const glowAnim = useAnimatedStyle(() => ({ opacity: glowPulse.value }));
  const scaleAnim = useAnimatedStyle(() => ({ transform: [{ scale: scalePulse.value }] }));

  return (
    <View style={styles.bigScore}>
      <Text style={styles.bigScoreLabel}>{label}</Text>
      {/* Relative container so the glow always centers on the score number */}
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulsing glow behind score */}
        {!isLoading && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bigScoreGlow,
              { backgroundColor: statusColor },
              glowAnim,
            ]}
          />
        )}
        <Animated.View style={!isLoading ? scaleAnim : undefined}>
          <Text style={[styles.bigScoreNum, { color: isLoading ? colors.text.tertiary : statusColor }]}>
            {isLoading ? '–' : score}
          </Text>
        </Animated.View>
      </View>
      <Text style={[styles.bigScoreStatus, { color: isLoading ? colors.text.tertiary : statusColor }]}>
        {isLoading ? 'Calculating…' : status}
      </Text>
    </View>
  );
}

export default function ReportScreen() {
  const { user } = useAuth();
  type DayEntry = { date: string; mindPulseScore: number } | null;
  const [weekData, setWeekData] = useState<DayEntry[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    void getLastNDayScores(user.uid, 7).then(setWeekData);
  }, [user?.uid]);
  const { sessions } = useSleep();
  const eyeResult = useEyeScore(user?.uid ?? undefined);
  const mindResult = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(user?.uid ?? undefined, user?.isAnonymous ?? true);

  const streak = calculateStreak(sessions);
  const anyLoading = eyeResult.loading || mindResult.loading || sleepResult.loading;
  const eyes = eyeResult.loading ? 0 : eyeResult.score;
  const sleepScore = sleepResult.loading ? 0 : sleepResult.score;
  const mind = mindResult.loading ? 0 : mindResult.score;

  const mindPulseScore = anyLoading ? 0 : calculateMindPulseScore({ eyeScore: eyes, sleepScore, mindScore: mind });
  const theme = pulseScoreTheme(mindPulseScore);
  const focusArea = getFocusArea(eyes, sleepScore, mind);
  const { reflection: weeklyReflection, loading: reflectionLoading } = useWeeklyReflection({
    eyeScore: eyes,
    sleepScore,
    mindScore: mind,
  });

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleShare = async () => {
    const caption =
      `My MindPulse Score today: ${mindPulseScore}/100 ${theme.emoji}. ` +
      `Focusing on ${focusArea} today. Track yours → mindpulse.app`;
    try {
      await Share.share({ message: caption });
    } catch {
      // ignore
    }
  };

  return (
    <ScreenShell ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
      <Text style={styles.header}>Today's Reality Report</Text>
      <Text style={styles.date}>{today}</Text>

      {/* Stats list */}
      <GlassCard style={{ marginBottom: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <StatRow icon={Moon} label="Sleep sessions logged" value={String(sessions.length)} />
          <StatRow icon={Eye} label="Eye score" value={`${eyes}/100`} />
          <StatRow icon={Flame} label="Day streak" value={`${streak} days`} />
          <StatRow icon={BarChart3} label="Sleep score" value={`${sleepScore}/100`} />
        </View>
      </GlassCard>

      {/* 7-day trend */}
      {weekData.length > 0 && (
        <PaywallGate featureId="report_extended_trends">
          <ScoreTrendChart days={weekData} />
        </PaywallGate>
      )}

      {/* Weekly Reflection — Gemini-powered narrative summary */}
      <PaywallGate featureId="report_weekly_summary">
        <GlassCard style={{ marginBottom: spacing.md }}>
          <View style={{ gap: spacing.sm }}>
            <View style={styles.reflectionHeader}>
              <Sparkles size={14} color={colors.accent.purple} />
              <Text style={styles.reflectionTitle}>Weekly Reflection</Text>
              {reflectionLoading && (
                <ActivityIndicator size={10} color={colors.accent.purple} style={{ marginLeft: 'auto' }} />
              )}
            </View>
            <Text style={styles.reflectionBody}>
              {reflectionLoading ? 'Reflecting on your week…' : weeklyReflection}
            </Text>
          </View>
        </GlassCard>
      </PaywallGate>

      {/* Big score display with animated glow */}
      <AnimatedBigScore
        score={mindPulseScore}
        statusColor={theme.color}
        label="YOUR MINDPULSE SCORE"
        status={`${theme.emoji}  ${theme.label}`}
        isLoading={anyLoading}
      />

      {/* Screenshot-ready share card */}
      <View style={styles.shareCard}>
        <View style={styles.shareCardHeader}>
          <View style={styles.shareCardBrand}>
            <Activity size={16} color={'#a78bfa'} />
            <Text style={styles.shareCardTitle}>MindPulse</Text>
          </View>
          <Text style={styles.shareCardDate}>{today}</Text>
        </View>

        <View style={styles.shareCardScore}>
          <Text style={[styles.shareCardScoreNum, { color: theme.color }]}>{mindPulseScore}</Text>
          <Text style={[styles.shareCardScoreStatus, { color: theme.color }]}>
            {theme.emoji}  {theme.label}
          </Text>
        </View>

        <View style={styles.shareCardDivider} />

        <View style={styles.shareCardBreakdown}>
          <BreakdownItem icon={Eye} label="Eyes" value={eyes} />
          <BreakdownItem icon={Moon} label="Sleep" value={sleepScore} />
          <BreakdownItem icon={Activity} label="Mind" value={mind} />
        </View>

        <Text style={styles.shareCardTagline}>Every small step counts toward a healthier you</Text>
      </View>

      {/* Focus area callout */}
      <View style={styles.worstCard}>
        <View style={styles.worstIconWrap}>
          {(() => {
            const FocusIcon = FOCUS_AREA_ICON[focusArea];
            return <FocusIcon size={28} color={theme.color} />;
          })()}
        </View>
        <View style={styles.worstInfo}>
          <Text style={styles.worstTitle}>{focusArea} could use some love today</Text>
          <Text style={styles.worstSub}>Focus your recovery on this for the biggest boost</Text>
        </View>
      </View>

      {/* Why this score? — full transparency breakdowns */}
      {!anyLoading && (
        <PaywallGate featureId="report_extended_trends">
          <ScoreBreakdownCard title="WHY THIS EYE SCORE?" score={eyeResult.score} theme={eyeResult.theme} breakdown={eyeResult.breakdown} />
          <ScoreBreakdownCard title="WHY THIS SLEEP SCORE?" score={sleepResult.score} theme={sleepResult.theme} breakdown={sleepResult.breakdown} />
          <ScoreBreakdownCard title="WHY THIS MIND SCORE?" score={mindResult.score} theme={mindResult.theme} breakdown={mindResult.breakdown} />
        </PaywallGate>
      )}

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Share2 size={18} color={colors.background.primary} />
        <Text style={styles.shareBtnText}>Share My Score</Text>
      </TouchableOpacity>
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  statsList: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text.secondary,
  },
  statValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  bigScore: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  bigScoreGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    left: '50%',
    marginLeft: -100,
    top: '50%',
    marginTop: -100,
    opacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 1,
    elevation: 0,
  },
  bigScoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  bigScoreNum: {
    fontSize: 80,
    fontWeight: '900',
    lineHeight: 84,
  },
  bigScoreStatus: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  shareCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    gap: spacing.md,
  },
  shareCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareCardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shareCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#a78bfa',
  },
  shareCardDate: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  shareCardScore: {
    alignItems: 'center',
    gap: 4,
  },
  shareCardScoreNum: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 58,
  },
  shareCardScoreStatus: {
    fontSize: 18,
    fontWeight: '700',
  },
  shareCardDivider: {
    height: 1,
    backgroundColor: colors.accent.purpleBorder,
  },
  shareCardBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareCardTagline: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  breakdownItem: {
    alignItems: 'center',
    gap: 4,
  },
  breakdownLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  worstCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    marginBottom: spacing.md,
  },
  worstIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worstInfo: { flex: 1, gap: 3 },
  worstTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '700',
  },
  worstSub: { ...typography.body, color: colors.text.secondary },
  reflectionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    gap: spacing.sm,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reflectionTitle: {
    ...typography.label,
    color: colors.accent.purple,
    fontWeight: '700',
  },
  reflectionBody: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#a78bfa',
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});
