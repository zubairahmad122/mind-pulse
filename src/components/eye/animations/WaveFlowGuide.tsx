import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, useAnimatedStyle, useFrameCallback, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props { active: boolean }

const LAP_MS = 5600; // one full left→right (or right→left) traversal — calm, comfortable pace
const TRAVEL_RATIO = 0.87; // of canvas width
const AMPLITUDE_RATIO = 0.26; // base vertical unit, as a fraction of canvas height
const CORE = 16, HALO = 32;

/** Crest → deeper trough → crest keyframes (t, yFrac) — a composed flowing
 * ribbon rather than a uniform tiny wiggle. yFrac is multiplied by the
 * canvas-relative amplitude; negative = up, positive = down. */
const KEYFRAMES: { t: number; yFrac: number }[] = [
  { t: 0, yFrac: 0 },
  { t: 0.22, yFrac: -1.0 },
  { t: 0.5, yFrac: 1.35 },
  { t: 0.78, yFrac: -1.0 },
  { t: 1, yFrac: 0 },
];

/** A calm, continuous side-to-side wave that never stops while active — a
 * ping-ponged `t` (0→1→0…) driven by a UI-thread frame callback (not a JS
 * `setInterval`, which Android can throttle/stall once the JS thread has
 * been "idle" for a while, silently freezing the motion). Pausing stops the
 * frame callback in place and resuming continues from there (never resets
 * to the start). */
