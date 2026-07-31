import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SessionCompleteOverlay } from '@/components/eye/SessionCompleteOverlay';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getEyeActivity } from '@/constants/eyeRelax';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS, STATUS_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSessionKeepAwake } from '@/hooks/useSessionKeepAwake';

const EYE_ACCENT = PILLAR_COLORS.eye;

export default function EyeExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = id ? getEyeActivity(id) : undefined;
  const [secondsLeft, setSecondsLeft] = useState(exercise?.durationSeconds ?? 60);
  const [running, setRunning] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  useSessionKeepAwake(running && secondsLeft > 0, 'mindpulse-eye-exercise');
  const justCompletedRef = useRef(false);

  const sessionOpacity = useSharedValue(0);
  const sessionTranslateY = useSharedValue(30);

  useEffect(() => {
    sessionOpacity.value = withTiming(1, { duration: 400 });
    sessionTranslateY.value = withSpring(0, { damping: 16, stiffness: 100 });
  }, []);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const t = setTimeout(() => {
      const next = secondsLeft - 1;
      if (next === 0 && !justCompletedRef.current) {
        justCompletedRef.current = true;
        setShowComplete(true);
      }
      setSecondsLeft(next);
    }, 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: sessionOpacity.value,
    transform: [{ translateY: sessionTranslateY.value }],
  }));

  if (!exercise) {
    return (
      <ScreenShell scroll={false} safeBottom pillar="eye" ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="Exercise" showBack />
        <Text style={styles.missing}>Not found</Text>
      </ScreenShell>
    );
  }

  const activeExercise = exercise;
  const isDone = secondsLeft === 0;

  const handleRestart = () => {
    setSecondsLeft(activeExercise.durationSeconds);
    justCompletedRef.current = false;
    setShowComplete(false);
    setRunning(true);
  };

  return (
    <ScreenShell scroll={false} safeBottom pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenHeader title={exercise.title} subtitle={exercise.subtitle} showBack />

      <Animated.View style={[styles.center, animStyle]}>
        {/* Exercise guide circle */}
        <View style={styles.guideCircle}>
          <Text style={styles.guideEmoji}>{exercise.emoji}</Text>
          <Text style={[styles.guideTimer, isDone && styles.timerDone]}>
            {isDone ? '✓' : `${secondsLeft}s`}
          </Text>
        </View>

        <Text style={styles.description}>{exercise.description}</Text>

        {/* Controls */}
        <View style={styles.simpleControls}>
          {isDone ? (
            <GradientCTA label="Restart" onPress={handleRestart} textColor="#03212C" />
          ) : (
            <GradientCTA
              label={running ? 'Pause' : 'Start'}
              onPress={() => setRunning(r => !r)}
              textColor="#03212C"
            />
          )}
        </View>
      </Animated.View>

      <SessionCompleteOverlay visible={showComplete} onDone={() => setShowComplete(false)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  guideCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: EYE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,224,255,0.12)',
    gap: spacing.sm,
  },
  guideEmoji: { fontSize: 48 },
  guideTimer: { ...typography.headingLarge, color: colors.text.primary },
  timerDone: { color: STATUS_COLORS.success },
  description: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  simpleControls: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  missing: { ...typography.body, color: colors.text.secondary },
});
