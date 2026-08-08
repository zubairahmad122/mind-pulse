import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Line,
} from 'react-native-svg';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { useAuth } from '@/context/AuthContext';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { incrementBreaksTaken } from '@/services/dailyEyeGoalsPersistence';
import { recordBreakTaken } from '@/services/lastBreakPersistence';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS, STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { recordEyeBreakReminderEvent } from '@/services/eyeBreakReminderEvents';

const DEFAULT_DURATION = 20;
const EYE_ACCENT = PILLAR_COLORS.eye;
const RING_SIZE = 280;
const RING_STROKE = 6;

function breakDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = seconds / 60;
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** Rotating calm guidance lines — shown one at a time. */
const GUIDANCE_LINES = [
  'Look away from the screen',
  'Blink naturally',
  'Relax your face',
] as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Completion icon with subtle cyan ring expansion. */
function DoneIcon({ reducedMotion }: { reducedMotion: boolean }) {
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      ringScale.value = 1;
      ringOpacity.value = 0.5;
      checkOpacity.value = 1;
      return;
    }

    // Ring expansion
    ringScale.value = withTiming(1.2, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
    ringOpacity.value = withSequence(
      withTiming(0.6, { duration: 200 }),
      withTiming(0, { duration: 400 }),
    );

    // Check mark fade in
    checkOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [reducedMotion, ringScale, ringOpacity, checkOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  return (
    <View style={styles.doneIconWrap}>
      <Animated.View style={[styles.doneRing, ringStyle]} />
      <View style={styles.doneIcon}>
        <Animated.View style={checkStyle}>
          <Check size={40} color={STATUS_COLORS.success} strokeWidth={3} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Animated horizon scene — mountains, moon, subtle glow. */
function HorizonScene({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const glow = useSharedValue(0);
  const moonPulse = useSharedValue(1);

  useEffect(() => {
    if (!active || reducedMotion) {
      cancelAnimation(glow);
      cancelAnimation(moonPulse);
      glow.value = 0.6;
      moonPulse.value = 1;
      return;
    }

    // Slow horizon glow cycle
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Gentle moon pulse
    moonPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [active, reducedMotion, glow, moonPulse]);

  const moonProps = useAnimatedProps(() => ({
    scale: moonPulse.value,
    originX: 130,
    originY: 85,
  }));

  const glowProps = useAnimatedProps(() => ({
    opacity: glow.value * 0.5,
  }));

  // Mountain paths
  const mountainFar = 'M 0,180 L 50,120 Q 80,100 110,130 L 160,95 L 220,150 L 260,140 L 260,260 L 0,260 Z';
  const mountainNear = 'M 0,200 L 70,155 L 130,175 L 180,130 L 230,165 L 260,155 L 260,260 L 0,260 Z';

  return (
    <View style={styles.horizonContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 260 260">
        <Defs>
          {/* Deep sky gradient */}
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#060814" />
            <Stop offset="50%" stopColor="#0D1025" />
            <Stop offset="100%" stopColor="#1A1040" />
          </LinearGradient>

          {/* Moon glow */}
          <RadialGradient id="moonGlow" cx="130" cy="85" r="40">
            <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.6" />
            <Stop offset="50%" stopColor="#00E0FF" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0" />
          </RadialGradient>

          {/* Mountain gradients */}
          <LinearGradient id="mountFarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(100, 80, 180, 0.35)" />
            <Stop offset="100%" stopColor="#0A0C18" />
          </LinearGradient>
          <LinearGradient id="mountNearGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(60, 140, 180, 0.25)" />
            <Stop offset="100%" stopColor="#080A14" />
          </LinearGradient>

          {/* Horizon line glow */}
          <LinearGradient id="horizonGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#00E0FF" stopOpacity="0" />
            <Stop offset="50%" stopColor="#00E0FF" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#00E0FF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Sky base */}
        <Path d="M 0,0 L 260,0 L 260,260 L 0,260 Z" fill="url(#skyGrad)" />

        {/* Stars */}
        <Circle cx="45" cy="40" r="0.8" fill="#FFF" opacity="0.5" />
        <Circle cx="80" cy="28" r="1.2" fill="#FFF" opacity="0.7" />
        <Circle cx="180" cy="35" r="1" fill="#FFF" opacity="0.45" />
        <Circle cx="215" cy="55" r="0.8" fill="#FFF" opacity="0.6" />
        <Circle cx="155" cy="22" r="0.6" fill="#FFF" opacity="0.35" />

        {/* Moon glow */}
        <AnimatedCircle cx="130" cy="85" r="40" fill="url(#moonGlow)" animatedProps={glowProps} />

        {/* Moon */}
        <G animatedProps={moonProps}>
          <Circle cx="130" cy="85" r="10" fill="#E8F4FD" />
          <Circle cx="130" cy="85" r="7" fill="#FFF" opacity="0.85" />
        </G>

        {/* Far mountains */}
        <Path d={mountainFar} fill="url(#mountFarGrad)" />

        {/* Near mountains */}
        <Path d={mountainNear} fill="url(#mountNearGrad)" />

        {/* Horizon glow line */}
        <Line x1="20" y1="175" x2="240" y2="175" stroke="url(#horizonGlow)" strokeWidth="1.5" />
      </Svg>
    </View>
  );
}

/** Circular progress ring with timer inside. */
function ProgressRing({
  size,
  strokeWidth,
  duration,
  secondsLeft,
  active,
  reducedMotion,
}: {
  size: number;
  strokeWidth: number;
  duration: number;
  secondsLeft: number;
  active: boolean;
  reducedMotion: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute progress directly from clock state — no animation needed
  const progressFraction = active ? Math.max(0, Math.min(1, 1 - secondsLeft / duration)) : 0;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={EYE_ACCENT} stopOpacity="1" />
            <Stop offset="100%" stopColor={EYE_ACCENT} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Timer inside */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerValue}>{secondsLeft}</Text>
        <Text style={styles.timerUnit}>seconds</Text>
      </View>

      {/* Horizon scene inside ring */}
      <View style={styles.horizonOverlay} pointerEvents="none">
        <HorizonScene active={active} reducedMotion={reducedMotion} />
      </View>
    </View>
  );
}

export default function EyeBreakScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string;
    notificationId?: string;
    duration?: string;
  }>();
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

  // Parse duration
  const parsedDuration = Number(params.duration);
  const breakSeconds =
    Number.isFinite(parsedDuration) && parsedDuration >= 20 && parsedDuration <= 300
      ? Math.round(parsedDuration)
      : DEFAULT_DURATION;

  const [done, setDone] = useState(false);
  const [lifecyclePaused, setLifecyclePaused] = useState(false);
  const [guidanceIndex, setGuidanceIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const reminderResolvedRef = useRef(false);
  const fromReminder = params.source === 'reminder';

  const { isBackgrounded } = useSessionLifecycle({
    onPause: () => setLifecyclePaused(true),
    onResume: () => setLifecyclePaused(true),
  });

  const completeBreak = useCallback(() => {
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

  const { secondsLeft } = useSessionClock({
    totalSeconds: breakSeconds,
    running: !done && !isBackgrounded,
    paused: lifecyclePaused,
    resetKey: `break-${breakSeconds}`,
    onComplete: completeBreak,
  });

  // Soft landing haptic
  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Rotate guidance lines (unless reduced motion)
  useEffect(() => {
    if (reducedMotion || done) return;
    const interval = setInterval(() => {
      setGuidanceIndex(i => (i + 1) % GUIDANCE_LINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [reducedMotion, done]);

  // Guidance fade animation
  const guidanceOpacity = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) {
      guidanceOpacity.value = 1;
      return;
    }
    guidanceOpacity.value = 0;
    guidanceOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [guidanceIndex, reducedMotion, guidanceOpacity]);

  const guidanceStyle = useAnimatedStyle(() => ({
    opacity: guidanceOpacity.value,
  }));

  return (
    <ScreenShell scroll={false} pillar="eye" contentStyle={styles.root} ambient={<AmbientBackground subtle />}>
      {/* Header — only show during active state */}
      {!done && (
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EYE BREAK</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {!done ? (
        <>
          {/* Progress ring with horizon scene inside */}
          <ProgressRing
            size={RING_SIZE}
            strokeWidth={RING_STROKE}
            duration={breakSeconds}
            secondsLeft={secondsLeft}
            active={!lifecyclePaused}
            reducedMotion={reducedMotion}
          />

          {/* Main instruction */}
          <Text style={styles.instruction}>Look into the distance</Text>
          <Text style={styles.instructionSub}>
            Let your focus soften for the remaining break.
          </Text>

          {/* Rotating calm guidance */}
          <Animated.View style={[styles.guidanceContainer, guidanceStyle]}>
            <Text style={styles.guidanceText}>
              {GUIDANCE_LINES[guidanceIndex]}
            </Text>
          </Animated.View>

          {/* How this break works — accordion */}
          <TouchableOpacity
            style={styles.infoToggle}
            onPress={() => setShowInfo(!showInfo)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.infoToggleText}>How this break works</Text>
            {showInfo ? (
              <ChevronUp size={14} color={EYE_ACCENT} strokeWidth={2.2} />
            ) : (
              <ChevronDown size={14} color={EYE_ACCENT} strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {showInfo && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {breakSeconds === 20 ? 'THE 20-20-20 RULE' : 'WHY A LONGER BREAK'}
              </Text>
              <Text style={styles.infoText}>
                {breakSeconds === 20
                  ? 'Every 20 minutes, look at something 20 feet away for 20 seconds. It gives your focusing muscles a real break from screens.'
                  : 'A longer break — stand up, stretch, and give your eyes a full rest from screens.'}
              </Text>
            </View>
          )}

          {/* Skip break — subtle text action */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip break</Text>
          </TouchableOpacity>

          {/* Lifecycle pause overlay */}
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
        /* Completed state — no close button, content moved up */
        <View style={styles.doneContainer}>
          <DoneIcon reducedMotion={reducedMotion} />
          <Text style={styles.doneTitle}>Break complete</Text>
          <Text style={styles.doneSub}>
            Your {breakDurationLabel(breakSeconds)} distance break is complete.
          </Text>
          <Text style={styles.doneSub}>
            Take a moment before returning to your screen.
          </Text>
          <GradientCTA
            label="Done"
            onPress={() => router.back()}
            textColor="#03212C"
            style={styles.doneCta}
          />
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  header: {
    position: 'absolute',
    top: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: EYE_ACCENT,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Progress ring */
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  timerValue: {
    fontFamily: FONTS.heading,
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  timerUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginTop: -4,
  },
  horizonOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  horizonContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: RING_SIZE / 2,
  },
  /* Instructions */
  instruction: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  instructionSub: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  /* Guidance */
  guidanceContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_ACCENT + '10',
    borderWidth: 1,
    borderColor: EYE_ACCENT + '25',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: EYE_ACCENT,
  },
  /* Info accordion */
  infoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.button,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  infoToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  infoCard: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  infoTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: EYE_ACCENT,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
  },
  /* Skip */
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  /* Paused overlay */
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
  /* Done state */
  doneContainer: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  doneIconWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: EYE_ACCENT,
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
    fontFamily: FONTS.heading,
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
