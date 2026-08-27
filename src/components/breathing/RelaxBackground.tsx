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
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  G,
  Path,
} from 'react-native-svg';
import type { BreathingPattern } from '@/constants/breathingPatterns';
import { BREATHING_PATTERNS } from '@/constants/breathingPatterns';
import { PILLAR_COLORS } from '@/constants/designSystem';

const { width: SW, height: SH } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Intentional ambient composition (not a random scatter of circles): a
 * handful of very soft radial lights — mostly the session's own accent, one
 * restrained violet for depth — plus one or two thin flowing contour lines.
 * Nature feeling comes from the slow drift and low opacity, not from more shapes.
 */
interface OrbConfig { cx: number; cy: number; r: number; ampX: number; ampY: number; speed: number; phase: number; violet?: boolean }

const ORB_CONFIGS: OrbConfig[] = [
  { cx: SW * 0.16, cy: SH * 0.16, r: 210, ampX: 16, ampY: 12, speed: 0.5, phase: 0 },
  { cx: SW * 0.85, cy: SH * 0.3, r: 170, ampX: 18, ampY: 10, speed: 0.35, phase: 1.6, violet: true },
  { cx: SW * 0.4, cy: SH * 0.86, r: 190, ampX: 14, ampY: 10, speed: 0.6, phase: 2.6 },
];

/** Two thin flowing wave lines — a soft dark-water / moonlight contour, not decoration-for-its-own-sake. */
const WAVE_CONFIGS = [
  { y: SH * 0.38, amp: 46 },
  { y: SH * 0.68, amp: 34 },
];

function wavePath(y: number, amp: number): string {
  const w = SW;
  return `M -40 ${y} C ${w * 0.15} ${y - amp}, ${w * 0.35} ${y + amp}, ${w * 0.5} ${y} S ${w * 0.85} ${y - amp}, ${w + 40} ${y}`;
}

// ─── Individual floating orb ─────────────────────────────────────────────────

function FloatingOrb({ config, gradId, floatT }: {
  config: OrbConfig;
  gradId: string;
  floatT: SharedValue<number>;
}) {
  // Reanimated animatedProps needs `as any` — RN Web types are too strict
  // for drive-by animated SVG coordinate values.
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
  accentColor?: string;
  /** Active-session background reuses the same composition, slightly darker. */
  dimmed?: boolean;
}

export function RelaxBackground({ pattern, isActive, accentColor, dimmed }: RelaxBackgroundProps) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const color = accentColor ?? patternDef.color;
  const violet = PILLAR_COLORS.mind;

  // Shared values
  const floatT  = useSharedValue(0);
  const pulseBg = useSharedValue(1);
  const lineOp  = useSharedValue(0.3);

  useEffect(() => {
    // ── Slow drift for floating lights + wave lines ──
    floatT.value = withRepeat(
      withTiming(1, { duration: 48000, easing: Easing.linear }),
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
            withTiming(1.06, { duration: durIn * 1000, easing: Easing.out(Easing.quad) }),
            ...(durHi > 0 ? [withTiming(1.06, { duration: durHi * 1000 })] : []),
            withTiming(0.94, { duration: durEx * 1000, easing: Easing.in(Easing.quad) }),
            ...(durHo > 0 ? [withTiming(0.94, { duration: durHo * 1000 })] : []),
          ),
          -1,
          true,
        );
      }
    } else {
      // Gentle idle sway
      pulseBg.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.98, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }

    // ── Wave-line opacity breathing ──
    lineOp.value = withRepeat(
      withSequence(
        withTiming(0.16, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.05, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(floatT);
      cancelAnimation(pulseBg);
      cancelAnimation(lineOp);
    };
  }, [isActive, patternDef]);

  // ── Animated props for the light group and the wave-line group ──
  // Reanimated animatedProps needs `as any` — RN Web types are too strict
  // for drive-by animated transform/opacity values.
  const pulseGroupProps = useAnimatedProps(() => ({
    transform: [{ scale: pulseBg.value }],
  } as any));

  const waveGroupProps = useAnimatedProps(() => {
    // Barely-there horizontal drift — "flowing", not scrolling.
    const driftX = Math.sin(floatT.value * Math.PI * 2 * 0.3) * 14;
    return { opacity: lineOp.value, transform: [{ translateX: driftX }] } as any;
  });

  // Stable gradient IDs per orb
  const gradIds = useMemo(() => ORB_CONFIGS.map((_, i) => `orb-grad-${i}`), []);
  const dimFactor = dimmed ? 0.7 : 1;

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
            <Stop offset="0%" stopColor={orb.violet ? violet : color} stopOpacity={0.13 * dimFactor} />
            <Stop offset="55%" stopColor={orb.violet ? violet : color} stopOpacity={0.05 * dimFactor} />
            <Stop offset="100%" stopColor={orb.violet ? violet : color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>

      {/* ── Layer 1: 2-3 soft ambient lights, not a scatter of circles ── */}
      <AnimatedG animatedProps={pulseGroupProps}>
        {ORB_CONFIGS.map((orb, i) => (
          <FloatingOrb
            key={gradIds[i]}
            config={orb}
            gradId={gradIds[i]}
            floatT={floatT}
          />
        ))}
      </AnimatedG>

      {/* ── Layer 2: thin flowing contour lines — dark-water / moonlight feel ── */}
      <AnimatedG animatedProps={waveGroupProps}>
        {WAVE_CONFIGS.map((wave, i) => (
          <Path
            key={`wave-${i}`}
            d={wavePath(wave.y, wave.amp)}
            stroke={color}
            strokeWidth={1}
            fill="none"
          />
        ))}
      </AnimatedG>
    </Svg>
  );
}
