import { Check, ChevronRight, Timer, Eye, CheckCircle, AlertCircle, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { EyeRelaxIcon, eyeRelaxIconBg } from '@/components/eye/icons/EyeRelaxIcon';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { EyeScoreCard } from '@/components/eye/EyeScoreCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreBreakdownCard } from '@/components/ui/ScoreBreakdownCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EYE_GAMES, RECOVERY_SESSIONS, ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { EyeActivity } from '@/constants/eyeRelax';
import { useAuth } from '@/context/AuthContext';
import { useEyeBreakEnforcer } from '@/hooks/useEyeBreakEnforcer';
import { useEyeProgress } from '@/hooks/useEyeProgress';
import { useEyeScore } from '@/hooks/useEyeScore';
import { useGameRecord } from '@/hooks/useGameRecord';
import { useDailyEyeGoals } from '@/hooks/useDailyEyeGoals';
import { useLastBreakTime } from '@/hooks/useLastBreakTime';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { recordLastFeature } from '@/components/home/ContinueJourney';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function recoveryColor(pct: number): string {
  if (pct === 100) return '#6ee7b7';
  if (pct >= 67) return '#f97316';
  return '#f59e0b';
}

function GoalRow({ label, done }: { label: string; done: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done) {
      scale.value = withSequence(
        withSpring(1.15, { damping: 10 }),
        withSpring(1.0, { damping: 12 }),
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [done]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.goalRow, animStyle]}>
      <View style={[styles.goalCircle, done && styles.goalCircleDone]}>
        {done && <Check size={12} color="#0a0720" strokeWidth={3} />}
      </View>
      <Text style={[styles.goalLabel, done && styles.goalLabelDone]}>{label}</Text>
    </Animated.View>
  );
}

const EYE_ACCENT = '#22d3ee';

