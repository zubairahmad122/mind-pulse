import { GlassCard } from '@/components/ui/GlassCard';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLatestActivity } from '@/hooks/useActivity';
import type { ActivityType } from '@/types/activity.types';

type LastFeature = {
  id: string;
  label: string;
  subtitle: string;
  route: string;
  color: string;
};

const EYE_COMFORT: Omit<LastFeature, 'id'> = { label: 'Eye Comfort', subtitle: 'Take a guided screen break', route: ROUTES.appEyeRelax, color: PILLAR_COLORS.eye };

/** Where each completed activity type continues from. */
const FEATURE_MAP: Record<ActivityType, LastFeature> = {
  // Every eye activity wears the single Eyes-pillar cyan.
  EYE_RESET_COMPLETED:     { id: 'eye-exercise', ...EYE_COMFORT },
  EYE_BREAK_COMPLETED:     { id: 'eye-exercise', ...EYE_COMFORT },
  EYE_GAME_COMPLETED:      { id: 'eye-game', label: 'Visual Games', subtitle: 'Play a short coordination activity', route: ROUTES.appEyeRelax, color: PILLAR_COLORS.eye },
  RELAX_SESSION_COMPLETED: { id: 'relax',    label: 'Relaxation',   subtitle: 'Unwind and breathe', route: ROUTES.appRelax, color: '#4DE1C1' },
  MIND_GAME_COMPLETED:     { id: 'mind',     label: 'Mind Games',   subtitle: 'Train your focus', route: ROUTES.appMind, color: '#A48BFF' },
  FOCUS_SESSION_COMPLETED: { id: 'focus',    label: 'Focus',        subtitle: 'Start another focus block', route: ROUTES.appFocusBlock, color: PILLAR_COLORS.mind },
  SLEEP_SESSION_COMPLETED: { id: 'sleep',    label: 'Sleep',        subtitle: 'Track tonight', route: ROUTES.appSleep, color: '#A48BFF' },
};

/**
 * The feature of the user's most recent COMPLETED activity (unified activity
 * log) — never just a tab they opened. `isCompleted` is true whenever there is
 * one, since only completions are logged.
 */
export function useLastFeature(): { last: LastFeature | null; isCompleted: boolean } {
  const latest = useLatestActivity();
  const last = useMemo(() => (latest ? FEATURE_MAP[latest.type] : null), [latest]);
  return { last, isCompleted: last !== null };
}

export const ContinueJourney = memo(function ContinueJourney() {
  const router = useRouter();
  const { last, isCompleted } = useLastFeature();

  if (!last) return null;

  const ctaLabel = isCompleted ? 'Start Next Session' : 'Resume';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(last.route as never)}>
      <GlassCard style={styles.card}>
        <View style={[styles.indicator, { backgroundColor: last.color }]} />
        <View style={styles.info}>
          <Text style={styles.label}>Continue Your Journey</Text>
          <Text style={styles.title}>{last.label}</Text>
          <Text style={styles.sub}>{last.subtitle}</Text>
        </View>
        <View style={[styles.resumeBtn, { borderColor: last.color + '40' }]}>
          <Text style={[styles.resumeText, { color: last.color }]}>{ctaLabel}</Text>
          <ChevronRight size={14} color={last.color} strokeWidth={2.5} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(245,247,251,0.45)',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 12,
    color: colors.text.secondary,
    letterSpacing: 0.1,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  resumeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
