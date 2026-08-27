import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, useAnimatedProps, useAnimatedStyle, useFrameCallback, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

interface Props { active: boolean }

const CYCLE_MS = 16000; // one full 3-lane serpentine cycle — calm, comfortable pace
const TRAVEL_RATIO = 0.87; // of canvas width
const CORE = 16, HALO = 32;

// Cumulative time-fraction boundaries for one cycle: 3 broad sweeps
// (upper L→R, middle R→L, lower L→R) connected by short diagonal glides,
// plus a longer glide resetting back to the start — a deliberate
// serpentine scan, not one flat back-and-forth line.
const B = [0, 0.24, 0.33, 0.57, 0.66, 0.9, 1];

const AnimatedLine = Animated.createAnimatedComponent(Line);

/** A structured multi-lane directional scan that never stops while active —
 * a continuously-incrementing, wrapping `u` (0→1→0…, no ping-pong needed
 * since the serpentine is inherently one-directional) driven by a UI-thread
 * frame callback (immune to JS-thread timer throttling). Pausing freezes
 * the exact position; resuming continues from there. */
export function SweepFlowGuide({ active }: Props) {
  const { width, height } = useWindowDimensions();
  const canvasW = width * 0.9;
  const canvasH = Math.min(Math.max(height * 0.4, 220), 340);
  const marginX = (canvasW - canvasW * TRAVEL_RATIO) / 2;
  const leftX = marginX;
  const rightX = canvasW - marginX;
  const laneY0 = canvasH * 0.22;
  const laneY1 = canvasH * 0.5;
  const laneY2 = canvasH * 0.78;

  // Note: `smoothstep(r) = r*r*(3-2*r)` is inlined at each branch below
  // rather than factored into a local helper closure — a nested (non-
  // top-level) arrow function inside a worklet isn't auto-workletized by
  // this project's Babel config, which crashes with "tried to synchronously
  // call a non-worklet function" the moment the UI thread calls it.
  function sweepPoint(u: number): { x: number; y: number } {
    'worklet';
    if (u < B[1]) {
      const r = u / B[1]; const f = r * r * (3 - 2 * r);
      return { x: leftX + (rightX - leftX) * f, y: laneY0 };
    }
    if (u < B[2]) {
      const r = (u - B[1]) / (B[2] - B[1]); const f = r * r * (3 - 2 * r);
      return { x: rightX, y: laneY0 + (laneY1 - laneY0) * f };
    }
    if (u < B[3]) {
      const r = (u - B[2]) / (B[3] - B[2]); const f = r * r * (3 - 2 * r);
      return { x: rightX + (leftX - rightX) * f, y: laneY1 };
    }
    if (u < B[4]) {
      const r = (u - B[3]) / (B[4] - B[3]); const f = r * r * (3 - 2 * r);
      return { x: leftX, y: laneY1 + (laneY2 - laneY1) * f };
    }
    if (u < B[5]) {
      const r = (u - B[4]) / (B[5] - B[4]); const f = r * r * (3 - 2 * r);
      return { x: leftX + (rightX - leftX) * f, y: laneY2 };
    }
    const r = (u - B[5]) / (B[6] - B[5]); const f = r * r * (3 - 2 * r);
    return { x: rightX + (leftX - rightX) * f, y: laneY2 + (laneY0 - laneY2) * f };
  }

  const u = useSharedValue(0);
  const pulse = useSharedValue(1);

  const frame = useFrameCallback(info => {
    'worklet';
    const dt = info.timeSincePreviousFrame ?? 16;
    let next = u.value + dt / CYCLE_MS;
    if (next >= 1) next -= 1;
    u.value = next;
  }, false);

  useEffect(() => {
    if (!active) { cancelAnimation(u); frame.setActive(false); return; } // freeze in place — no reset
    frame.setActive(true);
    return () => frame.setActive(false);
  }, [active, u, frame]);

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
    const p = sweepPoint(u.value);
    return { transform: [{ translateX: p.x - CORE / 2 }, { translateY: p.y - CORE / 2 }] };
  });
  const haloStyle = useAnimatedStyle(() => {
    'worklet';
    const p = sweepPoint(u.value);
    return {
      transform: [{ translateX: p.x - HALO / 2 }, { translateY: p.y - HALO / 2 }, { scale: pulse.value }],
    };
  });
  // A subtle guide line at the target's current lane only — communicates
  // "this row" without three permanent bright horizontal lines.
  const laneLineProps = useAnimatedProps(() => {
    'worklet';
    const y = sweepPoint(u.value).y;
    return { y1: y, y2: y };
  });
  const lead1Style = useAnimatedStyle(() => {
    'worklet';
    const p = sweepPoint(Math.min(1, u.value + 0.02));
    return { transform: [{ translateX: p.x - 4.5 }, { translateY: p.y - 4.5 }] };
  });
  const lead2Style = useAnimatedStyle(() => {
    'worklet';
    const p = sweepPoint(Math.min(1, u.value + 0.04));
    return { transform: [{ translateX: p.x - 3.5 }, { translateY: p.y - 3.5 }] };
  });
  const trail1Style = useAnimatedStyle(() => {
    'worklet';
    const p = sweepPoint(Math.max(0, u.value - 0.018));
    return { transform: [{ translateX: p.x - 5 }, { translateY: p.y - 5 }] };
  });
  const trail2Style = useAnimatedStyle(() => {
    'worklet';
    const p = sweepPoint(Math.max(0, u.value - 0.036));
    return { transform: [{ translateX: p.x - 3.5 }, { translateY: p.y - 3.5 }] };
  });
  const trail3Style = useAnimatedStyle(() => {
    'worklet';
    const p = sweepPoint(Math.max(0, u.value - 0.054));
    return { transform: [{ translateX: p.x - 2.5 }, { translateY: p.y - 2.5 }] };
  });

  return (
    <View style={[styles.arena, { width: canvasW, height: canvasH }]}>
      <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
        <AnimatedLine
          x1={leftX}
          x2={rightX}
          animatedProps={laneLineProps}
          stroke="#8A7CFF"
          strokeOpacity={0.22}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
      <Animated.View style={[styles.trailDot, styles.trailDotFar, trail3Style]} pointerEvents="none" />
      <Animated.View style={[styles.trailDot, styles.trailDotMid, trail2Style]} pointerEvents="none" />
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
  trailDotNear: { width: 10, height: 10, opacity: 0.3 },
  trailDotMid: { width: 7, height: 7, opacity: 0.2 },
  trailDotFar: { width: 5, height: 5, opacity: 0.1 },
  leadDot: { position: 'absolute', left: 0, top: 0, borderRadius: 50, backgroundColor: '#B9F3FF' },
  leadDotNear: { width: 9, height: 9, opacity: 0.35 },
  leadDotFar: { width: 7, height: 7, opacity: 0.2 },
});
