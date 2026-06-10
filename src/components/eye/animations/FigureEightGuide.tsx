import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop, Circle } from 'react-native-svg';

interface Props { active: boolean }

const CENTER = 130, A = 86, ORB_SIZE = 22, BASE_LOOP_MS = 5000;
const SPEED_INTERVAL = 4000, SPEED_STEP = 0.2, MAX_SPEED = 3.0;

function lemniscate(t: number): { x: number; y: number } {
  'worklet';
  const sin = Math.sin(t), cos = Math.cos(t), denom = 1 + sin * sin;
  return { x: CENTER + (A * cos) / denom, y: CENTER + (A * sin * cos) / denom };
}
function buildPath(): string {
  const pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * 2 * Math.PI;
    const sin = Math.sin(t), cos = Math.cos(t), denom = 1 + sin * sin;
    pts.push(`${(CENTER + (A * cos) / denom).toFixed(2)},${(CENTER + (A * sin * cos) / denom).toFixed(2)}`);
  }
  return 'M' + pts.join(' L');
}
const FIG8_PATH = buildPath();

export function FigureEightGuide({ active }: Props) {
  const t = useSharedValue(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [speed, setSpeed] = useState(1);
  const prevSpeed = useRef(1);
  const wobbleX = useSharedValue(0);
  const wobbleY = useSharedValue(0);

  // Haptic on speed level increase
  useEffect(() => {
    if (!active) { prevSpeed.current = 1; return; }
    if (speed > prevSpeed.current) {
      prevSpeed.current = speed;
      if      (speed >= 3.0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (speed >= 2.0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else                   void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [speed, active]);

  useEffect(() => {
    if (!active) { setSpeed(1); cancelAnimation(wobbleX); cancelAnimation(wobbleY); wobbleX.value = 0; wobbleY.value = 0; return; }
    const id = setInterval(() => setSpeed(s => Math.min(s + SPEED_STEP, MAX_SPEED)), SPEED_INTERVAL);
    const wiggle = () => {
      wobbleX.value = withTiming((Math.random() - 0.5) * 2.5, { duration: 500, easing: Easing.inOut(Easing.ease) });
      wobbleY.value = withTiming((Math.random() - 0.5) * 2.5, { duration: 500, easing: Easing.inOut(Easing.ease) });
    };
    wiggle();
    const wId = setInterval(wiggle, 600);
    return () => { clearInterval(id); clearInterval(wId); };
  }, [active, wobbleX, wobbleY]);

  useEffect(() => {
    if (!active) { cancelAnimation(t); t.value = 0; setDirection(1); return; }
    const radPerMs = (direction * 2 * Math.PI) / (BASE_LOOP_MS / speed);
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      t.value += radPerMs * (now - last);
      last = now;
    }, 16);
    return () => clearInterval(id);
  }, [active, t, direction, speed]);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setDirection(d => (d === 1 ? -1 : 1)), 15000);
    return () => clearTimeout(id);
  }, [active]);

  const orbStyle = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value);
    return { transform: [{ translateX: p.x - ORB_SIZE / 2 + wobbleX.value }, { translateY: p.y - ORB_SIZE / 2 + wobbleY.value }] };
  });
  const trailA = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value - 0.18);
    return { transform: [{ translateX: p.x - 7 + wobbleX.value * 0.5 }, { translateY: p.y - 7 + wobbleY.value * 0.5 }] };
  });
  const trailB = useAnimatedStyle(() => {
    'worklet';
    const p = lemniscate(t.value - 0.36);
    return { transform: [{ translateX: p.x - 5 + wobbleX.value * 0.3 }, { translateY: p.y - 5 + wobbleY.value * 0.3 }] };
  });

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="f8Glow" cx="130" cy="130" r="110">
            <Stop offset="0%" stopColor="#ec4899" stopOpacity="0.14" /><Stop offset="60%" stopColor="#7B61FF" stopOpacity="0.06" /><Stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="f8Track" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ec4899" stopOpacity="0.55" /><Stop offset="50%" stopColor="#a78bfa" stopOpacity="0.65" /><Stop offset="100%" stopColor="#4FC3F7" stopOpacity="0.55" />
          </LinearGradient>
        </Defs>
        <Circle cx={CENTER} cy={CENTER} r="115" fill="url(#f8Glow)" />
        <Path d={FIG8_PATH} stroke="url(#f8Track)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <Circle cx={CENTER} cy={CENTER} r="3" fill="rgba(255,255,255,0.25)" />
      </Svg>
      <Animated.View style={[styles.trailDotB, trailB]} pointerEvents="none" />
      <Animated.View style={[styles.trailDotA, trailA]} pointerEvents="none" />
      <Animated.View style={[styles.orb, orbStyle]} pointerEvents="none"><View style={styles.orbInner} /><View style={styles.orbGlow} /></Animated.View>
      <Text style={styles.label}>{direction === 1 ? 'Trace clockwise' : 'Trace counter-clockwise'}</Text>
      {speed > 1.5 && <Text style={styles.speedBadge}>⚡{speed.toFixed(1)}x</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', left: 0, top: 0, width: ORB_SIZE, height: ORB_SIZE, alignItems: 'center', justifyContent: 'center' },
  orbInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: '#ec4899', zIndex: 2 },
  orbGlow: { position: 'absolute', width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, backgroundColor: '#ec4899', opacity: 0.55, zIndex: 1 },
  trailDotA: { position: 'absolute', left: 0, top: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#ec4899', opacity: 0.55 },
  trailDotB: { position: 'absolute', left: 0, top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#a78bfa', opacity: 0.32 },
  label: { position: 'absolute', bottom: 12, fontSize: 13, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.4, textAlign: 'center', paddingHorizontal: 16 },
  speedBadge: { position: 'absolute', top: 12, right: 12, fontSize: 11, color: '#FFD700', fontWeight: '800', letterSpacing: 1 },
});
