import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { ROUTES } from '@/constants';
import { FONTS, PALETTE, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/designSystem';
import { colors } from '@/constants/colors';
import { useDailyWellnessGoals } from '@/hooks/useDailyWellnessGoals';
import { ProgressBar } from '@/components/ui/ProgressBar';

/**
 * Home daily habit card — real goals from the activity log / resets.
 * Tapping an incomplete goal routes to the matching feature.
 */
export function DailyWellnessProgress() {
  const router = useRouter();
  const {
    goals,
    completedCount,
    totalCount,
    percent,
    consecutiveActiveDays,
    weekDays,
    ready,
  } = useDailyWellnessGoals();

  if (!ready) return null;

  const openGoal = (hint: (typeof goals)[number]['routeHint']) => {
    if (hint === 'eye-break') router.push(ROUTES.appEyeBreak as never);
    else if (hint === 'offline-reset') router.push(ROUTES.appOfflineReset as never);
    else router.push(ROUTES.appEyeRelax as never);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>DAILY WELLNESS</Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <Text style={styles.title}>
        {completedCount === 0
          ? 'Start today’s small wins'
          : completedCount === totalCount
            ? 'Daily goals complete'
            : `${completedCount} of ${totalCount} goals done`}
      </Text>
      {consecutiveActiveDays > 0 && (
        <Text style={styles.streak}>
          {consecutiveActiveDays} consecutive active day{consecutiveActiveDays === 1 ? '' : 's'}
        </Text>
      )}

      <ProgressBar
        progress={Math.max(percent / 100, 0.04)}
        fill={PALETTE.mint}
        style={styles.track}
      />

      <View style={styles.weekRow}>
        {weekDays.map(day => (
          <View key={day.date} style={styles.weekDay}>
            <View style={[styles.weekDot, day.active && styles.weekDotOn]} />
            <Text style={styles.weekLabel}>{day.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.goals}>
        {goals.map(goal => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.goalRow, goal.done && styles.goalRowDone]}
            onPress={() => openGoal(goal.routeHint)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${goal.label}, ${goal.current} of ${goal.target}`}
          >
            <View style={[styles.check, goal.done && styles.checkOn]}>
              {goal.done ? <Check size={14} color="#03212C" strokeWidth={3} /> : null}
            </View>
            <View style={styles.goalCopy}>
              <Text style={styles.goalLabel}>{goal.label}</Text>
              <Text style={styles.goalDetail}>
                {goal.done ? 'Done' : `${goal.current}/${goal.target} · ${goal.detail}`}
              </Text>
            </View>
            {!goal.done && <ChevronRight size={16} color="rgba(245,247,251,0.35)" strokeWidth={2} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.hero,
    padding: SPACING.cardPadding,
    backgroundColor: 'rgba(22, 18, 58, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(164,139,255,0.14)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  percent: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: '#fff',
  },
  title: {
    marginTop: 6,
    fontFamily: FONTS.headingSemi,
    fontSize: 17,
    color: colors.text.primary,
  },
  streak: {
    marginTop: 4,
    fontSize: 12,
    color: PALETTE.mint,
    fontWeight: '600',
  },
  track: {
    marginTop: 14,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 2,
  },
  weekDay: {
    alignItems: 'center',
    gap: 4,
  },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  weekDotOn: {
    backgroundColor: PALETTE.mint,
  },
  weekLabel: {
    fontSize: 10,
    color: 'rgba(245,247,251,0.4)',
    fontWeight: '600',
  },
  goals: {
    marginTop: 14,
    gap: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  goalRowDone: {
    borderColor: 'rgba(77,225,193,0.22)',
    backgroundColor: 'rgba(77,225,193,0.08)',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: PALETTE.mint,
    borderColor: PALETTE.mint,
  },
  goalCopy: {
    flex: 1,
  },
  goalLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: colors.text.primary,
  },
  goalDetail: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(245,247,251,0.5)',
  },
});