export function WaveFlowGuide({ active }: Props) {
  const { width, height } = useWindowDimensions();
  const canvasW = width * 0.9;
  const canvasH = Math.min(Math.max(height * 0.4, 220), 340);
  const marginX = (canvasW - canvasW * TRAVEL_RATIO) / 2;
  const travelW = canvasW - marginX * 2;
  const amplitude = canvasH * AMPLITUDE_RATIO;
  // Sit in the middle-lower area, not dead-center, so the crest/trough
  // composition reads as intentional rather than centered-and-flat.
  const centerY = canvasH * 0.58;

  function wavePoint(t: number): { x: number; y: number } {
    'worklet';
    const x = marginX + t * travelW;
    let i = 0;
    for (; i < KEYFRAMES.length - 2; i++) {
      if (t < KEYFRAMES[i + 1].t) break;
    }
    const a = KEYFRAMES[i], b = KEYFRAMES[i + 1];
    const f = (t - a.t) / (b.t - a.t);
    const fe = f * f * (3 - 2 * f); // smoothstep — eases through each crest/trough apex
    const yFrac = a.yFrac + (b.yFrac - a.yFrac) * fe;
    return { x, y: centerY + amplitude * yFrac };
  }
  function buildPath(): string {
    const pts: string[] = [];
    for (let i = 0; i <= 96; i++) {
      const p = wavePoint(i / 96);
      pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    return 'M' + pts.join(' L');
  }

  const t = useSharedValue(0);
  const dir = useSharedValue<1 | -1>(1);
  const pulse = useSharedValue(1);

  // UI-thread frame callback — immune to JS-thread timer throttling, so the
  // ping-pong can never silently stall the way a `setInterval` tick could.
  const frame = useFrameCallback(info => {
    'worklet';
    const dt = info.timeSincePreviousFrame ?? 16;
    let next = t.value + (dir.value * dt) / LAP_MS;
    if (next >= 1) { next = 1; dir.value = -1; }
    else if (next <= 0) { next = 0; dir.value = 1; }
    t.value = next;
  }, false);

  useEffect(() => {
    if (!active) { cancelAnimation(t); frame.setActive(false); return; } // freeze in place — no reset
    frame.setActive(true);
    return () => frame.setActive(false);
  }, [active, t, frame]);

  useEffect(() => {
    if (!active) { cancelAnimation(pulse); pulse.value = 1; return; }
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1300 }), withTiming(0.94, { duration: 1300 })),
      -1,
      true,
    );
  }, [active, pulse]);

  const orbStyle = useAnimatedStyle(() => {
    'worklet';
    const p = wavePoint(t.value);
    return { transform: [{ translateX: p.x - CORE / 2 }, { translateY: p.y - CORE / 2 }] };
  });
  const haloStyle = useAnimatedStyle(() => {
    'worklet';
    const p = wavePoint(t.value);
    return {
      transform: [
        { translateX: p.x - HALO / 2 }, { translateY: p.y - HALO / 2 }, { scale: pulse.value },
      ],
    };
  });
  // Lead dots — small bright markers just ahead of the target (roughly the
  // next 20-25% of travel), so the eye can anticipate the upcoming motion.
  const lead1Style = useAnimatedStyle(() => {
    'worklet';
    const p = wavePoint(Math.max(0, Math.min(1, t.value + 0.08 * dir.value)));
    return { transform: [{ translateX: p.x - 4.5 }, { translateY: p.y - 4.5 }] };
  });
  const lead2Style = useAnimatedStyle(() => {
    'worklet';
    const p = wavePoint(Math.max(0, Math.min(1, t.value + 0.18 * dir.value)));
    return { transform: [{ translateX: p.x - 3.5 }, { translateY: p.y - 3.5 }] };
  });
  const trail1Style = useAnimatedStyle(() => {
    'worklet';
    const p = wavePoint(Math.max(0, Math.min(1, t.value - 0.05 * dir.value)));
    return { transform: [{ translateX: p.x - 5 }, { translateY: p.y - 5 }] };
  });
  const trail2Style = useAnimatedStyle(() => {
    'worklet';
    const p = wavePoint(Math.max(0, Math.min(1, t.value - 0.1 * dir.value)));
    return { transform: [{ translateX: p.x - 3.5 }, { translateY: p.y - 3.5 }] };
  });

  return (
    <View style={[styles.arena, { width: canvasW, height: canvasH }]}>
      <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="waveTrack" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#8A7CFF" stopOpacity="0" />
            <Stop offset="10%" stopColor="#8A7CFF" stopOpacity="0.36" />
            <Stop offset="50%" stopColor="#63E8FF" stopOpacity="0.4" />
            <Stop offset="90%" stopColor="#8A7CFF" stopOpacity="0.36" />
            <Stop offset="100%" stopColor="#8A7CFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={buildPath()} stroke="url(#waveTrack)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </Svg>
      <Animated.View style={[styles.trailDot, styles.trailDotFar, trail2Style]} pointerEvents="none" />
      <Animated.View style={[styles.trailDot, styles.trailDotNear, trail1Style]} pointerEvents="none" />
      <Animated.View style={[styles.leadDot, styles.leadDotFar, lead2Style]} pointerEvents="none" />
      <Animated.View style={[styles.leadDot, styles.leadDotNear, lead1Style]} pointerEvents="none" />
      <Animated.View style={[styles.halo, haloStyle]} pointerEvents="none" />
      <Animated.View style={[styles.core, orbStyle]} pointerEvents="none">
        <View style={styles.highlight} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  halo: {
    position: 'absolute', left: 0, top: 0, width: HALO, height: HALO, borderRadius: HALO / 2,
    backgroundColor: '#7B61FF', opacity: 0.28,
  },
  core: {
    position: 'absolute', left: 0, top: 0, width: CORE, height: CORE, borderRadius: CORE / 2,
    backgroundColor: '#63E8FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#63E8FF', shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  highlight: {
    position: 'absolute', top: 3, left: 3.5, width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#FFFFFF', opacity: 0.9,
  },
  trailDot: { position: 'absolute', left: 0, top: 0, borderRadius: 50, backgroundColor: '#63E8FF' },
  trailDotNear: { width: 10, height: 10, opacity: 0.28 },
  trailDotFar: { width: 7, height: 7, opacity: 0.16 },
  leadDot: { position: 'absolute', left: 0, top: 0, borderRadius: 50, backgroundColor: '#B9F3FF' },
  leadDotNear: { width: 9, height: 9, opacity: 0.4 },
  leadDotFar: { width: 7, height: 7, opacity: 0.22 },
});
