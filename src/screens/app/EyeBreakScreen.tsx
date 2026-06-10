import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { incrementBreaksTaken } from '@/services/dailyEyeGoalsPersistence';
import { recordBreakTaken } from '@/services/lastBreakPersistence';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpandingCircleGuide } from '@/components/eye/animations/ExpandingCircleGuide';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const DURATION = 20;

export default function EyeBreakScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (done) return;
    if (secondsLeft <= 0) {
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void recordBreakTaken(user?.uid ?? undefined);
      void incrementBreaksTaken(user?.uid ?? undefined);
      return;
    }
    timerRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [secondsLeft, done]);

  return (
    <SafeAreaView style={styles.root}>
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
          <Ionicons name="checkmark-circle" size={56} color="#6ee7b7" />
          <Text style={styles.title}>Break complete</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#02020D', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.lg },
  closeBtn: { position: 'absolute', top: spacing.xl, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontSize: 14, color: colors.text.secondary, fontWeight: '600', letterSpacing: 1 },
  timer: { fontSize: 48, fontWeight: '900', color: colors.text.primary },
  guideWrap: {},
  instruction: { fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  title: { ...typography.headingMedium, color: colors.text.primary, textAlign: 'center' },
  doneBtn: { backgroundColor: colors.accent.purple, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: 100 },
  doneBtnText: { ...typography.bodyLarge, color: '#FFFFFF', fontWeight: '700' },
});
