import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useFrameCallback, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props { active: boolean }

const LOOP_MS = 6200;
const REVERSE_INTERVAL_MS = 15000;
const CORE = 16, HALO = 32;
/** Bounding-box fill ratios, relative to the open field — a wide, low
 * infinity shape rather than a small symmetric figure-eight. */
const PATH_WIDTH_RATIO = 0.82;
const PATH_HEIGHT_RATIO = 0.28;

/** A continuous figure-eight pursuit — loops for the entire active duration
 * at one fixed, comfortable pace (no auto speed-ramp: "fastest at the end"
 * is explicitly out of scope for V1). Driven by a UI-thread frame callback
 * rather than a JS `setInterval` (which Android can throttle once the JS
 * thread has been idle). Pausing freezes the exact position/direction;
 * resuming continues from there — never resets to the start.
 */
export function FigureEightGuide({ active }: Props) {
  const { width, height } = useWindowDimensions();
  const canvasW = width * 0.9;
  const canvasH = Math.min(Math.max(height * 0.4, 220), 340);
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;
  const halfW = (canvasW * PATH_WIDTH_RATIO) / 2;
  const halfH = (canvasH * PATH_HEIGHT_RATIO) / 2;
  // The raw unit lemniscate's x-extent is exactly ±1; its y-extent peaks at
  // a non-round fraction, so it's measured by sampling rather than assumed.
  let rawMaxY = 0;
  for (let i = 0; i <= 96; i++) {
    const tt = (i / 96) * 2 * Math.PI;
    const sin = Math.sin(tt), cos = Math.cos(tt), denom = 1 + sin * sin;
    rawMaxY = Math.max(rawMaxY, Math.abs((sin * cos) / denom));
  }
  const scaleX = halfW;
  const scaleY = halfH / rawMaxY;

  function lemniscate(tt: number): { x: number; y: number } {
    'worklet';
    const sin = Math.sin(tt), cos = Math.cos(tt), denom = 1 + sin * sin;
    return { x: centerX + (scaleX * cos) / denom, y: centerY + (scaleY * sin * cos) / denom };
  }
  function buildPath(): string {
    const pts: string[] = [];
    for (let i = 0; i <= 96; i++) {
      const p = lemniscate((i / 96) * 2 * Math.PI);
      pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    return 'M' + pts.join(' L');
  }

  const t = useSharedValue(0);
  const dir = useSharedValue<1 | -1>(1);
  const pulse = useSharedValue(1);
  const wobbleX = useSharedValue(0);
  const wobbleY = useSharedValue(0);

  const frame = useFrameCallback(info => {
    'worklet';
    const dt = info.timeSincePreviousFrame ?? 16;
    const radPerMs = (dir.value * 2 * Math.PI) / LOOP_MS;
    t.value += radPerMs * dt;
  }, false);

  useEffect(() => {
    if (!active) { cancelAnimation(t); frame.setActive(false); return; } // freeze in place — no reset
    frame.setActive(true);
    return () => frame.setActive(false);
  }, [active, t, frame]);

  // Gentle direction reversal after a few loops — a shared-value mutation,
  // so it never needs to restart the frame-callback effect above.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => { dir.value = dir.value === 1 ? -1 : 1; }, REVERSE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, dir]);

  useEffect(() => {
    if (!active) { cancelAnimation(pulse); pulse.value = 1; return; }
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1300 }), withTiming(0.94, { duration: 1300 })),
      -1,
      true,
    );
  }, [active, pulse]);

  useEffect(() => {
    if (!active) { cancelAnimation(wobbleX); cancelAnimation(wobbleY); wobbleX.value = 0; wobbleY.value = 0; return; }
    const wiggle = () => {
      wobbleX.value = withTiming((Math.random() - 0.5) * 2.5, { duration: 500, easing: Easing.inOut(Easing.ease) });
      wobbleY.value = withTiming((Math.random() - 0.5) * 2.5, { duration: 500, easing: Easing.inOut(Easing.ease) });
    };
    wiggle();
    const id = setInterval(wiggle, 600);
    return () => clearInterval(id);
  }, [active, wobbleX, wobbleY]);

  const orbStyle = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value);
    return { transform: [{ translateX: p.x - CORE / 2 + wobbleX.value }, { translateY: p.y - CORE / 2 + wobbleY.value }] };
  });
  const haloStyle = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value);
    return {
      transform: [
        { translateX: p.x - HALO / 2 + wobbleX.value }, { translateY: p.y - HALO / 2 + wobbleY.value }, { scale: pulse.value },
      ],
    };
  });
  // Lead dots — a couple of small bright markers just ahead of the target,
  // on the path, so the eye can anticipate where it's headed next.
  const lead1Style = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value + 0.16 * dir.value);
    return { transform: [{ translateX: p.x - 4.5 }, { translateY: p.y - 4.5 }] };
  });
  const lead2Style = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value + 0.32 * dir.value);
    return { transform: [{ translateX: p.x - 3.5 }, { translateY: p.y - 3.5 }] };
  });
  const trailA = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value - 0.18 * dir.value);
    return { transform: [{ translateX: p.x - 5 + wobbleX.value * 0.5 }, { translateY: p.y - 5 + wobbleY.value * 0.5 }] };
  });
  const trailB = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value - 0.36 * dir.value);
    return { transform: [{ translateX: p.x - 3.5 + wobbleX.value * 0.3 }, { translateY: p.y - 3.5 + wobbleY.value * 0.3 }] };
  });

  return (
    <View style={[styles.arena, { width: canvasW, height: canvasH }]}>
      <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="f8Track" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#8A7CFF" stopOpacity="0.32" />
            <Stop offset="50%" stopColor="#63E8FF" stopOpacity="0.38" />
            <Stop offset="100%" stopColor="#8A7CFF" stopOpacity="0.32" />
          </LinearGradient>
        </Defs>
        <Path d={buildPath()} stroke="url(#f8Track)" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </Svg>
      <Animated.View style={[styles.trailDot, styles.trailDotFar, trailB]} pointerEvents="none" />
      <Animated.View style={[styles.trailDot, styles.trailDotNear, trailA]} pointerEvents="none" />
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
