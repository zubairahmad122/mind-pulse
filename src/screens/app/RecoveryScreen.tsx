import { useEffect, useRef, useState } from 'react';
import { CheckCircle, ChevronRight, Eye, Moon, Smartphone, Timer, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { COLORS } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { saveRecoverySession } from '@/services/recoveryPersistence';

interface RecoveryOption {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  seconds: number;
}

const OPTIONS: RecoveryOption[] = [
  {
    id: 'no-phone',
    icon: Smartphone,
    iconColor: '#f97316',
    title: '20 min no phone',
    subtitle: 'Phone down, brain up',
    durationLabel: '20 min',
    seconds: 20 * 60,
  },
  {
    id: 'eye-break',
    icon: Eye,
    iconColor: '#6ee7b7',
    title: 'Eye break (20-20-20)',
    subtitle: 'Look away, recover fast',
    durationLabel: '20 sec',
    seconds: 20,
  },
  {
    id: 'focus',
    icon: Timer,
    iconColor: '#f59e0b',
    title: 'Focus session',
    subtitle: 'Deep work mode',
    durationLabel: '25 min',
    seconds: 25 * 60,
  },
  {
    id: 'sleep-prep',
    icon: Moon,
    iconColor: COLORS.purpleLight,
    title: 'Sleep prep mode',
    subtitle: 'Wind down for tonight',
    durationLabel: '30 min',
    seconds: 30 * 60,
  },
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecoveryScreen() {
  const { user } = useAuth();
  const [activeOption, setActiveOption] = useState<RecoveryOption | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (option: RecoveryOption) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveOption(option);
    setTimeLeft(option.seconds);
    setDone(false);
  };

  useEffect(() => {
    if (!activeOption || done) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setDone(true);
          if (user?.uid && activeOption) {
            void saveRecoverySession(user.uid, {
              type: activeOption.id,
              durationSeconds: activeOption.seconds,
              completedAt: Date.now(),
            });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeOption?.id]);

  const cancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveOption(null);
    setDone(false);
    setTimeLeft(0);
  };

  if (activeOption) {
    const ActiveIcon = activeOption.icon;
    return (
      <SafeAreaView style={styles.timerScreen} edges={['top', 'bottom']}>
        <AnimatedBackground />
        <View style={styles.timerContent}>
          <ActiveIcon
            size={52}
            color={activeOption.iconColor}
          />
          <Text style={styles.timerTitle}>{activeOption.title}</Text>
          <Text style={styles.timerSub}>{activeOption.subtitle}</Text>

          {done ? (
            <View style={styles.doneWrap}>
              <CheckCircle size={80} color="#6ee7b7" />
              <Text style={styles.doneText}>Done! Great work.</Text>
            </View>
          ) : (
            <View style={[styles.timerRing, { borderColor: activeOption.iconColor }]}>
              <Text style={[styles.timerNumber, { color: activeOption.iconColor }]}>
                {formatTime(timeLeft)}
              </Text>
              {activeOption.seconds >= 60 && (
                <Text style={styles.timerUnit}>remaining</Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={cancel} activeOpacity={0.8}>
            <Text style={styles.cancelText}>{done ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenShell>
      <Text style={styles.header}>Recovery Mode</Text>
      <Text style={styles.subtitle}>Small actions. Real impact.</Text>

      {OPTIONS.map(opt => {
        const OptIcon = opt.icon;
        return (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionCard}
            onPress={() => startTimer(opt)}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: opt.iconColor + '1a' }]}>
              <OptIcon size={26} color={opt.iconColor} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>{opt.title}</Text>
              <Text style={styles.optionSub}>{opt.subtitle}</Text>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.optionDurationText}>{opt.durationLabel}</Text>
              <ChevronRight size={14} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: { flex: 1, gap: 3 },
  optionTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '700',
  },
  optionSub: { ...typography.body, color: colors.text.secondary },
  optionRight: {
    alignItems: 'center',
    gap: 4,
  },
  optionDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.purpleLight,
  },
  // Timer full-screen
  timerScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  timerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  timerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  timerSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  timerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: spacing.lg,
  },
  timerNumber: {
    fontSize: 56,
    fontWeight: '900',
  },
  timerUnit: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  doneWrap: {
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  doneText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6ee7b7',
  },
  cancelBtn: {
    backgroundColor: colors.background.card,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
