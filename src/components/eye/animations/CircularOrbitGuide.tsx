import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, G } from 'react-native-svg';
import { FocusDot } from './FocusDot';

interface Props { active: boolean; singleShape?: number }

const CENTER = 130;
const SPEED_INTERVAL = 5000;
const SPEED_STEP = 0.2;
const MAX_SPEED = 3.0;
const SHAPE_DURATION_MS = 5000;
const TRANSITION_MS = 400;

// ─── Shape definitions ───────────────────────────────────────────────────────
type ShapeName = 'Circle' | 'Square' | 'Triangle';

interface ShapeDef {
  name: ShapeName;
  color: string;
  path: (t: number) => { x: number; y: number };
}

function ease(t: number) {
  'worklet';
  return t * t * (3 - 2 * t);
}

const R = 105;

function shapeCircle(t: number) {
  'worklet';
  const angle = t * 2 * Math.PI;
  return { x: CENTER + R * Math.cos(angle), y: CENTER + R * Math.sin(angle) };
}

function shapeSquare(t: number) {
  'worklet';
  const side = R * 0.95;
  const s = t * 4;
  const seg = Math.floor(s);
  const frac = ease(s - seg);
  switch (seg % 4) {
    case 0: return { x: CENTER - side + frac * 2 * side, y: CENTER - side };
    case 1: return { x: CENTER + side, y: CENTER - side + frac * 2 * side };
    case 2: return { x: CENTER + side - frac * 2 * side, y: CENTER + side };
    case 3: return { x: CENTER - side, y: CENTER + side - frac * 2 * side };
    default: return { x: CENTER, y: CENTER };
  }
}

function shapeTriangle(t: number) {
  'worklet';
  const r = R * 0.98;
  const angles = [-Math.PI / 2, -Math.PI / 2 + 2 * Math.PI / 3, -Math.PI / 2 + 4 * Math.PI / 3];
  const pts = angles.map(a => ({ x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) }));
  const s = t * 3;
  const seg = Math.floor(s);
  const frac = ease(s - seg);
  const p0 = pts[seg % 3];
  const p1 = pts[(seg + 1) % 3];
  return { x: p0.x + frac * (p1.x - p0.x), y: p0.y + frac * (p1.y - p0.y) };
}

const SHAPES: ShapeDef[] = [
  { name: 'Circle',   color: '#4FC3F7', path: shapeCircle },
  { name: 'Square',   color: '#a78bfa', path: shapeSquare },
  { name: 'Triangle', color: '#6ee7b7', path: shapeTriangle },
];

function buildShapePath(shape: ShapeDef): string {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const p = shape.path(i / 40);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return 'M' + pts.join(' L');
}

