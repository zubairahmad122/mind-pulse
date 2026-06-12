import { Activity, BarChart3, Eye, Flame, Moon, Share2, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScoreTrendChart } from '@/components/report/ScoreTrendChart';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { COLORS } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { ScoreBreakdownCard } from '@/components/ui/ScoreBreakdownCard';
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
    <ScreenShell>
      <Text style={styles.header}>Today's Reality Report</Text>
      <Text style={styles.date}>{today}</Text>

      {/* Stats list */}
      <View style={styles.statsList}>
        <StatRow icon={Moon} label="Sleep sessions logged" value={String(sessions.length)} />
        <StatRow icon={Eye} label="Eye score" value={`${eyes}/100`} />
        <StatRow icon={Flame} label="Day streak" value={`${streak} days`} />
        <StatRow icon={BarChart3} label="Sleep score" value={`${sleepScore}/100`} />
      </View>

      {/* 7-day trend */}
      {weekData.length > 0 && <ScoreTrendChart days={weekData} />}

      {/* Big score display */}
      <View style={styles.bigScore}>
        <Text style={styles.bigScoreLabel}>YOUR MINDPULSE SCORE</Text>
        <Text style={[styles.bigScoreNum, { color: anyLoading ? colors.text.tertiary : theme.color }]}>
          {anyLoading ? '–' : mindPulseScore}
        </Text>
        <Text style={[styles.bigScoreStatus, { color: anyLoading ? colors.text.tertiary : theme.color }]}>
          {anyLoading ? 'Calculating…' : `${theme.emoji}  ${theme.label}`}
        </Text>
      </View>

      {/* Screenshot-ready share card */}
      <View style={styles.shareCard}>
        <View style={styles.shareCardHeader}>
          <View style={styles.shareCardBrand}>
            <Activity size={16} color={COLORS.purpleLight} />
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
        <>
          <ScoreBreakdownCard title="WHY THIS EYE SCORE?" score={eyeResult.score} theme={eyeResult.theme} breakdown={eyeResult.breakdown} />
          <ScoreBreakdownCard title="WHY THIS SLEEP SCORE?" score={sleepResult.score} theme={sleepResult.theme} breakdown={sleepResult.breakdown} />
          <ScoreBreakdownCard title="WHY THIS MIND SCORE?" score={mindResult.score} theme={mindResult.theme} breakdown={mindResult.breakdown} />
        </>
      )}

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Share2 size={18} color={COLORS.bg} />
        <Text style={styles.shareBtnText}>Share My Score</Text>
      </TouchableOpacity>
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
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.purpleLight,
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
    backgroundColor: COLORS.border,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.purpleLight,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bg,
  },
});
