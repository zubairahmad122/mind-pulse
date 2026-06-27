// ──────────────────────────────────────────────────────────────────────────────
// SleepRoutineScreen — Routine tab with day selector and alarm settings
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MPText } from '@/components/atoms/MPText';
import { MPCard } from '@/components/atoms/MPCard';
import { MPListItem } from '@/components/molecules/MPListItem';
import { MPGoalChip } from '@/components/molecules/MPGoalChip';
import { MPDaySelector } from '@/components/molecules/MPDaySelector';
import { MPSectionHeader } from '@/components/molecules/MPSectionHeader';
import { useSleepStore } from '@/stores/useSleepStore';
import { useHaptics } from '@/hooks/useHaptics';
import { COLORS, SPACING } from '@/theme';
import { SCREENS } from '@/navigation/types';

const SLEEP_GOALS = [
  { value: '6h', sublabel: 'Minimal', hours: 6 },
  { value: '7h', sublabel: 'Good', hours: 7 },
  { value: '7.5h', sublabel: 'Recommended', hours: 7.5 },
  { value: '8h', sublabel: 'Optimal', hours: 8 },
  { value: '9h', sublabel: 'Deep rest', hours: 9 },
];

export default function SleepRoutineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lightImpact } = useHaptics();

  const sleepGoal = useSleepStore((s) => s.sleepGoal);
  const setSleepGoal = useSleepStore((s) => s.setSleepGoal);
  const activeDays = useSleepStore((s) => s.activeDays);
  const toggleDay = useSleepStore((s) => s.toggleDay);
  const smartAlarm = useSleepStore((s) => s.smartAlarm);
  const toggleSmartAlarm = useSleepStore((s) => s.toggleSmartAlarm);
  const reminderEnabled = useSleepStore((s) => s.reminderEnabled);
  const toggleReminder = useSleepStore((s) => s.toggleReminder);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        paddingHorizontal: SPACING['2xl'],
        paddingTop: insets.top + SPACING.lg,
        paddingBottom: insets.bottom + SPACING['4xl'],
        gap: SPACING.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Sleep Goal ──────────────────────────────────────── */}
      <View>
        <MPSectionHeader title="Sleep Goal" first />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: 4 }}
          style={{ marginTop: SPACING.sm }}
        >
          {SLEEP_GOALS.map((g) => (
            <MPGoalChip
              key={g.value}
              value={g.value}
              sublabel={g.sublabel}
              selected={sleepGoal === g.hours}
              onPress={() => {
                lightImpact();
                setSleepGoal(g.hours);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Active Days ─────────────────────────────────────── */}
      <MPCard>
        <MPSectionHeader title="Alarm Days" first />
        <View style={{ marginTop: SPACING.sm }}>
          <MPDaySelector activeDays={activeDays} onToggle={toggleDay} />
        </View>
      </MPCard>

      {/* ── Alarm Settings ──────────────────────────────────── */}
      <View>
        <MPSectionHeader title="Alarm Settings" />
        <MPCard>
          <MPListItem
            iconName="Bell"
            iconBgColor={COLORS.blue}
            title="Smart Alarm"
            subtitle="Wakes you in light sleep phase"
            accessory={{ kind: 'toggle', value: smartAlarm, onToggle: toggleSmartAlarm }}
          />
          <MPListItem
            iconName="Bell"
            iconBgColor={COLORS.purple}
            title="Bedtime Reminder"
            subtitle={`Remind ${sleepGoal}h before wake time`}
            accessory={{ kind: 'toggle', value: reminderEnabled, onToggle: toggleReminder }}
          />
          <MPListItem
            iconName="Volume2"
            iconBgColor={COLORS.green}
            title="Alarm Sound"
            subtitle="Gentle Awake"
            accessory={{ kind: 'chevron' }}
            onPress={() => router.push(SCREENS.SLEEP_ALARM_SOUND as never)}
          />
        </MPCard>
      </View>
    </ScrollView>
  );
}
