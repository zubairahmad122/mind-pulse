import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS, STATUS_COLORS, TYPOGRAPHY } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { startAccelerometerSensing, stopAccelerometerSensing } from '@/services/accelerometerSleepTracker';

type Props = {
  onComplete: () => void;
  onEmergencySkip?: () => void;
};

type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'completed';

const INHALE_DURATION = 4000;
const HOLD_DURATION = 2000;
const EXHALE_DURATION = 6000;
const MOVEMENT_THRESHOLD = 0.08; // Acceleration delta G-force threshold

// This is a Sleep-pillar screen — same frozen indigo as the rest of the
// Sleep tab. `colors.accent.purple` (the old identity color here) is
// actually blue (#1A8FFF), the same mislabeled token fixed elsewhere.
const ACCENT = PILLAR_COLORS.sleep;
const PHASE_COLOR: Record<BreathingPhase, string> = {
  idle: ACCENT,
  inhale: colors.accent.blue,
  hold: STATUS_COLORS.warning,
  exhale: ACCENT,
  completed: STATUS_COLORS.success,
};

export function BreatheToDismiss({ onComplete, onEmergencySkip }: Props) {
  const [phase, setPhase] = useState<BreathingPhase>('idle');
  const [cycle, setCycle] = useState<number>(1);
  const [msRemaining, setMsRemaining] = useState<number>(0);
  const [shakeDetected, setShakeDetected] = useState<boolean>(false);

  const scale = useSharedValue(1);
  const scaleGlow = useSharedValue(0.15);

  const phaseRef = useRef<BreathingPhase>('idle');
  const shakeRef = useRef<boolean>(false);

  // Sync ref with states for interval closures
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    shakeRef.current = shakeDetected;
  }, [shakeDetected]);

  // Accelerometer movement monitoring
  useEffect(() => {
    if (phase === 'idle' || phase === 'completed') {
      stopAccelerometerSensing();
      return;
    }

    const cleanup = startAccelerometerSensing(data => {
      // Check if user is shaking or moving the phone excessively
      if (data.magnitude > MOVEMENT_THRESHOLD) {
        if (!shakeRef.current) {
          setShakeDetected(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else {
        if (shakeRef.current) {
          setShakeDetected(false);
        }
      }
    }, 200); // Poll at 5Hz for responsive movement checking

    return () => {
      cleanup?.();
    };
  }, [phase]);

  const animateCircle = useCallback((targetScale: number, duration: number) => {
    scale.value = withTiming(targetScale, { duration });
    scaleGlow.value = withTiming(targetScale === 2.2 ? 0.35 : 0.15, { duration });
  }, [scale, scaleGlow]);

  const triggerNextPhase = useCallback(() => {
    const currentPhase = phaseRef.current;

    if (currentPhase === 'inhale') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase('hold');
      setMsRemaining(HOLD_DURATION);
      animateCircle(2.2, HOLD_DURATION);
    } else if (currentPhase === 'hold') {
      void Haptics.selectionAsync();
      setPhase('exhale');
      setMsRemaining(EXHALE_DURATION);
      animateCircle(1.0, EXHALE_DURATION);
    } else if (currentPhase === 'exhale') {
      if (cycle >= 3) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('completed');
        setTimeout(() => {
          onComplete();
        }, 800);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCycle(prev => prev + 1);
        setPhase('inhale');
        setMsRemaining(INHALE_DURATION);
        animateCircle(2.2, INHALE_DURATION);
      }
    }
  }, [cycle, onComplete, animateCircle]);

  // Phase controller interval
  useEffect(() => {
    if (phase === 'idle' || phase === 'completed') return;

    const interval = setInterval(() => {
      if (shakeRef.current) {
        // Pause timer if shake is detected
        return;
      }

      setMsRemaining(prev => {
        const next = prev - 100;
        if (next <= 0) {
          // Move to next phase
          triggerNextPhase();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, cycle, triggerNextPhase]);

  // Haptic ticks during inhale and exhale
  useEffect(() => {
    if (phase === 'idle' || phase === 'completed' || shakeDetected) return;

    // Trigger haptic feedback every second
    const secondsInterval = setInterval(() => {
      if (phase === 'inhale') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (phase === 'exhale') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, 1000);

    return () => clearInterval(secondsInterval);
  }, [phase, shakeDetected]);

  const startBreathing = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCycle(1);
    setPhase('inhale');
    setMsRemaining(INHALE_DURATION);
    animateCircle(2.2, INHALE_DURATION);
  };

  // Reanimated style for the breathing circle
  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: scaleGlow.value,
  }));

  const renderInstruction = () => {
    if (shakeDetected) {
      return (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>⚠️ Hold your phone still</Text>
          <Text style={styles.warningSub}>Focus on slow, steady chest movements.</Text>
        </View>
      );
    }

    switch (phase) {
      case 'idle':
        return (
          <View style={styles.textWrap}>
            <Text style={styles.instructionTitle}>Breathe to Dismiss</Text>
            <Text style={styles.instructionSub}>
              Silencing your alarm requires 3 rhythmic deep breaths. Hold your phone and focus.
            </Text>
          </View>
        );
      case 'inhale':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: PHASE_COLOR.inhale }]}>Inhale Slowly</Text>
            <Text style={styles.instructionSub}>Feel your lungs expand... ({Math.ceil(msRemaining / 1000)}s)</Text>
          </View>
        );
      case 'hold':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: PHASE_COLOR.hold }]}>Hold</Text>
            <Text style={styles.instructionSub}>Maintain the stillness... ({Math.ceil(msRemaining / 1000)}s)</Text>
          </View>
        );
      case 'exhale':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: PHASE_COLOR.exhale }]}>Exhale Fully</Text>
            <Text style={styles.instructionSub}>Let go of all tension... ({Math.ceil(msRemaining / 1000)}s)</Text>
          </View>
        );
      case 'completed':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: PHASE_COLOR.completed }]}>Peacefully Awake</Text>
            <Text style={styles.instructionSub}>Your day has started with clarity.</Text>
          </View>
        );
    }
  };

  return (
    <ScreenShell
      pillar="sleep"
      scroll={false}
      safeBottom
      contentStyle={styles.container}
      ambient={<AmbientBackground />}
    >
      {/* Header — same uppercase eyebrow label as every other section title */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="moon" size={13} color={ACCENT} />
          <Text style={styles.title}>MORNING RESET</Text>
        </View>
        {phase !== 'idle' && phase !== 'completed' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BREATH {cycle} / 3</Text>
          </View>
        )}
      </View>

      {/* Main Interactive Circle */}
      <View style={styles.circleContainer}>
        <Reanimated.View style={[styles.glowHalo, { backgroundColor: PHASE_COLOR[phase] }, animatedGlowStyle]} />
        <Reanimated.View
          style={[
            styles.outerCircle,
            { backgroundColor: PHASE_COLOR[phase] + '20', borderColor: PHASE_COLOR[phase] + '4D' },
            animatedCircleStyle,
          ]}
        >
          {phase === 'idle' ? (
            <TouchableOpacity onPress={startBreathing} style={styles.startBtnShell} activeOpacity={0.9}>
              <LinearGradient
                colors={[colors.accent.blue, ACCENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.innerCircle}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.sheen}
                />
                <Text style={styles.startEmoji}>🌬️</Text>
                <Text style={styles.startBtnText}>BEGIN</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.innerCircle, { backgroundColor: PHASE_COLOR[phase], shadowColor: PHASE_COLOR[phase] }]}>
              <Text style={styles.phaseEmoji}>
                {phase === 'inhale' && '🌸'}
                {phase === 'hold' && '⏳'}
                {phase === 'exhale' && '🍃'}
                {phase === 'completed' && '☀️'}
              </Text>
            </View>
          )}
        </Reanimated.View>
      </View>

      {/* Dynamic Guidance Texts */}
      <View style={styles.instructionContainer}>{renderInstruction()}</View>

      {/* Emergency Bypass */}
      {phase !== 'completed' && onEmergencySkip && (
        <TouchableOpacity style={styles.bypassBtn} onPress={onEmergencySkip} hitSlop={8}>
          <Text style={styles.bypassText}>Skip breathing (Emergency)</Text>
        </TouchableOpacity>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: 'rgba(255,255,255,0.6)',
  },
  badge: {
    backgroundColor: ACCENT + '26',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: ACCENT + '59',
  },
  badgeText: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  circleContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  outerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  startBtnShell: {
    width: 90,
    height: 90,
    borderRadius: 45,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  startEmoji: {
    fontSize: 26,
  },
  startBtnText: {
    fontFamily: FONTS.bodyBold,
    color: '#03212C',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 2,
  },
  phaseEmoji: {
    fontSize: 32,
  },
  instructionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    paddingHorizontal: spacing.md,
  },
  textWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  instructionTitle: {
    fontSize: TYPOGRAPHY.screenTitle.fontSize,
    fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
    color: TYPOGRAPHY.screenTitle.color,
    textAlign: 'center',
  },
  instructionSub: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: TYPOGRAPHY.subtitle.color,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  warningContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  warningText: {
    fontSize: 18,
    fontWeight: '700',
    color: STATUS_COLORS.warning,
  },
  warningSub: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bypassBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bypassText: {
    fontSize: 13,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
