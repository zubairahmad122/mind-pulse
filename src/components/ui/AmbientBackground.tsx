import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { usePillarAccent } from '@/context/PillarContext';

// ── Beam configuration ───────────────────────────────────────────────────────

const BEAM_ANGLES = [0, 72, 144, 216, 288];

/**
 * Two soft, static radial glows — a purple wash near the top and a dimmer
 * blue wash low on the screen. Gives the flat background depth and a
 * recognizable identity without competing with content (very low opacity,
 * never animates).
 */
function AmbientGlow({ accent }: { accent: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="glowTop" cx="18%" cy="6%" r="60%">
          <Stop offset="0%" stopColor={accent} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="glowBottom" cx="88%" cy="78%" r="42%">
          <Stop offset="0%" stopColor="#2563EB" stopOpacity={0.14} />
          <Stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowTop)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowBottom)" />
    </Svg>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function AmbientBeam({
  deg,
  index,
  phase,
}: {
  deg: number;
  index: number;
  phase: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: (0.5 + 0.5 * Math.sin(phase.value + index * 1.6)) * 0.18,
  }));
  return (
    <AnimatedPath
      d="M150,150 L132,10 L168,10 Z"
      fill="url(#ambientBeam)"
      animatedProps={animatedProps}
      transform={`rotate(${deg} 150 150)`}
    />
  );
}

function AmbientBeams({ accent }: { accent: string }) {
  const rotation = useSharedValue(0);
  const phase = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(-360, { duration: 300_000, easing: Easing.linear }),
      -1,
      false,
    );
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 10_500, easing: Easing.linear }),
      -1,
      false,
    );
  }, [phase, rotation]);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.beams, rotationStyle]}
    >
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <Defs>
          <SvgLinearGradient id="ambientBeam" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor={accent} stopOpacity={0.09} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {BEAM_ANGLES.map((deg, i) => (
          <AmbientBeam key={i} deg={deg} index={i} phase={phase} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ── Combined ambient layer ───────────────────────────────────────────────────

interface AmbientBackgroundProps {
  /** If true, renders a subtle variant with reduced opacity (good for scrollable content). */
  subtle?: boolean;
}

/**
 * Animated ambient layer for screens using the current pillar's accent color.
 *
 * Renders only the slow-rotating, very faint light beams — a subtle per-pillar
 * accent over the shared deep-space background. (The old centered glow ball and
 * floating particles were removed for a cleaner, calmer look.)
 *
 * Positioned absolutely — place as a direct child of the screen container,
 * before the content, so it sits behind everything.
 */
export function AmbientBackground({ subtle = false }: AmbientBackgroundProps) {
  const accent = usePillarAccent();

  const opacity = subtle ? 0.5 : 1;

  return (
    <View pointerEvents="none" style={{ ...StyleSheet.absoluteFill, opacity }}>
      <AmbientGlow accent={accent} />
      <AmbientBeams accent={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  beams: {
    position: 'absolute',
    width: '100%',
    height: 300,
    alignItems: 'center',
  },
});
