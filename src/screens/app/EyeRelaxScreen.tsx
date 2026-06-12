import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { EyeScoreCard } from '@/components/eye/EyeScoreCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreBreakdownCard } from '@/components/ui/ScoreBreakdownCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
        {done && <Ionicons name="checkmark" size={12} color="#0a0720" />}
      </View>
      <Text style={[styles.goalLabel, done && styles.goalLabelDone]}>{label}</Text>
    </Animated.View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}  function ActivityCard({
  id,
  title,
  subtitle,
  onPress,
  badge,
  meta,
}: {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
  meta?: React.ReactNode;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard style={styles.activityCard}>
        <View style={[styles.iconWrap, { backgroundColor: eyeRelaxIconBg(id) }]}>
          <EyeRelaxIcon id={id} size={28} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
        <View style={styles.cardMeta}>
          {badge ? (
            <Text style={styles.gameBadge}>{badge}</Text>
          ) : meta ? (
            meta
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function EyeRelaxScreen() {
  const router = useRouter();
  const { user } = useAuth();

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
    <ScreenShell>
      <ScreenHeader title="Eye Training" subtitle="Recover · train · protect" />

      {/* 1. Eye Score */}
      <EyeScoreCard result={eyeScore} loading={eyeScore.loading} />
      {!eyeScore.loading && (
        <ScoreBreakdownCard
          title="WHY THIS SCORE?"
          score={eyeScore.score}
          theme={eyeScore.theme}
          breakdown={eyeScore.breakdown}
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
            <Ionicons name="flame" size={14} color="#f97316" />
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
            <Ionicons name="timer-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.enforcerTitle}>20-20-20 breaks</Text>
          </View>
          <Switch
            value={breakEnabled}
            onValueChange={toggleBreak}
            disabled={breakLoading}
            trackColor={{ false: colors.background.secondary, true: colors.accent.purple }}
            thumbColor={breakEnabled ? '#FFFFFF' : colors.text.secondary}
          />
        </GlassCard>

        <TouchableOpacity
          style={styles.quickBreakBtn}
          onPress={() => router.push(ROUTES.appEyeBreak as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="eye-outline" size={20} color={colors.accent.purple} />
          <Text style={styles.quickBreakLabel}>Eye Break</Text>
        </TouchableOpacity>
      </View>

      {/* Break reminder chip */}
      {minutesAgo !== null && (
        <View style={[styles.breakChip, { borderColor: minutesAgo < 20 ? '#6ee7b766' : '#f59e0b66' }]}>
          <Ionicons
            name={minutesAgo < 20 ? 'checkmark-circle' : 'alert-circle'}
            size={12}
            color={minutesAgo < 20 ? '#6ee7b7' : '#f59e0b'}
          />
          <Text style={[styles.breakChipText, { color: minutesAgo < 20 ? '#6ee7b7' : '#f59e0b' }]}>
            {minutesAgo < 20
              ? `Last eye break ${minutesAgo}m ago — eyes resting ✓`
              : `Last break ${minutesAgo}m ago — break due soon`}
          </Text>
        </View>
      )}

      {/* 4. Recovery Sessions */}
      <SectionHeader title="Recovery Sessions" />
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
          />
        );
      })}

      {/* 5. Eye Games */}
      <SectionHeader title="Eye Games" />
      {EYE_GAMES.map(item => {
        const pb = getGamePB(item.id);
        return (
          <View key={item.id} style={styles.gameCardOuter}>
            <ActivityCard
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => openActivity(item)}
              badge="GAME"
            />
            {pb && <Text style={styles.pbText}>{pb}</Text>}
          </View>
        );
      })}

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
    borderWidth: 1.5, borderColor: colors.accent.purpleBorder,
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
  streakValue: { ...typography.headingSmall, color: colors.accent.purple },
  streakLabel: { ...typography.caption, color: colors.text.secondary },
  weekRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dotCol: { alignItems: 'center', gap: 3 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: colors.accent.purpleBorder,
  },
  dotFilled: { backgroundColor: colors.accent.purple, borderColor: colors.accent.purple },
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
    borderColor: colors.accent.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickBreakLabel: { fontSize: 10, fontWeight: '800', color: colors.accent.purple, letterSpacing: 0.3 },

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

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.text.primary,
  },
  sectionAction: {
    ...typography.caption,
    color: colors.accent.purple,
    fontWeight: '700',
  },

  /* Activity Cards */
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardInfo: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  cardSub: { ...typography.caption, color: colors.text.secondary },
  cardMeta: { alignItems: 'flex-end', gap: 4, minWidth: 36 },
  gameBadge: { ...typography.caption, color: colors.accent.purple, fontWeight: '800', fontSize: 9 },

  gameCardOuter: { marginBottom: spacing.sm },
  pbText: { fontSize: 10, color: '#FFD700', fontWeight: '600', paddingLeft: 56, marginTop: -4, marginBottom: 2 },
});
