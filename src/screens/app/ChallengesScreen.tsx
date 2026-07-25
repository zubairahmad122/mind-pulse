import { DailyChallenge, useDailyChallengeStatus } from '@/components/home/DailyChallenge';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { HeroCard } from '@/components/ui/HeroCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StaggerItem } from '@/components/ui/StaggerItem';
import { StreakCelebrationBanner } from '@/components/ui/StreakCelebrationBanner';
import { WeeklyProgressRow } from '@/components/ui/WeeklyProgressRow';
import { ACHIEVEMENT_DEFINITIONS, ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS, SHADOWS, STATUS_COLORS, TYPOGRAPHY } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/context/AuthContext';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useMindScore } from '@/hooks/useMindScore';
import { useSleepScore } from '@/hooks/useSleepScore';
import { useUnlockedAchievements } from '@/hooks/useUnlockedAchievements';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { addDaysISO, getMondayISO, todayISO } from '@/utils/dateUtils';
import { calculateMindPulseScore, getFocusArea } from '@/utils/scoring';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Flame, Snowflake, Sparkles, Trophy } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The 7 YYYY-MM-DD dates of the current week, Monday first. */
function currentWeekDates(): string[] {
  const monday = getMondayISO();
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

function WeekStrip({ activityLog }: { activityLog: string[] }) {
  const today = todayISO();
  const activitySet = new Set(activityLog);

  return (
    <View style={styles.weekRow}>
      {currentWeekDates().map((date, i) => {
        const done = activitySet.has(date);
        const isToday = date === today;
        return (
          <View key={date} style={styles.weekDay}>
            <View style={[styles.weekDot, done && styles.weekDotDone, isToday && !done && styles.weekDotToday]}>
              {done && <Check size={12} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>{WEEKDAY_LABELS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** One badge cell — Lucide icon, orange + glow when unlocked (the one
 * Challenges accent, not each achievement's own color), muted gray + low
 * opacity when locked. A small press-scale gives unlocked badges a tactile
 * "reward" feel when tapped. */
function BadgeCell({ achievement, unlocked }: { achievement: (typeof ACHIEVEMENT_DEFINITIONS)[number]; unlocked: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const Icon = achievement.icon;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  return (
    <TouchableOpacity activeOpacity={0.85} onPressIn={pressIn} onPressOut={pressOut} disabled={!unlocked}>
      <Animated.View
        style={[
          styles.badgeCell,
          unlocked ? styles.badgeCellUnlocked : styles.badgeCellLocked,
          { transform: [{ scale }] },
        ]}
      >
        <Icon size={20} color={unlocked ? PILLAR_COLORS.challenge : colors.text.tertiary} strokeWidth={2} />
      </Animated.View>
    </TouchableOpacity>
  );
}

/** Small preview grid of every real achievement. */
function BadgeGrid({ unlockedIds }: { unlockedIds: Set<string> }) {
  return (
    <View style={styles.badgeGrid}>
      {ACHIEVEMENT_DEFINITIONS.map((a) => (
        <BadgeCell key={a.id} achievement={a} unlocked={unlockedIds.has(a.id)} />
      ))}
    </View>
  );
}

export default function ChallengesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const streak = useWellnessStore((s) => s.streak);
  const longestStreak = useWellnessStore((s) => s.longestStreak);
  const streakFreezeAvailable = useWellnessStore((s) => s.streakFreezeAvailable);
  const activityLog = useWellnessStore((s) => s.activityLog);

  const eyeResult = useEyeScore(user?.uid ?? undefined);
  const mindResult = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(user?.uid ?? undefined, user?.isAnonymous ?? true);
  const anyLoading = eyeResult.loading || mindResult.loading || sleepResult.loading;
  const focusArea = getFocusArea(
    eyeResult.loading ? 0 : eyeResult.score,
    sleepResult.loading ? 0 : sleepResult.score,
    mindResult.loading ? 0 : mindResult.score,
  );
  const mindPulseScore = anyLoading
    ? 0
    : calculateMindPulseScore({ eyeScore: eyeResult.score, sleepScore: sleepResult.score, mindScore: mindResult.score });

  const { challenge: todayChallenge, done: doneToday } = useDailyChallengeStatus(focusArea, !anyLoading);

  const { earned, unlockedCount, totalCount, percent: achievementPercent } = useUnlockedAchievements();
  const unlockedIds = new Set(earned.map((a) => a.id));

  const weeklyDaysActive = currentWeekDates().filter((d) => activityLog.includes(d)).length;
  const heroPercent = (weeklyDaysActive / 7) * 100;

  const CHALLENGE_ACCENT = PILLAR_COLORS.challenge;

  const heroTitle = streak === 0 ? 'Start Your Streak' : `🔥 ${streak} Day${streak === 1 ? '' : 's'}`;
  const heroMessage =
    streak === 0
      ? 'Complete one session today to earn your first streak day.'
      : doneToday
        ? "You're all set for today. Nice work."
        : 'Keep it alive today.';

  return (
    <ScreenShell scroll pillar="challenge" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader title="Challenges" subtitle="Your streaks, goals & milestones" />

        <StreakCelebrationBanner />

        {/* ── Streak hero ─────────────────────────────────────────── */}
        <StaggerItem index={0}>
          <HeroCard style={styles.heroCard}>
            <View style={styles.heroInner}>
              <Text style={styles.heroLabel}>TODAY&apos;S JOURNEY</Text>
              <Text style={styles.heroTitleText}>{heroTitle}</Text>
              <Text style={styles.heroMessage}>{heroMessage}</Text>

              <ProgressBar progress={Math.max(heroPercent / 100, 0.04)} fill={CHALLENGE_ACCENT} style={styles.track} />

              {doneToday ? (
                <View style={styles.donePillLarge}>
                  <Check size={14} color={STATUS_COLORS.success} strokeWidth={2.5} />
                  <Text style={styles.donePillLargeText}>Completed today</Text>
                </View>
              ) : (
                <View style={{ marginTop: spacing.md, width: '100%' }}>
                  <GradientCTA
                    label={streak === 0 ? "Complete Today's Challenge" : 'Continue →'}
                    textColor="#03212C"
                    onPress={() => router.push(todayChallenge.route as never)}
                  />
                </View>
              )}

              <View style={[styles.freezeBadge, !streakFreezeAvailable && styles.freezeBadgeUsed]}>
                <Snowflake size={11} color={streakFreezeAvailable ? 'rgba(255,255,255,0.75)' : colors.text.tertiary} strokeWidth={2.5} />
                <Text style={[styles.freezeText, !streakFreezeAvailable && styles.freezeTextUsed]}>
                  {streakFreezeAvailable ? 'Weekly streak freeze available' : 'Freeze used this week'}
                </Text>
              </View>

              {longestStreak >= 3 && (
                <Text style={styles.longestStreak}>Longest streak: {longestStreak} days</Text>
              )}
            </View>
          </HeroCard>
        </StaggerItem>

        {/* ── This week ───────────────────────────────────────────── */}
        <StaggerItem index={1}>
          <View style={{ marginTop: spacing.md }}>
            <SectionLabel first>THIS WEEK</SectionLabel>
            <GlassCard style={{ borderRadius: RADIUS.card, ...SHADOWS.medium }}>
              <WeekStrip activityLog={activityLog} />
            </GlassCard>
          </View>
        </StaggerItem>

        {/* ── Today's challenge (full) — DailyChallenge renders its own label ── */}
        <StaggerItem index={2}>
          <View style={{ marginTop: spacing.md }}>
            <DailyChallenge worstArea={focusArea} ready={!anyLoading} />
          </View>
        </StaggerItem>

        {/* ── Achievements — real unlocked count + badge preview grid ── */}
        <StaggerItem index={3}>
          <View style={{ marginTop: spacing.md }}>
            <SectionLabel first>ACHIEVEMENTS</SectionLabel>
            <TouchableOpacity onPress={() => router.push(ROUTES.appAchievements as never)} activeOpacity={0.85}>
              <GlassCard style={{ borderRadius: RADIUS.card, ...SHADOWS.medium }}>
                <View style={styles.achievementsRow}>
                  <View style={styles.achievementsIconWrap}>
                    <Trophy size={20} color={CHALLENGE_ACCENT} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.achievementsTitle}>Progress</Text>
                    <Text style={styles.achievementsSub}>{unlockedCount} of {totalCount} unlocked</Text>
                  </View>
                  <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.5} />
                </View>
                <View style={styles.achievementsTrack}>
                  <View style={[styles.achievementsFill, { width: `${achievementPercent}%` as DimensionValue }]} />
                </View>
                <BadgeGrid unlockedIds={unlockedIds} />
                {unlockedCount === 0 && (
                  <View style={styles.emptyHint}>
                    <Sparkles size={13} color={CHALLENGE_ACCENT} strokeWidth={2} />
                    <Text style={styles.emptyHintText}>
                      Unlock achievements by completing sessions. Start your first session →
                    </Text>
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          </View>
        </StaggerItem>

        {/* ── Weekly Wellness — same style as Home (no card wrapper) ── */}
        <StaggerItem index={4}>
          <View style={{ marginTop: spacing.md }}>
            <SectionLabel first>WEEKLY WELLNESS</SectionLabel>
            <WeeklyProgressRow
              icon={<Flame size={13} color={PILLAR_COLORS.challenge} fill={PILLAR_COLORS.challenge} strokeWidth={1.5} />}
              label="Weekly Wellness"
              value={anyLoading ? '–' : `${mindPulseScore}/100`}
              percent={anyLoading ? 0 : mindPulseScore}
              accentColor={CHALLENGE_ACCENT}
              onPress={() => router.push(ROUTES.appReport as never)}
            />
          </View>
        </StaggerItem>

        <View style={{ height: 48 }} />
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {},
  heroInner: {
    padding: 20,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: 'rgba(255,255,255,0.5)',
    alignSelf: 'flex-start',
  },
  heroTitleText: {
    fontFamily: FONTS.heading,
    fontSize: 30,
    color: colors.text.primary,
    marginTop: 8,
  },
  heroMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  track: {
    marginTop: spacing.md,
    width: '100%',
  },
  donePillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: 'rgba(50,213,131,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(50,213,131,0.3)',
    borderRadius: RADIUS.chip,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  donePillLargeText: {
    fontSize: 13,
    fontWeight: '700',
    color: STATUS_COLORS.success,
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  freezeBadgeUsed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  freezeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  freezeTextUsed: {
    color: colors.text.tertiary,
  },
  longestStreak: {
    fontSize: 11.5,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
    gap: 6,
  },
  weekDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  weekDotToday: {
    borderColor: PILLAR_COLORS.challenge,
    borderWidth: 1.5,
    shadowColor: PILLAR_COLORS.challenge,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  weekDayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  weekDayLabelToday: {
    color: colors.text.secondary,
  },
  achievementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achievementsIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,174,26,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,174,26,0.28)',
  },
  achievementsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  achievementsSub: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  achievementsTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  achievementsFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: PILLAR_COLORS.challenge,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.md,
  },
  badgeCell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCellLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeCellUnlocked: {
    backgroundColor: 'rgba(255,174,26,0.12)',
    borderColor: 'rgba(255,174,26,0.35)',
    shadowColor: PILLAR_COLORS.challenge,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  emptyHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
  },
});