function ActivityCard({
  id,
  title,
  subtitle,
  onPress,
  badge,
  badgeColor = EYE_ACCENT,
  pb,
}: {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
  badgeColor?: string;
  pb?: string | null;
}) {
  const iconBg = eyeRelaxIconBg(id);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard simple noPadding style={[styles.activityCard, { borderColor: EYE_ACCENT + '22' }]}>
        <LinearGradient
          colors={[EYE_ACCENT + '0E', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.activityRow}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg, borderColor: 'rgba(255,255,255,0.12)' }]}>
            <EyeRelaxIcon id={id} size={26} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{subtitle}</Text>
          </View>
          <View style={styles.cardMeta}>
            {badge ? (
              <View style={[styles.badgePill, { backgroundColor: badgeColor + '1f', borderColor: badgeColor + '40' }]}>
                <Text style={[styles.badgePillText, { color: badgeColor }]}>{badge}</Text>
              </View>
            ) : (
              <View style={[styles.arrowBtn, { backgroundColor: EYE_ACCENT + '18', borderColor: EYE_ACCENT + '30' }]}>
                <ChevronRight size={17} color={EYE_ACCENT} strokeWidth={2.3} />
              </View>
            )}
            {pb ? <Text style={styles.pbText}>{pb}</Text> : null}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function EyeRelaxScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Record this feature for ContinueYourJourney on Home
  useEffect(() => { void recordLastFeature('eye-exercise'); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const { todayDone, streak, weekDots, loading: progressLoading } = useEyeProgress(user?.uid);
  const { enabled: breakEnabled, loading: breakLoading, toggle: toggleBreak } = useEyeBreakEnforcer(user?.uid);
  const eyeScore = useEyeScore(user?.uid);
  const goals = useDailyEyeGoals(user?.uid ?? undefined);
  const { minutesAgo } = useLastBreakTime(user?.uid ?? undefined);

  const { record: saccadeRecord } = useGameRecord(user?.uid, 'saccade-sniper');
  const { record: focusRecord } = useGameRecord(user?.uid, 'focus-sprint');

  function openActivity(item: EyeActivity) {
    if (item.id === 'dichoptic-reaction') {
      router.push(ROUTES.appDichopticScreen as never);
      return;
    }
    if (item.kind === 'game') {
      router.push(ROUTES.appEyeGame(item.id) as never);
    } else {
      router.push(ROUTES.appEyeExercise(item.id) as never);
    }
  }

  function getGamePB(id: string): string | null {
    if (id === 'saccade-sniper' && saccadeRecord) return `PB ${saccadeRecord.value}ms`;
    if (id === 'focus-sprint' && focusRecord) return `PB ${focusRecord.value}%`;
    return null;
  }

  const recoveryPct = goals.loading ? 0 : goals.recoveryPct;
  const recoveryDisplayColor = goals.loading ? colors.text.tertiary : recoveryColor(recoveryPct);

  return (
    <ScreenShell pillar="eyes" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
      <ScreenHeader title="Eye Training" subtitle="Recover · train · protect" />

      {/* 1. Eye Score */}
      <EyeScoreCard result={eyeScore} loading={eyeScore.loading} />
      {!eyeScore.loading && (
        <ScoreBreakdownCard
          title="WHY THIS SCORE?"
          score={eyeScore.score}
          theme={eyeScore.theme}
          breakdown={eyeScore.breakdown}
          hideScoreHeader
        />
      )}

      {/* 2. Today's Progress + Goals */}
      <GlassCard style={styles.goalsCard}>
        <View style={styles.goalsHeader}>
          <Text style={styles.goalsTitle}>Today's Progress</Text>
          <Text style={[styles.recoveryPct, { color: recoveryDisplayColor }]}>
            {goals.loading ? '–' : `${recoveryPct}%`}
          </Text>
        </View>

        <GoalRow label="Complete a recovery session" done={goals.protocolDone} />
        <GoalRow label="Take 3 eye breaks (20-20-20)" done={goals.breaksTaken >= 3} />
        <GoalRow label="Play an eye game" done={goals.gamePlayed} />

        {goals.breaksTaken > 0 && goals.breaksTaken < 3 && (
          <Text style={styles.breaksProgress}>{goals.breaksTaken}/3 breaks</Text>
        )}

        {/* Streak + week dots */}
        <View style={styles.streakRow}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakValue}>{progressLoading ? '–' : streak}</Text>
            <Flame size={14} color="#f97316" strokeWidth={2.5} />
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, i) => (
              <View key={i} style={styles.dotCol}>
                <View style={[styles.dot, weekDots[i] && styles.dotFilled]} />
                <Text style={styles.dotLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.todayBadge, todayDone && styles.todayBadgeDone]}>
            {todayDone ? '✓ Done' : '–'}
          </Text>
        </View>
      </GlassCard>

      {/* 3. Break Enforcer + Quick Break */}
      <View style={styles.quickActionRow}>
        <GlassCard style={styles.enforcerCard}>
          <View style={styles.enforcerInfo}>
            <Timer size={18} color={colors.text.secondary} strokeWidth={2} />
            <Text style={styles.enforcerTitle}>20-20-20 breaks</Text>
          </View>
          <Switch
            value={breakEnabled}
            onValueChange={toggleBreak}
            disabled={breakLoading}
            trackColor={{ false: colors.background.secondary, true: EYE_ACCENT }}
            thumbColor={breakEnabled ? '#FFFFFF' : colors.text.secondary}
          />
        </GlassCard>

        <TouchableOpacity
          style={styles.quickBreakBtn}
          onPress={() => router.push(ROUTES.appEyeBreak as never)}
          activeOpacity={0.85}
        >
          <Eye size={20} color={EYE_ACCENT} strokeWidth={2} />
          <Text style={styles.quickBreakLabel}>Eye Break</Text>
        </TouchableOpacity>
      </View>

      {/* Break reminder chip */}
      {minutesAgo !== null && (
        <View style={[styles.breakChip, { borderColor: minutesAgo < 20 ? '#6ee7b766' : '#f59e0b66' }]}>
          {minutesAgo < 20 ? (
            <CheckCircle size={12} color="#6ee7b7" strokeWidth={2.5} />
          ) : (
            <AlertCircle size={12} color="#f59e0b" strokeWidth={2.5} />
          )}
          <Text style={[styles.breakChipText, { color: minutesAgo < 20 ? '#6ee7b7' : '#f59e0b' }]}>
            {minutesAgo < 20
              ? `Last eye break ${minutesAgo}m ago — eyes resting ✓`
              : `Last break ${minutesAgo}m ago — break due soon`}
          </Text>
        </View>
      )}

      {/* 4. Recovery Sessions */}
      <SectionLabel>RECOVERY SESSIONS</SectionLabel>
      {RECOVERY_SESSIONS.map(s => {
        const route = s.id === 'comet-trace'
          ? ROUTES.appEyeGame('comet-trace')
          : ROUTES.appCvsProtocol;
        const isPrimary = s.id === 'cvs-protocol';
        return (
          <ActivityCard
            key={s.id}
            id={s.id}
            title={s.title}
            subtitle={s.subtitle}
            onPress={() => router.push(route as never)}
            badge={isPrimary ? 'RECOMMENDED' : undefined}
            badgeColor="#6ee7b7"
          />
        );
      })}

      {/* 5. Eye Games */}
      <SectionLabel>EYE GAMES</SectionLabel>
      {EYE_GAMES.map(item => (
        <ActivityCard
          key={item.id}
          id={item.id}
          title={item.title}
          subtitle={item.subtitle}
          onPress={() => openActivity(item)}
          badge="GAME"
          badgeColor="#06B6D4"
          pb={getGamePB(item.id)}
        />
      ))}
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* Goals Card */
  goalsCard: { marginBottom: spacing.md, gap: spacing.sm },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  goalsTitle: { ...typography.label, color: colors.text.secondary },
  recoveryPct: { fontSize: 13, fontWeight: '800' },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  goalCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: EYE_ACCENT + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  goalCircleDone: { backgroundColor: '#6ee7b7', borderColor: '#6ee7b7' },
  goalLabel: { ...typography.body, color: colors.text.secondary },
  goalLabelDone: { color: colors.text.tertiary, textDecorationLine: 'line-through' },
  breaksProgress: { ...typography.caption, color: colors.text.tertiary, paddingLeft: 30 },

  streakRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: spacing.sm, marginTop: spacing.xs, gap: spacing.sm,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 80 },
  streakValue: { ...typography.headingSmall, color: EYE_ACCENT },
  streakLabel: { ...typography.caption, color: colors.text.secondary },
  weekRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dotCol: { alignItems: 'center', gap: 3 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: EYE_ACCENT + '55',
  },
  dotFilled: { backgroundColor: EYE_ACCENT, borderColor: EYE_ACCENT },
  dotLabel: { fontSize: 8, color: colors.text.secondary, fontWeight: '600' },
  todayBadge: {
    ...typography.caption, color: colors.text.secondary,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden',
  },
  todayBadgeDone: { color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)' },

  /* Quick Actions */
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  enforcerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  enforcerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  enforcerTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },

  quickBreakBtn: {
    width: 90,
    height: 76,
    borderRadius: 16,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: EYE_ACCENT + '55',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickBreakLabel: { fontSize: 10, fontWeight: '800', color: EYE_ACCENT, letterSpacing: 0.3 },

  /* Break Chip */
  breakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  breakChipText: { fontSize: 12, fontWeight: '600' },

  /* Activity Cards */
  activityCard: {
    marginBottom: 10,
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 74,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardInfo: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: { fontSize: 16, color: '#f6f8fc', fontWeight: '700', letterSpacing: 0.15 },
  cardSub: { fontSize: 12.5, color: 'rgba(245,247,251,0.5)' },
  cardMeta: { alignItems: 'flex-end', gap: 6, minWidth: 36, justifyContent: 'center' },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgePillText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6 },
  arrowBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  pbText: { fontSize: 10, color: '#FFD700', fontWeight: '700' },
});
