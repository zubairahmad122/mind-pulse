import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
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
            <Text style={[styles.instructionTitle, { color: colors.accent.blue }]}>Inhale Slowly</Text>
            <Text style={styles.instructionSub}>Feel your lungs expand... ({Math.ceil(msRemaining / 1000)}s)</Text>
          </View>
        );
      case 'hold':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: colors.status.warning }]}>Hold</Text>
            <Text style={styles.instructionSub}>Maintain the stillness... ({Math.ceil(msRemaining / 1000)}s)</Text>
          </View>
        );
      case 'exhale':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: colors.accent.purple }]}>Exhale Fully</Text>
            <Text style={styles.instructionSub}>Let go of all tension... ({Math.ceil(msRemaining / 1000)}s)</Text>
          </View>
        );
      case 'completed':
        return (
          <View style={styles.textWrap}>
            <Text style={[styles.instructionTitle, { color: colors.status.success }]}>Peacefully Awake</Text>
            <Text style={styles.instructionSub}>Your day has started with clarity.</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>AuraSync Reset</Text>
        {phase !== 'idle' && phase !== 'completed' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BREATH {cycle} / 3</Text>
          </View>
        )}
      </View>

      {/* Main Interactive Circle */}
      <View style={styles.circleContainer}>
        <Reanimated.View style={[styles.glowHalo, animatedGlowStyle]} />
        <Reanimated.View style={[styles.outerCircle, animatedCircleStyle]}>
          <View style={styles.innerCircle}>
            {phase === 'idle' ? (
              <TouchableOpacity onPress={startBreathing} style={styles.startBtn}>
                <Text style={styles.startEmoji}>🌬️</Text>
                <Text style={styles.startBtnText}>BEGIN</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.phaseEmoji}>
                {phase === 'inhale' && '🌸'}
                {phase === 'hold' && '⏳'}
                {phase === 'exhale' && '🍃'}
                {phase === 'completed' && '☀️'}
              </Text>
            )}
          </View>
        </Reanimated.View>
      </View>

      {/* Dynamic Guidance Texts */}
      <View style={styles.instructionContainer}>{renderInstruction()}</View>

      {/* Emergency Bypass */}
      {phase !== 'completed' && onEmergencySkip && (
        <TouchableOpacity style={styles.bypassBtn} onPress={onEmergencySkip}>
          <Text style={styles.bypassText}>Skip breathing (Emergency)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  title: {
    ...typography.headingMedium,
    color: colors.text.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: colors.accent.purpleLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.accent.purpleBorder,
  },
  badgeText: {
    ...typography.label,
    color: colors.accent.purple,
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
    backgroundColor: colors.accent.purple,
  },
  outerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(123, 97, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: colors.accent.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.accent.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  startBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  startEmoji: {
    fontSize: 28,
  },
  startBtnText: {
    color: '#fff',
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
    ...typography.headingLarge,
    color: colors.text.primary,
    fontSize: 28,
    textAlign: 'center',
  },
  instructionSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  warningContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  warningText: {
    ...typography.headingMedium,
    color: colors.status.warning,
    fontWeight: '700',
  },
  warningSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bypassBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bypassText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
