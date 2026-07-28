import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ExpandingCircleGuide } from '@/components/eye/animations/ExpandingCircleGuide';
import { useAuth } from '@/context/AuthContext';
import { incrementBreaksTaken } from '@/services/dailyEyeGoalsPersistence';
import { recordBreakTaken } from '@/services/lastBreakPersistence';
import { colors } from '@/constants/colors';
import { STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { recordEyeBreakReminderEvent } from '@/services/eyeBreakReminderEvents';

const DURATION = 20;

export default function EyeBreakScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string;
    notificationId?: string;
  }>();
  const { user } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reminderResolvedRef = useRef(false);
  const fromReminder = params.source === 'reminder';

  const completeBreak = useCallback(() => {
    setDone(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void recordBreakTaken(user?.uid ?? undefined);
    void incrementBreaksTaken(user?.uid ?? undefined);
    if (fromReminder && !reminderResolvedRef.current) {
      reminderResolvedRef.current = true;
      void recordEyeBreakReminderEvent(user?.uid, {
        type: 'completed',
        occurredAt: Date.now(),
        notificationId: params.notificationId,
      });
    }
  }, [fromReminder, params.notificationId, user?.uid]);

  useEffect(() => {
    return () => {
      if (!fromReminder || reminderResolvedRef.current) return;
      reminderResolvedRef.current = true;
      void recordEyeBreakReminderEvent(user?.uid, {
        type: 'abandoned',
        occurredAt: Date.now(),
        notificationId: params.notificationId,
      });
    };
  }, [fromReminder, params.notificationId, user?.uid]);

  useEffect(() => {
    if (done) return;
    timerRef.current = setTimeout(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0);
        completeBreak();
      } else {
        setSecondsLeft(current => current - 1);
      }
    }, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [secondsLeft, done, completeBreak]);

  return (
    <ScreenShell scroll={false} pillar="eye" contentStyle={styles.root} ambient={<AmbientBackground subtle />}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      {!done ? (
        <>
          <Text style={styles.topLabel}>Eye Break</Text>
          <Text style={styles.timer}>{secondsLeft}s</Text>
          <View style={styles.guideWrap}><ExpandingCircleGuide active /></View>
          <Text style={styles.instruction}>Look 20 feet away</Text>
        </>
      ) : (
        <>
          <Ionicons name="checkmark-circle" size={56} color={STATUS_COLORS.success} />
          <Text style={styles.title}>Break complete</Text>
          <GradientCTA label="Done" onPress={() => router.back()} textColor="#03212C" style={styles.doneCta} />
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  closeBtn: { position: 'absolute', top: spacing.xl, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontSize: 14, color: colors.text.secondary, fontWeight: '600', letterSpacing: 1 },
  timer: { fontSize: 48, fontWeight: '900', color: colors.text.primary },
  guideWrap: {},
  instruction: { fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  title: { ...typography.headingMedium, color: colors.text.primary, textAlign: 'center' },
  doneCta: { minWidth: 200 },
});
