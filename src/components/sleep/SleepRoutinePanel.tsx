import { AIRecommendation } from '@/components/home/AIRecommendation';
import { DayPicker } from '@/components/sleep/DayPicker';
import { RoutineSkeleton } from '@/components/sleep/Skeletons';
import { TimePickerRow } from '@/components/sleep/TimePickerRow';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleepRecommendation } from '@/hooks/useSleepRecommendation';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { SleepSchedule } from '@/types/sleep.types';
import { calculateSleepDurationHours } from '@/utils/formatTime';
import * as Haptics from 'expo-haptics';
import { Bell } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// The Sleep tab's frozen accent — same indigo as the Tonight tab and its
// segmented control, so Routine doesn't drift into its own purple identity.
const INDIGO = PILLAR_COLORS.sleep;

export function SleepRoutinePanel() {
  const { user, isGuestMode } = useAuth();
  const { schedule, loading, saveSchedule } = useSleepSchedule(user?.uid, isGuestMode);
  const {
    loading: recommendationLoading,
    sessionCount,
    consistencyScore,
    avgDurationHours,
  } = useSleepRecommendation();
  const [saving, setSaving] = useState(false);

  // A concise, computed insight — the verbose Gemini tip belongs on the Tonight
  // / History screens where there's room; here we keep it to ~2 lines.
  const routineInsight =
    sessionCount === 0
      ? "Set your schedule below, then log a night to unlock personalized advice."
      : `Consistency ${consistencyScore}/100 · averaging ${avgDurationHours}h. ${
          consistencyScore >= 80
            ? "Your routine is solid — keep it steady."
            : "A steadier bedtime will sharpen this."
        }`;

  if (!schedule || loading) {
    return <RoutineSkeleton />;
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
    <View style={styles.root}>
      <AIRecommendation
        title="ROUTINE TIP"
        message={routineInsight}
        loading={recommendationLoading}
      />

      {/* One shared glass card for both schedule rows — was two giant
          independent cards, the biggest source of Routine's extra height. */}
      <GlassCard style={styles.scheduleCard} noPadding>
        <View style={styles.scheduleInner}>
          <TimePickerRow
            bare
            label="Bedtime"
            hint="When you usually go to sleep"
            value={schedule.bedtime}
            onChange={bedtime => update({ bedtime })}
          />
          <View style={styles.scheduleDivider} />
          <TimePickerRow
            bare
            label="Wake time"
            hint="When you want to get up"
            value={schedule.wakeTime}
            onChange={wakeTime => update({ wakeTime })}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.durationCard}>
        <View style={styles.durationHeader}>
          <Text style={styles.durationLabel}>SLEEP GOAL</Text>
          <Text style={styles.durationValue}>{schedule.duration} hours</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${durationPct}%` }]} />
        </View>
      </GlassCard>

      <SectionLabel>ACTIVE DAYS</SectionLabel>
      <DayPicker selected={schedule.activeDays} onChange={activeDays => update({ activeDays })} />

      <GlassCard style={styles.reminderRow}>
        <View style={styles.reminderIconWrap}>
          <Bell size={15} color={INDIGO} strokeWidth={2} />
        </View>
        <View style={styles.reminderText}>
          <Text style={styles.reminderTitle}>Bedtime reminder</Text>
          <Text style={styles.reminderSub}>{schedule.reminderMinutes} min before bed</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            update({ reminderEnabled: !schedule.reminderEnabled });
          }}
          activeOpacity={0.8}
          style={[
            styles.switchTrack,
            {
              justifyContent: schedule.reminderEnabled ? 'flex-end' : 'flex-start',
              backgroundColor: schedule.reminderEnabled ? INDIGO : '#2A2460',
            },
          ]}
        >
          <View style={styles.switchThumb} />
        </TouchableOpacity>
      </GlassCard>

      <View style={styles.saveBtn}>
        <GradientCTA
          label="Save routine"
          onPress={() => void handleSave()}
          loading={saving}
          height={52}
          glowColor="rgba(108,99,255,0.34)"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 32 },
  loading: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xl },
  intro: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  scheduleCard: { marginBottom: spacing.md, borderRadius: 22 },
  scheduleInner: { padding: 16 },
  scheduleDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  durationCard: { marginBottom: spacing.md, gap: spacing.sm, paddingVertical: 14 },
  durationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  durationLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, color: colors.text.secondary },
  durationValue: { fontSize: 16, fontWeight: '700', color: INDIGO },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: INDIGO, borderRadius: 3 },
  reminderRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  reminderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INDIGO + '20',
  },
  reminderText: { flex: 1, gap: spacing.xs },
  reminderTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  reminderSub: { ...typography.caption, color: colors.text.secondary },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  saveBtn: { marginTop: 20, marginBottom: spacing.lg },
});
