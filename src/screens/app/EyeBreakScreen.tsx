import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Droplets, Eye, Smile, Check } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ExpandingCircleGuide } from '@/components/eye/animations/ExpandingCircleGuide';
import { StepCountdownRing } from '@/components/eye/animations/StepCountdownRing';
import { useAuth } from '@/context/AuthContext';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { incrementBreaksTaken } from '@/services/dailyEyeGoalsPersistence';
import { recordBreakTaken } from '@/services/lastBreakPersistence';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS, RADIUS, STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { recordEyeBreakReminderEvent } from '@/services/eyeBreakReminderEvents';

const DEFAULT_DURATION = 20;
const EYE_ACCENT = PILLAR_COLORS.eye;

function breakDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = seconds / 60;
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** The three micro-steps of a healthy look-away break. */
const BREAK_STEPS = [
  { icon: Eye, label: 'Look away' },
  { icon: Droplets, label: 'Blink gently' },
  { icon: Smile, label: 'Relax your face' },
] as const;

export default function EyeBreakScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string;
    notificationId?: string;
    duration?: string;
  }>();
  const { user } = useAuth();
  // The companion passes its configured break length (20s / 1m / 2m / 5m).
  const parsedDuration = Number(params.duration);
  const breakSeconds =
    Number.isFinite(parsedDuration) && parsedDuration >= 20 && parsedDuration <= 300
      ? Math.round(parsedDuration)
      : DEFAULT_DURATION;
  const [done, setDone] = useState(false);
  // Force-paused by the lifecycle (app backgrounded / phone locked) — the
  // clock freezes and a resume overlay appears when the user returns.
  const [lifecyclePaused, setLifecyclePaused] = useState(false);
  const reminderResolvedRef = useRef(false);
  const fromReminder = params.source === 'reminder';

  const { isBackgrounded } = useSessionLifecycle({
    onPause: () => setLifecyclePaused(true),
    // Keep the break paused on return — the user resumes deliberately.
    onResume: () => setLifecyclePaused(true),
  });

  const completeBreak = useCallback(() => {
    // Never score a break while the app is backgrounded or locked.
    if (isBackgrounded) return;
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
  }, [isBackgrounded, fromReminder, params.notificationId, user?.uid]);

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

  // Wall-clock countdown: Date.now-based, frozen while lifecycle-paused, so a
  // backgrounded break never "completes" (and never scores) in the background.
  // Completion fires from the clock only while foregrounded and unpaused; if
  // the budget freezes at 0 during a background transition, the tick effect
  // re-fires completion the moment the user resumes.
  const { secondsLeft } = useSessionClock({
    totalSeconds: breakSeconds,
    // Never tick while the app is backgrounded (covers screens that mount
    // already in the background, e.g. opened from a break notification).
    running: !done && !isBackgrounded,
    paused: lifecyclePaused,
    resetKey: `break-${breakSeconds}`,
    onComplete: completeBreak,
  });

  // Soft landing haptic so the break start feels intentional.
  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Quiet coaching that shifts halfway through the break.
  const coachingLine =
    secondsLeft > breakSeconds / 2
      ? 'Let your focus soften into the distance.'
      : 'Blink naturally — relax your face and jaw.';

  return (
    <ScreenShell scroll={false} pillar="eye" contentStyle={styles.root} ambient={<AmbientBackground subtle />}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      {!done ? (
        <>
          <Text style={styles.eyebrow}>EYE BREAK</Text>

          {/* Countdown ring wraps the horizon scene — the ring fills as the
              break completes, the scene teaches the user what to do. */}
          <StepCountdownRing
            size={284}
            strokeWidth={8}
            duration={breakSeconds}
            active
            paused={lifecyclePaused}
            resetKey={`break-${breakSeconds}`}
            color={EYE_ACCENT}
            trackColor="rgba(255,255,255,0.07)"
          >
            <ExpandingCircleGuide active />
          </StepCountdownRing>

          <View style={styles.timerPill}>
            <Text style={styles.timerPillValue}>{secondsLeft}</Text>
            <Text style={styles.timerPillUnit}>s left</Text>
          </View>

          <Text style={styles.coaching}>{coachingLine}</Text>

          {/* The three micro-steps, one glance */}
          <View style={styles.stepsRow}>
            {BREAK_STEPS.map(step => {
              const StepIcon = step.icon;
              return (
                <View key={step.label} style={styles.stepChip}>
                  <StepIcon size={13} color={EYE_ACCENT} strokeWidth={2.2} />
                  <Text style={styles.stepChipText}>{step.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Why this exists — the 20-20-20 rule (or a longer-break note) */}
          <View style={styles.ruleCard}>
            <Text style={styles.ruleTitle}>
              {breakSeconds === 20 ? 'THE 20-20-20 RULE' : 'WHY A LONGER BREAK'}
            </Text>
            <Text style={styles.ruleText}>
              {breakSeconds === 20
                ? 'Every 20 minutes, look at something 20 feet away for 20 seconds. It gives your focusing muscles a real break from screens.'
                : 'A longer break — stand up, stretch, and give your eyes a full rest from screens.'}
            </Text>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip break</Text>
          </TouchableOpacity>

          {/* Lifecycle pause overlay — shown when returning from background. */}
          {lifecyclePaused && (
            <View style={styles.pausedOverlay}>
              <Text style={styles.pausedTitle}>Break paused</Text>
              <Text style={styles.pausedSub}>
                Your eyes were away from the screen — pick up where you left
                off whenever you&apos;re ready.
              </Text>
              <GradientCTA
                label="Resume Break"
                onPress={() => setLifecyclePaused(false)}
                textColor="#03212C"
                style={styles.pausedCta}
              />
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.doneIcon}>
            <Check size={40} color={STATUS_COLORS.success} strokeWidth={3} />
          </View>
          <Text style={styles.doneTitle}>Break complete</Text>
          <Text style={styles.doneSub}>
            Your eyes just got {breakDurationLabel(breakSeconds)} of real distance. Nice one.
          </Text>
          <GradientCTA label="Done" onPress={() => router.back()} textColor="#03212C" style={styles.doneCta} />
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(9,9,15,0.96)',
    borderRadius: RADIUS.card,
    zIndex: 20,
  },
  pausedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  pausedSub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  pausedCta: { minWidth: 220, marginTop: 6 },
  closeBtn: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: EYE_ACCENT,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.button,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerPillValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  timerPillUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  coaching: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 24,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_ACCENT + '0F',
    borderWidth: 1,
    borderColor: EYE_ACCENT + '2E',
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.85)',
  },
  ruleCard: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  ruleTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: EYE_ACCENT,
  },
  ruleText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  doneIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STATUS_COLORS.success + '14',
    borderWidth: 1,
    borderColor: STATUS_COLORS.success + '38',
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  doneCta: { minWidth: 200 },
});
