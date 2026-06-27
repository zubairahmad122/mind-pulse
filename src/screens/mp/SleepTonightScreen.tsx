// ──────────────────────────────────────────────────────────────────────────────
// SleepTonightScreen — Tonight tab with clock, time setters, and CTA
// ──────────────────────────────────────────────────────────────────────────────

import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MPText } from '@/components/atoms/MPText';
import { MPButton } from '@/components/atoms/MPButton';
import { MPCard } from '@/components/atoms/MPCard';
import { MPSleepClock } from '@/components/organisms/MPSleepClock';
import { MPTimeSetter } from '@/components/molecules/MPTimeSetter';
import { MPSectionHeader } from '@/components/molecules/MPSectionHeader';
import { useSleepStore } from '@/stores/useSleepStore';
import { useHaptics } from '@/hooks/useHaptics';
import { calculateSleepDuration, adjustTime } from '@/utils/formatTime';
import { Moon } from 'lucide-react-native';
import { COLORS, SPACING } from '@/theme';

export default function SleepTonightScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lightImpact } = useHaptics();

  const bedtime = useSleepStore((s) => s.bedtime);
  const wakeTime = useSleepStore((s) => s.wakeTime);
  const setBedtime = useSleepStore((s) => s.setBedtime);
  const setWakeTime = useSleepStore((s) => s.setWakeTime);
  const sleepGoal = useSleepStore((s) => s.sleepGoal);
  const sleepHours = calculateSleepDuration(bedtime, wakeTime);
  const goalMet = sleepHours >= sleepGoal;

  const handleBedtimeAdjust = useCallback(
    (delta: number) => {
      lightImpact();
      setBedtime(adjustTime(bedtime, delta));
    },
    [bedtime, setBedtime, lightImpact],
  );

  const handleWakeAdjust = useCallback(
    (delta: number) => {
      lightImpact();
      setWakeTime(adjustTime(wakeTime, delta));
    },
    [wakeTime, setWakeTime, lightImpact],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        paddingHorizontal: SPACING['2xl'],
        paddingTop: insets.top + SPACING.lg,
        paddingBottom: insets.bottom + SPACING['4xl'],
        gap: SPACING.lg,
        alignItems: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Sleep Clock ─────────────────────────────────────── */}
      <MPSleepClock bedtime={bedtime} wakeTime={wakeTime} sleepHours={sleepHours} />

      {/* ── Goal indicator ──────────────────────────────────── */}
      <View style={{ alignItems: 'center', gap: 4 }}>
        <MPText variant="body-sm" color={goalMet ? 'green' : 'secondary'}>
          {goalMet
            ? `✓ ${sleepHours}h — meets your ${sleepGoal}h goal`
            : `${sleepHours}h — ${sleepGoal - sleepHours > 0 ? `need ${(sleepGoal - sleepHours).toFixed(1)}h more` : 'goal reached'}`}
        </MPText>
      </View>

      {/* ── Bedtime Control ─────────────────────────────────── */}
      <MPCard style={{ width: '100%' }}>
        <MPSectionHeader title="Bedtime" first />
        <MPTimeSetter
          hours={parseInt(bedtime.split(':')[0], 10)}
          minutes={parseInt(bedtime.split(':')[1], 10)}
          onAdjust={handleBedtimeAdjust}
        />
      </MPCard>

      {/* ── Wake Time Control ───────────────────────────────── */}
      <MPCard style={{ width: '100%' }}>
        <MPSectionHeader title="Wake Time" first />
        <MPTimeSetter
          hours={parseInt(wakeTime.split(':')[0], 10)}
          minutes={parseInt(wakeTime.split(':')[1], 10)}
          onAdjust={handleWakeAdjust}
        />
      </MPCard>

      {/* ── Start Sleep CTA ─────────────────────────────────── */}
      <MPButton
        variant="primary"
        size="lg"
        fullWidth
        title="Start Sleep Session"
        iconLeft={Moon}
        onPress={() => {
          // Start sleep session
        }}
      />
    </ScrollView>
  );
}
