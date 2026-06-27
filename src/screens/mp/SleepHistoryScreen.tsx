// ──────────────────────────────────────────────────────────────────────────────
// SleepHistoryScreen — History tab with past sleep sessions
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MPText } from '@/components/atoms/MPText';
import { MPCard } from '@/components/atoms/MPCard';
import { MPEmptyState } from '@/components/molecules/MPEmptyState';
import { useSleepStore } from '@/stores/useSleepStore';
import { formatDuration, formatDateShort } from '@/utils/formatTime';
import { COLORS, SPACING } from '@/theme';

export default function SleepHistoryScreen() {
  const insets = useSafeAreaInsets();
  const sessions = useSleepStore((s) => s.sleepSessions);
  const completed = sessions.filter((s) => s.endTime && s.duration);

  if (completed.length === 0) {
    return (
      <MPEmptyState
        iconName="Moon"
        title="No Sleep History Yet"
        subtitle="Start a sleep session to begin tracking your rest patterns."
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        paddingHorizontal: SPACING['2xl'],
        paddingTop: insets.top + SPACING.lg,
        paddingBottom: insets.bottom + SPACING['4xl'],
        gap: SPACING.sm,
      }}
      showsVerticalScrollIndicator={false}
    >
      <MPText variant="h2" color="primary" style={{ marginBottom: SPACING.sm }}>
        Sleep History
      </MPText>

      {completed.reverse().map((session) => (
        <MPCard key={session.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 4 }}>
              <MPText variant="body" color="primary" style={{ fontWeight: '600' }}>
                {formatDuration(session.duration!)}
              </MPText>
              <MPText variant="caption-xs" color="secondary">
                {formatDateShort(session.startTime)}
              </MPText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <MPText variant="body-sm" color="secondary">
                {session.bedtime} → {session.wakeTime}
              </MPText>
            </View>
          </View>
        </MPCard>
      ))}
    </ScrollView>
  );
}
