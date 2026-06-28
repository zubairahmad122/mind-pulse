import { AIRecommendation } from '@/components/home/AIRecommendation';
import { DayPicker } from '@/components/sleep/DayPicker';
import { RoutineSkeleton } from '@/components/sleep/Skeletons';
import { TimePickerRow } from '@/components/sleep/TimePickerRow';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useSleepRecommendation } from '@/hooks/useSleepRecommendation';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { SleepSchedule } from '@/types/sleep.types';
import { calculateSleepDurationHours } from '@/utils/formatTime';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// The legacy `colors.accent.purple` token is actually blue (#1A8FFF); use the
// real theme purple so this screen matches the rest of the app.
const PURPLE = '#8B5CF6';
const BLUE = '#3B82F6';

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
      <AIRecommendation message={routineInsight} loading={recommendationLoading} />

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
              backgroundColor: schedule.reminderEnabled ? PURPLE : '#252542',
            },
          ]}
        >
          <View style={styles.switchThumb} />
        </TouchableOpacity>
      </GlassCard>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
        style={styles.saveBtn}
      >
        <LinearGradient
          colors={[PURPLE, BLUE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveGradient}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveLabel}>Save routine</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 120 },
  loading: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xl },
  intro: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  durationCard: { marginBottom: spacing.md, gap: spacing.sm },
  durationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  durationLabel: { ...typography.label, color: colors.text.secondary },
  durationValue: { ...typography.headingSmall, color: PURPLE, fontWeight: '800' },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 5 },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  reminderRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reminderText: { flex: 1, gap: spacing.xs },
  reminderTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  reminderSub: { ...typography.caption, color: colors.text.secondary },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  saveBtn: { marginTop: spacing.xl, marginBottom: spacing.lg, borderRadius: 16, overflow: 'hidden' },
  saveGradient: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    ...typography.bodyLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
