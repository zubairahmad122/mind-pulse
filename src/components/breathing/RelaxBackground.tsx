import { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import type { BreathingPattern } from '@/constants/breathingPatterns';
import { BREATHING_PATTERNS } from '@/constants/breathingPatterns';

const { width: SW, height: SH } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

// ─── Orb configs (static) ────────────────────────────────────────────────────

interface OrbConfig { cx: number; cy: number; r: number; ampX: number; ampY: number; speed: number; phase: number }
interface RingConfig { cx: number; cy: number; r: number }

const ORB_CONFIGS: OrbConfig[] = [
  { cx: SW * 0.12, cy: SH * 0.15, r: 160, ampX: 20, ampY: 16, speed: 0.6, phase: 0 },
  { cx: SW * 0.82, cy: SH * 0.30, r: 200, ampX: 26, ampY: 14, speed: 0.4, phase: 1.8 },
  { cx: SW * 0.45, cy: SH * 0.60, r: 110, ampX: 14, ampY: 10, speed: 0.8, phase: 0.9 },
  { cx: SW * 0.22, cy: SH * 0.72, r: 90,  ampX: 12, ampY: 12, speed: 1.0, phase: 2.5 },
  { cx: SW * 0.88, cy: SH * 0.08, r: 70,  ampX: 8,  ampY: 6,  speed: 1.2, phase: 3.2 },
  { cx: SW * 0.68, cy: SH * 0.78, r: 75,  ampX: 10, ampY: 8,  speed: 0.7, phase: 0.5 },
];

const RING_CONFIGS: RingConfig[] = [
  { cx: SW * 0.30, cy: SH * 0.20, r: 200 },
  { cx: SW * 0.70, cy: SH * 0.50, r: 140 },
  { cx: SW * 0.15, cy: SH * 0.65, r: 100 },
  { cx: SW * 0.80, cy: SH * 0.85, r: 80 },
];

// ─── Individual floating orb ─────────────────────────────────────────────────

function FloatingOrb({ config, gradId, color, floatT }: {
  config: OrbConfig;
  gradId: string;
  color: string;
  floatT: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const angle = floatT.value * Math.PI * 2 * config.speed + config.phase;
    return {
      cx: config.cx + Math.sin(angle) * config.ampX,
      cy: config.cy + Math.cos(angle * 0.65) * config.ampY,
    } as any;
  });

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      r={config.r}
      fill={`url(#${gradId})`}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface RelaxBackgroundProps {
  pattern: BreathingPattern;
  isActive: boolean;
}

export function RelaxBackground({ pattern, isActive }: RelaxBackgroundProps) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const color = patternDef.color;

  // Shared values
  const floatT  = useSharedValue(0);
  const pulseBg = useSharedValue(1);
  const ringOp  = useSharedValue(0.3);

  useEffect(() => {
    // ── Slow drift for floating orbs ──
    floatT.value = withRepeat(
      withTiming(1, { duration: 40000, easing: Easing.linear }),
      -1,
      false,
    );

    // ── Breath-aware pulsing ──
    if (isActive) {
      const durIn = patternDef.phases.find(p => p.name === 'inhale')?.duration ?? 4;
      const durEx = patternDef.phases.find(p => p.name === 'exhale')?.duration ?? 4;
      const durHi = patternDef.phases.find(p => p.name === 'hold-in')?.duration ?? 0;
      const durHo = patternDef.phases.find(p => p.name === 'hold-out')?.duration ?? 0;

      if (durIn > 0 && durEx > 0) {
        pulseBg.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: durIn * 1000, easing: Easing.out(Easing.quad) }),
            ...(durHi > 0 ? [withTiming(1.08, { duration: durHi * 1000 })] : []),
            withTiming(0.92, { duration: durEx * 1000, easing: Easing.in(Easing.quad) }),
            ...(durHo > 0 ? [withTiming(0.92, { duration: durHo * 1000 })] : []),
          ),
          -1,
          true,
        );
      }
    } else {
      // Gentle idle sway
      pulseBg.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.97, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }

    // ── Ring opacity wave ──
    ringOp.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.10, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(floatT);
      cancelAnimation(pulseBg);
      cancelAnimation(ringOp);
    };
  }, [isActive, patternDef]);

  // ── Animated props for pulse and ring groups ──
  const pulseGroupProps = useAnimatedProps(() => ({
    transform: [{ scale: pulseBg.value }],
  } as any));

  const ringGroupProps = useAnimatedProps(() => {
    const s = 1 + interpolate(ringOp.value, [0.1, 0.55], [0, 0.05]);
    return { opacity: ringOp.value, transform: [{ scale: s }] } as any;
  });

  // Stable gradient IDs per orb
  const gradIds = useMemo(() => ORB_CONFIGS.map((_, i) => `orb-grad-${i}`), []);

  return (
    <Svg
      width={SW}
      height={SH}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        {ORB_CONFIGS.map((orb, i) => (
          <RadialGradient key={gradIds[i]} id={gradIds[i]} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <Stop offset="50%" stopColor={color} stopOpacity={0.06} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>

      {/* ── Layer 1: Sweeping glow orbs ── */}
      <AnimatedG animatedProps={pulseGroupProps}>
        {ORB_CONFIGS.map((orb, i) => (
          <FloatingOrb
            key={gradIds[i]}
            config={orb}
            gradId={gradIds[i]}
            color={color}
            floatT={floatT}
          />
        ))}
      </AnimatedG>

      {/* ── Layer 2: Subtle geometric rings ── */}
      <AnimatedG animatedProps={ringGroupProps}>
        {RING_CONFIGS.map((ring, i) => (
          <Circle
            key={`r-${i}`}
            cx={ring.cx}
            cy={ring.cy}
            r={ring.r}
            stroke={color}
            strokeWidth={1}
            strokeOpacity={0.12}
            fill="none"
          />
        ))}
      </AnimatedG>
    </Svg>
  );
}
