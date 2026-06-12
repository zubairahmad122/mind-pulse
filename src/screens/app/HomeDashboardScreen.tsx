import { ArrowUp, ArrowDown, Minus, Check, UserCircle, Activity, Lightbulb, BarChart3, Zap, Flame, Smartphone, Eye, Book, Moon, RefreshCw, Target } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DailyChallenge } from '@/components/home/DailyChallenge';
import { QuickActions } from '@/components/home/QuickActions';
import { SleepGoalCard } from '@/components/home/SleepGoalCard';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { COLORS, ROUTES } from '@/constants';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useDailyEyeGoals } from '@/hooks/useDailyEyeGoals';
import { useEyeProgress } from '@/hooks/useEyeProgress';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useGreeting } from '@/hooks/useGreeting';
import { useJournal } from '@/hooks/useJournal';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { useSleepScore } from '@/hooks/useSleepScore';
import {
  getDailyScoreStreak,
  getYesterdayScore,
  saveDailyScore,
} from '@/services/dailyScorePersistence';
import {
  calculateMindPulseScore,
  getFocusArea,
  getHomeInsight,
  pulseScoreTheme,
} from '@/utils/scoring';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatBedtime(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Context-aware tagline that changes based on the user's real data. */
function getDynamicTagline(focusArea: string, score: number, hour: number): string {
  if (score >= 75) return 'Your numbers are looking great — keep up the momentum';
  if (score >= 50) {
    if (focusArea === 'Eyes') return 'A little eye care would go a long way today';
    if (focusArea === 'Sleep') return 'A bit more rest would help you feel sharper';
    return 'A moment of calm could help your mind today';
  }
  if (hour >= 22 || hour < 5) return 'Late night — your body is craving rest';
  if (hour < 12) return 'Fresh start — let\'s build healthy momentum today';
  if (hour < 17) return 'Midday check — small breaks keep your numbers stable';
  return 'Winding down — prepare for quality rest tonight';
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

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

function TrendArrow({ today, yesterday }: { today: number; yesterday: number | null }) {
  if (yesterday === null) return null;
  const diff = today - yesterday;
  if (diff > 3) {
    return (
      <View style={styles.trendBadge}>
        <ArrowUp size={12} color="#6ee7b7" />
        <Text style={[styles.trendText, { color: '#6ee7b7' }]}>+{diff}</Text>
      </View>
    );
  }
  if (diff < -3) {
    return (
      <View style={styles.trendBadge}>
        <ArrowDown size={12} color="#e24b4a" />
        <Text style={[styles.trendText, { color: '#e24b4a' }]}>{diff}</Text>
      </View>
    );
  }
  return (
    <View style={styles.trendBadge}>
      <Minus size={12} color={colors.text.tertiary} />
      <Text style={[styles.trendText, { color: colors.text.tertiary }]}>0</Text>
    </View>
  );
}

/** A compact horizontal bar showing one sub-score (Eyes / Sleep / Mind) with a mini progress fill. */
function SubScoreBar({
  icon: Icon,
  score,
  label,
  color,
  onPress,
  loading,
  isFocus,
}: {
  icon: LucideIcon;
  score: number;
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
  isFocus?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.subScoreItem, isFocus && styles.subScoreItemFocus]}>
      <View style={styles.subScoreHeader}>
        <Icon size={16} color={color} />
        <Text style={[styles.subScoreValue, { color }]}>{loading ? '–' : score}</Text>
      </View>
      <View style={[styles.subScoreTrack, { backgroundColor: color + '1a' }]}>
        <View style={[styles.subScoreFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.subScoreLabel}>{label}</Text>
    </Pressable>
  );
}

function TodayPulseItem({
  done,
  icon: IconComponent,
  label,
  detail,
}: {
  done: boolean;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <View style={styles.pulseItem}>
      <View style={[styles.pulseDot, done && styles.pulseDotDone]}>
        {done ? (
          <Check size={12} color="#0A0E1A" />
        ) : (
          <IconComponent size={12} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
        )}
      </View>
      <View style={styles.pulseInfo}>
        <Text style={[styles.pulseLabel, done && styles.pulseLabelDone]}>{label}</Text>
        <Text style={styles.pulseDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function FooterStat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <View style={styles.footerItem}>
      <Icon size={16} color={colors.accent.purple} />
      <Text style={styles.footerValue}>{value}</Text>
      <Text style={styles.footerLabel}>{label}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions } = useSleep();
  const eyeResult = useEyeScore(user?.uid ?? undefined);
  const mindResult = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(user?.uid ?? undefined, user?.isAnonymous ?? true);
  const { schedule } = useSleepSchedule(user?.uid ?? undefined, user?.isAnonymous ?? true);

  // ── Real data hooks for Today's Pulse ──
  const { breaksTaken, protocolDone, gamePlayed, completedCount, recoveryPct } =
    useDailyEyeGoals(user?.uid ?? undefined);
  const { entries } = useJournal(user?.uid ?? undefined, user?.isAnonymous ?? true);
  const { streak: eyeStreak } =
    useEyeProgress(user?.uid ?? undefined);

  // ── Derived values ──
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';
  const greeting = useGreeting(displayName);
  const anyLoading = eyeResult.loading || mindResult.loading || sleepResult.loading;
  const eyes = eyeResult.loading ? 0 : eyeResult.score;
  const sleepScore = sleepResult.loading ? 0 : sleepResult.score;
  const mind = mindResult.loading ? 0 : mindResult.score;
  const mindPulseScore = anyLoading ? 0 : calculateMindPulseScore({ eyeScore: eyes, sleepScore, mindScore: mind });
  const theme = pulseScoreTheme(mindPulseScore);
  const focusArea = getFocusArea(eyes, sleepScore, mind);
  const tagline = getDynamicTagline(focusArea, mindPulseScore, new Date().getHours());
  const homeInsight = getHomeInsight({ eye: eyeResult, sleep: sleepResult, mind: mindResult });

  // ── Today's journal entries count ──
  const journalToday = entries.filter(e => {
    const d = e.date instanceof Date ? e.date : new Date(e.date);
    return d.toISOString().slice(0, 10) === todayKey();
  }).length;

  // ── Yesterday's score for trend ──
  const [yesterdayScore, setYesterdayScore] = useState<number | null>(null);
  const [scoreStreak, setScoreStreak] = useState(0);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (anyLoading || !user?.uid) return;
    void saveDailyScore(user.uid, {
      mindPulseScore,
      eyesScore: eyes,
      sleepScore,
      mindScore: mind,
      savedAt: Date.now(),
    });
  }, [anyLoading, user?.uid, mindPulseScore, eyes, sleepScore, mind]);

  useEffect(() => {
    if (!user?.uid || fetchedRef.current === user.uid) return;
    fetchedRef.current = user.uid;
    void getYesterdayScore(user.uid).then(data => {
      if (data) setYesterdayScore(data.mindPulseScore);
    });
    void getDailyScoreStreak(user.uid).then(setScoreStreak);
  }, [user?.uid]);

  const isLoading = anyLoading;

  return (
    <ScreenShell>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>MindPulse</Text>
          <TrendArrow today={mindPulseScore} yesterday={yesterdayScore} />
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push(ROUTES.appProfile as never)}
          activeOpacity={0.8}
        >
          <UserCircle size={30} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Greeting + Dynamic Tagline ── */}
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={[styles.tagline, { color: isLoading ? colors.text.tertiary : theme.color + 'cc' }]}>
        {isLoading ? 'Crunching your numbers…' : tagline}
      </Text>

      {/* ── MindPulse Hero Score ── */}
      <GlassCard style={styles.scoreCard}>
        <View style={styles.scoreLabelRow}>
          <Activity size={14} color={colors.accent.purple} />
          <Text style={styles.sectionLabel}>MINDPULSE SCORE</Text>
        </View>

        <View style={styles.scoreCardBody}>
          <ScoreGauge score={mindPulseScore} statusColor={theme.color} isLoading={isLoading} />
          <View style={styles.scoreCardRight}>
            <Text style={[styles.statusLabel, { color: isLoading ? colors.text.tertiary : theme.color }]}>
              {isLoading ? 'Calculating…' : `${theme.emoji}  ${theme.label}`}
            </Text>
            {!isLoading && (
              <View style={styles.worstBadge}>
                <Lightbulb size={13} color={colors.text.secondary} />
                <Text style={styles.worstBadgeText}>Focus: {focusArea}</Text>
              </View>
            )}
            {/* Contextual insight from real data */}
            <Text style={styles.contextInsight} numberOfLines={2}>
              {homeInsight}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: mindPulseScore || 1, backgroundColor: theme.color }]} />
          <View style={{ flex: Math.max(100 - mindPulseScore, 1) || 1 }} />
        </View>
        <View style={styles.barLabelsRow}>
          <Text style={styles.barLabelText}>Needs Focus</Text>
          <Text style={styles.barLabelText}>Thriving</Text>
        </View>
      </GlassCard>

      {/* ── Three Sub-Scores (cohesive bar row) ── */}
      <GlassCard style={styles.subScoreCard}>
        <Text style={styles.sectionLabel}>BREAKDOWN</Text>
        <View style={styles.subScoreRow}>
          <SubScoreBar
            icon={Eye}
            score={eyes}
            label="Eyes"
            color="#6ee7b7"
            loading={eyeResult.loading}
            isFocus={focusArea === 'Eyes'}
            onPress={() => router.push(ROUTES.appEyeRelax as never)}
          />
          <View style={styles.subScoreDivider} />
          <SubScoreBar
            icon={Moon}
            score={sleepScore}
            label="Sleep"
            color="#a78bfa"
            loading={sleepResult.loading}
            isFocus={focusArea === 'Sleep'}
            onPress={() => router.push(`${ROUTES.appSleep}?tab=tonight` as never)}
          />
          <View style={styles.subScoreDivider} />
          <SubScoreBar
            icon={Activity}
            score={mind}
            label="Mind"
            color="#4FC3F7"
            loading={mindResult.loading}
            isFocus={focusArea === 'Mind'}
            onPress={() => router.push(ROUTES.appRelax as never)}
          />
        </View>
      </GlassCard>

      {/* ── Today's Pulse (real activity summary) ── */}
      <GlassCard style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <View style={styles.scoreLabelRow}>
            <BarChart3 size={14} color="#4FC3F7" />
            <Text style={styles.sectionLabel}>TODAY'S PULSE</Text>
          </View>
          <View style={styles.pulseRingSmall}>
            <Text style={styles.pulseRingPct}>{recoveryPct}%</Text>
          </View>
        </View>

        <View style={styles.pulseItems}>
          <TodayPulseItem
            done={breaksTaken >= 3}
            icon={Eye}
            label="Eye Breaks"
            detail={`${breaksTaken} / 3 taken`}
          />
          <TodayPulseItem
            done={protocolDone}
            icon={RefreshCw}
            label="Eye Reset Protocol"
            detail={protocolDone ? 'Completed' : 'Not yet'}
          />
          <TodayPulseItem
            done={journalToday > 0}
            icon={Book}
            label="Journal"
            detail={journalToday > 0 ? `${journalToday} entr${journalToday > 1 ? 'ies' : 'y'} today` : 'No entry yet'}
          />
          <TodayPulseItem
            done={gamePlayed}
            icon={Target}
            label="Eye Game"
            detail={gamePlayed ? 'Played today' : 'Not played'}
          />
        </View>

        {/* Overall today's progress bar */}
        <View style={styles.pulseProgressWrap}>
          <View style={styles.pulseProgressTrack}>
            <View
              style={[
                styles.pulseProgressFill,
                { width: `${recoveryPct}%`, backgroundColor: recoveryPct >= 100 ? '#6ee7b7' : '#4FC3F7' },
              ]}
            />
          </View>
          <Text style={styles.pulseProgressText}>
            {completedCount} / 3 goals met
          </Text>
        </View>
      </GlassCard>

      {/* ── Daily Challenge ── */}
      <DailyChallenge worstArea={focusArea} />

      {/* ── Tonight's sleep goal ── */}
      <SleepGoalCard
        bedtime={formatBedtime(schedule?.bedtime ?? '23:00')}
        sleepScore={sleepScore}
      />

      {/* ── Quick Actions ── */}
      <QuickActions />

      {/* ── CTA ── */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => router.push(ROUTES.appRecovery as never)}
        activeOpacity={0.85}
      >
        <Zap size={18} color={COLORS.bg} />
        <Text style={styles.ctaText}>Start Recovery Mode</Text>
      </TouchableOpacity>

      {/* ── Enhanced Footer — all real data ── */}
      <GlassCard style={styles.footerRow}>
        <FooterStat icon={Flame} value={String(scoreStreak)} label="score streak" />
        <View style={styles.footerDivider} />
        <FooterStat
          icon={Smartphone}
          value={String(sessions.length)}
          label="sessions logged"
        />
        <View style={styles.footerDivider} />
        <FooterStat
          icon={Eye}
          value={String(eyeStreak)}
          label="eye streak"
        />
        <View style={styles.footerDivider} />
        <FooterStat
          icon={Book}
          value={String(entries.length)}
          label="journal entries"
        />
      </GlassCard>
    </ScreenShell>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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

  // ── Greeting ──
  greeting: {
    ...typography.headingLarge,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  tagline: {
    ...typography.body,
    marginBottom: spacing.md,
    fontWeight: '500',
  },

  // ── Trend badge ──
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── MindPulse Hero Score ──
  scoreCard: {
    marginBottom: spacing.md,
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
    gap: spacing.xs,
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
  contextInsight: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
    marginTop: spacing.xs,
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

  // ── Sub-Score Breakdown ──
  subScoreCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  subScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  subScoreItem: {
    flex: 1,
    gap: spacing.xs,
    borderRadius: 10,
    padding: 6,
  },
  subScoreItemFocus: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  subScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subScoreValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  subScoreTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  subScoreFill: {
    height: 4,
    borderRadius: 2,
  },
  subScoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  subScoreDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.accent.purpleBorder,
    marginHorizontal: spacing.sm,
  },

  // ── Today's Pulse ──
  pulseCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseRingSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent.purple,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.purpleLight,
  },
  pulseRingPct: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent.purple,
  },
  pulseItems: {
    gap: spacing.sm,
  },
  pulseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  pulseDotDone: {
    backgroundColor: '#6ee7b7',
    borderColor: '#6ee7b7',
  },

  pulseInfo: {
    flex: 1,
  },
  pulseLabel: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '500',
  },
  pulseLabelDone: {
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  pulseDetail: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  pulseProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  pulseProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  pulseProgressText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
  },

  // ── CTA ──
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

  // ── Footer ──
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  footerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  footerLabel: {
    fontSize: 9,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.accent.purpleBorder,
  },
});
