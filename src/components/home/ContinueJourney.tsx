import { GlassCard } from '@/components/ui/GlassCard';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProgressStore } from '@/stores/useProgressStore';

const STORAGE_KEY = '@mindpulse/last-feature';

type LastFeature = {
  id: string;
  label: string;
  subtitle: string;
  route: string;
  color: string;
};

const FEATURE_MAP: Record<string, LastFeature> = {
  'eye-exercise': { id: 'eye-exercise', label: 'Eye Training', subtitle: 'Protect your vision', route: ROUTES.appEyeRelax, color: '#6ee7b7' },
  'eye-game':     { id: 'eye-game',     label: 'Eye Games',    subtitle: 'Train your reflexes', route: ROUTES.appEyeRelax, color: '#22d3ee' },
  'relax':        { id: 'relax',        label: 'Relaxation',   subtitle: 'Unwind and breathe', route: ROUTES.appRelax, color: '#4FC3F7' },
  'mind':         { id: 'mind',         label: 'Mind & Breath', subtitle: 'Stress relief', route: ROUTES.appBoxBreathing, color: '#60a5fa' },
  'sleep':        { id: 'sleep',        label: 'Sleep',        subtitle: 'Track tonight', route: ROUTES.appSleep, color: '#a78bfa' },
};

/** Save the last feature the user interacted with. Call from each feature screen. */
export async function recordLastFeature(featureId: string): Promise<void> {
  if (FEATURE_MAP[featureId]) {
    await AsyncStorage.setItem(STORAGE_KEY, featureId);
  }
}

function getWeeklyCount(featureId: string, weekly: { eye: number; eyeGames: number; relax: number; mind: number; sleep: number }): number {
  switch (featureId) {
    case 'eye-exercise': return weekly.eye;
    case 'eye-game': return weekly.eyeGames;
    case 'relax': return weekly.relax;
    case 'mind': return weekly.mind;
    case 'sleep': return weekly.sleep;
    default: return 0;
  }
}

export const ContinueJourney = memo(function ContinueJourney() {
  const router = useRouter();
  const [last, setLast] = useState<LastFeature | null>(null);
  const weeklySessions = useProgressStore((s) => s.weeklySessions);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && FEATURE_MAP[val]) setLast(FEATURE_MAP[val]);
    });
  }, []);

  const isCompleted = useMemo(() => {
    if (!last) return false;
    return getWeeklyCount(last.id, weeklySessions) > 0;
  }, [last, weeklySessions]);

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