// ─── Component ───────────────────────────────────────────────────────────────
export function CircularOrbitGuide({ active, singleShape }: Props) {
  const singleMode = singleShape !== undefined;
  const posX = useSharedValue(CENTER);
  const posY = useSharedValue(CENTER);
  const [shapeIdx, setShapeIdx] = useState(singleMode ? singleShape! : 0);
  const [speed, setSpeed] = useState(1);
  const prevSpeed = useRef(1);
  const transitionOpacity = useSharedValue(1);

  // Refs to preserve animation state across re-renders (speed changes, shape changes)
  const elapsedRef = useRef(0);
  const lapCountRef = useRef(0);
  const currentShapeRef = useRef(singleMode ? singleShape! : 0);
  const lastTimeRef = useRef(Date.now());
  // Direction: do 2-3 laps one way, then switch (randomized)
  const directionRef = useRef(1); // 1 = forward, -1 = reverse
  const lapsInDirRef = useRef(0);
  const lapsBeforeSwitchRef = useRef(2 + Math.round(Math.random())); // 2 or 3

  const wobbleX = useSharedValue(0);
  const wobbleY = useSharedValue(0);

  const shapeIdxSV = useSharedValue(0);
  const currentShape = SHAPES[shapeIdx];

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

  // Speed increase + wobble
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

  // Shape position animation — uses refs to prevent jumping on speed/shape changes
  useEffect(() => {
    if (!active) {
      cancelAnimation(posX); cancelAnimation(posY);
      posX.value = CENTER;
      posY.value = CENTER;
      currentShapeRef.current = singleMode ? singleShape! : 0;
      setShapeIdx(singleMode ? singleShape! : 0);
      elapsedRef.current = 0;
      lapCountRef.current = 0;
      return;
    }

    if (singleMode) {
      currentShapeRef.current = singleShape!;
      shapeIdxSV.value = singleShape!;
      setShapeIdx(singleShape!);
    }

    lastTimeRef.current = Date.now();

    const tick = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      elapsedRef.current += dt * speed;

      if (elapsedRef.current >= SHAPE_DURATION_MS) {
        elapsedRef.current -= SHAPE_DURATION_MS;
        lapCountRef.current += 1;
        lapsInDirRef.current += 1;

        // Switch direction every 2-3 laps (random)
        if (lapsInDirRef.current >= lapsBeforeSwitchRef.current) {
          directionRef.current *= -1;
          lapsInDirRef.current = 0;
          lapsBeforeSwitchRef.current = 2 + Math.round(Math.random());
        }

        if (!singleMode) {
          currentShapeRef.current = (currentShapeRef.current + 1) % SHAPES.length;
          shapeIdxSV.value = currentShapeRef.current;
          setShapeIdx(currentShapeRef.current);
          transitionOpacity.value = withTiming(0, { duration: TRANSITION_MS / 2, easing: Easing.out(Easing.ease) });
          setTimeout(() => {
            transitionOpacity.value = withTiming(1, { duration: TRANSITION_MS / 2, easing: Easing.in(Easing.ease) });
            void Haptics.selectionAsync();
          }, TRANSITION_MS / 2 + 30);
        }
      }

      const raw = elapsedRef.current / SHAPE_DURATION_MS;
      const tClamped = Math.min(1, Math.max(0, raw));
      const t = directionRef.current === 1 ? tClamped : 1 - tClamped;

      const idx = singleMode ? singleShape! : currentShapeRef.current;
      const p = SHAPES[idx].path(t);
      posX.value = p.x;
      posY.value = p.y;
    }, 16);

    return () => clearInterval(tick);
  }, [active, speed, posX, posY, transitionOpacity, shapeIdxSV, singleShape, singleMode]);

  const mainOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value + wobbleX.value - 16 }, { translateY: posY.value + wobbleY.value - 16 }],
  }));

  const trailStyle = useAnimatedStyle(() => {
    'worklet';
    const idx = Math.round(shapeIdxSV.value);
    const def = SHAPES[idx];
    const p = def ? def.path(Math.min(0.95, Math.max(0, 0.85))) : { x: CENTER, y: CENTER };
    return { transform: [{ translateX: p.x + wobbleX.value * 0.4 - 6 }, { translateY: p.y + wobbleY.value * 0.4 - 6 }] };
  });

  const fadeStyle = useAnimatedStyle(() => ({ opacity: transitionOpacity.value }));

  const ghostPaths = SHAPES.map(s => buildShapePath(s));

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cmNebula" cx="130" cy="130" r="100">
            <Stop offset="0%" stopColor={currentShape.color} stopOpacity="0.20" />
            <Stop offset="60%" stopColor="#22d3ee" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="130" cy="130" r="125" fill="url(#cmNebula)" />

        {ghostPaths.map((path, i) => (
          <Path key={i} d={path} stroke={SHAPES[i].color} strokeWidth="1" fill="none"
            opacity={i === shapeIdx ? 0.25 : 0.08} strokeDasharray={i === shapeIdx ? "none" : "3,5"}
          />
        ))}

        <Circle cx={CENTER} cy={CENTER} r="3" fill="rgba(255,255,255,0.15)" />
        <Circle cx={CENTER} cy={CENTER} r="18" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />

        <G transform={`translate(${CENTER}, ${CENTER})`}>
          <Path d="M 0,-112 L 0,112" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          <Path d="M -112,0 L 112,0" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </G>
      </Svg>

      <Animated.View style={[styles.trailDot, trailStyle]} />
      <Animated.View style={[styles.mainOrb, mainOrbStyle, fadeStyle]}>
        <FocusDot color={currentShape.color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mainOrb: { position: 'absolute', left: 0, top: 0, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  trailDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', opacity: 0.5 },
});
