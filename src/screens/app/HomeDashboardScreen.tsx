import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AIRecommendation } from '@/components/home/AIRecommendation';
import { DailyChallenge } from '@/components/home/DailyChallenge';
import { DailyTip } from '@/components/home/DailyTip';
import { QuickActions } from '@/components/home/QuickActions';
import { SleepGoalCard } from '@/components/home/SleepGoalCard';
import { TodaysPlan } from '@/components/home/TodaysPlan';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { COLORS, ROUTES } from '@/constants';
import type { IoniconName } from '@/constants';
import { DAILY_TIP } from '@/constants/homeDashboard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useEyeStressScore } from '@/hooks/useEyeStressScore';
import { useGreeting } from '@/hooks/useGreeting';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import {
  getDailyScoreStreak,
  getYesterdayScore,
  saveDailyScore,
} from '@/services/dailyScorePersistence';
import { calculateMindPulseScore, getInsightMessage, getScoreStatus, getWorstArea } from '@/utils/scoreCalculator';
import { calculateSleepScore } from '@/utils/sleepUtils';

function formatBedtime(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
}

function ScoreGauge({ score, statusColor, isLoading }: { score: number; statusColor: string; isLoading?: boolean }) {
  return (
    <View style={[styles.gaugeRing, { borderColor: isLoading ? 'rgba(255,255,255,0.06)' : statusColor + '33' }]}>
      <View style={[styles.gaugeInner, { borderColor: isLoading ? 'rgba(255,255,255,0.1)' : statusColor }]}>
        <Text style={[styles.gaugeScore, { color: isLoading ? colors.text.tertiary : statusColor }]}>
          {isLoading ? '–' : score}
        </Text>
        <Text style={styles.gaugeMax}>/ 100</Text>
      </View>
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: IoniconName; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={COLORS.purpleLight} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FooterStat({ icon, value, label }: { icon: IoniconName; value: string; label: string }) {
  return (
    <View style={styles.footerItem}>
      <Ionicons name={icon} size={18} color={COLORS.purpleLight} />
      <Text style={styles.footerValue}>{value}</Text>
      <Text style={styles.footerLabel}>{label}</Text>
    </View>
  );
}

function TrendArrow({ today, yesterday }: { today: number; yesterday: number | null }) {
  if (yesterday === null) return null;
  const diff = today - yesterday;
  if (diff > 3) {
    return <Ionicons name="arrow-up" size={14} color="#e24b4a" />;
  }
  if (diff < -3) {
    return <Ionicons name="arrow-down" size={14} color="#6ee7b7" />;
  }
  return <Ionicons name="remove" size={14} color={colors.text.tertiary} />;
}

export default function HomeDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions } = useSleep();
  const { score: eyesScore, loading: eyesLoading } = useEyeStressScore(user?.uid ?? undefined);
  const { score: mindScoreNum, theme: mindTheme, loading: mindLoading, reasons: mindReasons } = useMindScore(user?.uid ?? undefined);
  const mindScore = mindScoreNum;

  const { schedule } = useSleepSchedule(user?.uid ?? undefined, user?.isAnonymous ?? true);

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';
  const greeting = useGreeting(displayName);
  const sleepScore = calculateSleepScore(sessions);
  const anyLoading = eyesLoading || mindLoading;
  const eyes = eyesLoading ? 0 : eyesScore;
  const mind = mindLoading ? 0 : mindScore;

  const mindPulseScore = anyLoading ? 0 : calculateMindPulseScore({ eyesScore: eyes, sleepScore, mindScore: mind });
  const status = getScoreStatus(mindPulseScore);
  const worstArea = getWorstArea(eyes, sleepScore, mind);

  const [yesterdayScore, setYesterdayScore] = useState<number | null>(null);
  const [scoreStreak, setScoreStreak] = useState(0);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (eyesLoading || mindLoading || !user?.uid) return;

    const uid = user.uid;

    void saveDailyScore(uid, {
      mindPulseScore,
      eyesScore: eyes,
      sleepScore,
      mindScore: mind,
      savedAt: Date.now(),
    });
  }, [eyesLoading, mindLoading, user?.uid, mindPulseScore, eyes, sleepScore, mind]);

  useEffect(() => {
    if (!user?.uid || fetchedRef.current === user.uid) return;
    fetchedRef.current = user.uid;

    const uid = user.uid;
    void getYesterdayScore(uid).then(data => {
      if (data) setYesterdayScore(data.mindPulseScore);
    });
    void getDailyScoreStreak(uid).then(setScoreStreak);
  }, [user?.uid]);

  return (
    <ScreenShell>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.appName}>MindPulse</Text>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push(ROUTES.appProfile as never)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.tagline}>Your screen is shaping your mind</Text>

      {/* MindPulse Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreLabelRow}>
          <Text style={styles.sectionLabel}>MINDPULSE SCORE</Text>
          <TrendArrow today={mindPulseScore} yesterday={yesterdayScore} />
        </View>
        <View style={styles.scoreCardBody}>
          <ScoreGauge score={mindPulseScore} statusColor={status.color} isLoading={anyLoading} />
          <View style={styles.scoreCardRight}>
            <Text style={[styles.statusLabel, { color: anyLoading ? colors.text.tertiary : status.color }]}>
              {anyLoading ? 'Calculating…' : `${status.emoji}  ${status.label}`}
            </Text>
            {!anyLoading && (
              <View style={styles.worstBadge}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.text.secondary} />
                <Text style={styles.worstBadgeText}>Main issue: {worstArea}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Flex-based progress bar */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: mindPulseScore, backgroundColor: status.color }]} />
          <View style={{ flex: 100 - mindPulseScore }} />
        </View>
        <View style={styles.barLabelsRow}>
          <Text style={styles.barLabelText}>Recovering</Text>
          <Text style={styles.barLabelText}>Critical</Text>
        </View>
      </View>

      {/* Three stat cards */}
      <View style={styles.statRow}>
        <StatCard icon="eye-outline" value={eyesLoading ? '–' : String(eyesScore)} label="Eyes" />
        <StatCard icon="moon-outline" value={String(sleepScore)} label="Sleep" />
        <StatCard icon="pulse-outline" value={mindLoading ? '–' : String(mindScore)} label="Mind" />
      </View>

      {/* AI Insight */}
      <AIRecommendation message={getInsightMessage(worstArea, mindPulseScore, new Date().getHours())} />

      {/* Daily Challenge */}
      <DailyChallenge worstArea={worstArea} />

      {/* Today's Plan */}
      <TodaysPlan worstArea={worstArea} />

      {/* Daily Tip */}
      <DailyTip tip={DAILY_TIP} />

      {/* Tonight's sleep goal */}
      <SleepGoalCard
        bedtime={formatBedtime(schedule?.bedtime ?? '23:00')}
        sleepScore={sleepScore}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => router.push(ROUTES.appRecovery as never)}
        activeOpacity={0.85}
      >
        <Ionicons name="flash" size={18} color={COLORS.bg} />
        <Text style={styles.ctaText}>Start Recovery Mode</Text>
      </TouchableOpacity>

      {/* Footer: score streak + sessions */}
      <View style={styles.footerRow}>
        <FooterStat icon="flame-outline" value={String(scoreStreak)} label="score streak" />
        <View style={styles.footerDivider} />
        <FooterStat
          icon="phone-portrait-outline"
          value={String(sessions.length)}
          label="sessions logged"
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.purpleLight,
    letterSpacing: 0.5,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    ...typography.headingLarge,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: spacing.sm,
  },
  scoreLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text.tertiary,
  },
  scoreCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gaugeRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  gaugeScore: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
  },
  gaugeMax: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  scoreCardRight: {
    flex: 1,
    gap: spacing.sm,
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  worstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  worstBadgeText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  barTrack: {
    flexDirection: 'row',
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  barLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  barLabelText: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  insightText: {
    flex: 1,
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.purpleLight,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerItem: {
    alignItems: 'center',
    gap: 3,
  },
  footerValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  footerDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
});
