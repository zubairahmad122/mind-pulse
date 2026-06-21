import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { DayPicker } from '@/components/sleep/DayPicker';
import { TimePickerRow } from '@/components/sleep/TimePickerRow';
import { AIRecommendation } from '@/components/home/AIRecommendation';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleepRecommendation } from '@/hooks/useSleepRecommendation';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { SleepSchedule } from '@/types/sleep.types';
import { calculateSleepDurationHours } from '@/utils/formatTime';

export function SleepRoutinePanel() {
  const { user, isGuestMode } = useAuth();
  const { schedule, loading, saveSchedule } = useSleepSchedule(user?.uid, isGuestMode);
  const { message: sleepRecommendation, loading: recommendationLoading } = useSleepRecommendation();
  const [saving, setSaving] = useState(false);

  if (!schedule || loading) {
    return <Text style={styles.loading}>Loading your routine…</Text>;
  }

  const update = (patch: Partial<SleepSchedule>) => {
    const next = { ...schedule, ...patch };
    const duration = calculateSleepDurationHours(next.bedtime, next.wakeTime);
    void saveSchedule({ ...next, duration });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSchedule(schedule);
      Alert.alert('Saved', 'Your weekly sleep routine is updated.');
    } catch {
      Alert.alert('Error', 'Could not save routine.');
    } finally {
      setSaving(false);
    }
  };

  const durationPct = Math.min(100, (schedule.duration / 9) * 100);

  return (
    <View>
      <Text style={styles.intro}>
        Set your usual bedtime and wake time. “My Schedule” on the Tonight tab uses this goal.
      </Text>

      <AIRecommendation message={sleepRecommendation} loading={recommendationLoading} />

      <TimePickerRow
        label="Bedtime"
        hint="When you usually go to sleep"
        value={schedule.bedtime}
        onChange={bedtime => update({ bedtime })}
      />
      <TimePickerRow
        label="Wake time"
        hint="When you want to get up"
        value={schedule.wakeTime}
        onChange={wakeTime => update({ wakeTime })}
      />

      <GlassCard style={styles.durationCard}>
        <View style={styles.durationHeader}>
          <Text style={styles.durationLabel}>Sleep goal</Text>
          <Text style={styles.durationValue}>{schedule.duration} hours</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${durationPct}%` }]} />
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>Active days</Text>
      <DayPicker selected={schedule.activeDays} onChange={activeDays => update({ activeDays })} />

      <GlassCard style={styles.reminderRow}>
        <View style={styles.reminderText}>
          <Text style={styles.reminderTitle}>Bedtime reminder</Text>
          <Text style={styles.reminderSub}>{schedule.reminderMinutes} min before bed</Text>
        </View>
        <Switch
          value={schedule.reminderEnabled}
          onValueChange={reminderEnabled => update({ reminderEnabled })}
          trackColor={{ false: colors.text.tertiary, true: colors.accent.purple }}
          thumbColor={colors.text.primary}
        />
      </GlassCard>

      <PrimaryButton label="Save routine" onPress={handleSave} loading={saving} style={styles.saveBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xl },
  intro: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  durationCard: { marginVertical: spacing.md, gap: spacing.sm },
  durationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  durationLabel: { ...typography.label, color: colors.text.secondary },
  durationValue: { ...typography.headingSmall, color: colors.accent.purple },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.purpleLight,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.accent.purple, borderRadius: 4 },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  reminderRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderText: { flex: 1, gap: spacing.xs },
  reminderTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  reminderSub: { ...typography.caption, color: colors.text.secondary },
  saveBtn: { marginTop: spacing.xl, marginBottom: spacing.lg },
});
