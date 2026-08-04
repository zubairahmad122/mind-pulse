import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PILLAR_COLORS } from '@/constants/designSystem';
import type { PathShape } from '@/utils/pathLockEngine';

const EYE = PILLAR_COLORS.eye;
const FIELD_SIZE = 280;
const TARGET_SIZE = 56;

interface Props {
  shape: PathShape;
  cycleMs: number;
  lockWindowMs: number;
  onTapField: () => void;
  disabled?: boolean;
  reducedMotion?: boolean;
}

/**
 * Path Lock's canvas — a single target continuously traveling a path, with
 * a glow ring that fills in as it approaches its lock window. Tapping
 * anywhere in the field counts (timing-gated, not position-gated, per
 * spec) — the whole field is one large touch target, well above 48dp.
 */
export function PathLockTarget({ shape, cycleMs, lockWindowMs, onTapField, disabled = false, reducedMotion = false }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: reducedMotion ? cycleMs * 1.6 : cycleMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shape, cycleMs, reducedMotion]);

  const lockThreshold = 1 - lockWindowMs / cycleMs;
  const locked = useDerivedValue(() => progress.value >= lockThreshold);

  const dotStyle = useAnimatedStyle(() => {
    const t = progress.value * Math.PI * 2;
    let nx: number;
    let ny: number;
    if (shape === 'circle') {
      nx = 0.5 + 0.38 * Math.cos(t);
      ny = 0.5 + 0.38 * Math.sin(t);
    } else {
      const denom = 1 + Math.sin(t) * Math.sin(t);
      nx = 0.5 + (0.4 * Math.cos(t)) / denom;
      ny = 0.5 + (0.25 * Math.sin(t) * Math.cos(t)) / denom;
    }
    return {
      left: nx * FIELD_SIZE - TARGET_SIZE / 2,
      top: ny * FIELD_SIZE - TARGET_SIZE / 2,
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, Math.max(0, lockThreshold - 0.15), lockThreshold, 1], [0.25, 0.25, 1, 1]),
    transform: [{ scale: locked.value ? 1.15 : 1 }],
  }));

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Lock target"
      disabled={disabled}
      activeOpacity={1}
      onPress={onTapField}
      style={styles.field}
    >
      <View style={styles.trailHint} pointerEvents="none" />
      <Animated.View style={[styles.target, dotStyle]} pointerEvents="none">
        <Animated.View style={[styles.glowRing, glowStyle]} />
        <View style={styles.dot} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  field: {
    width: FIELD_SIZE, height: FIELD_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  trailHint: {
    position: 'absolute', width: FIELD_SIZE * 0.76, height: FIELD_SIZE * 0.76,
    borderRadius: FIELD_SIZE, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  target: { position: 'absolute', width: TARGET_SIZE, height: TARGET_SIZE, alignItems: 'center', justifyContent: 'center' },
  glowRing: {
    position: 'absolute', width: TARGET_SIZE, height: TARGET_SIZE, borderRadius: TARGET_SIZE / 2,
    borderWidth: 2, borderColor: EYE,
    shadowColor: EYE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10,
  },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: EYE },
});
