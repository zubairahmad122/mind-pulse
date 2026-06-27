import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { FocusDot } from './FocusDot';

interface Props { active: boolean }

const CENTER = 130;
const R = 95; // reduced from 100 to prevent overflow
const BASE_JUMP_MS = 800;
const SNAP_MS = 70;
const SPEED_INTERVAL = 3000;
const SPEED_STEP = 0.2;
const MAX_SPEED = 3.0;

interface Pos { x: number; y: number }
function p(x: number, y: number): Pos { return { x, y }; }
const SQ = Math.SQRT1_2;

// 8 cardinal + diagonal positions — same pool as 9-point gaze (minus center)
const POSITIONS: (Pos & { label: string; muscle: string })[] = [
  { x: CENTER, y: CENTER - R, label: 'Up', muscle: 'Sup. Rectus' },
  { x: CENTER + R * SQ, y: CENTER - R * SQ, label: 'Up-Right', muscle: 'Sup. Oblique' },
  { x: CENTER + R, y: CENTER, label: 'Right', muscle: 'Lat. Rectus' },
  { x: CENTER + R * SQ, y: CENTER + R * SQ, label: 'Down-Right', muscle: 'Inf. Oblique' },
  { x: CENTER, y: CENTER + R, label: 'Down', muscle: 'Inf. Rectus' },
  { x: CENTER - R * SQ, y: CENTER + R * SQ, label: 'Down-Left', muscle: 'Inf. Oblique' },
  { x: CENTER - R, y: CENTER, label: 'Left', muscle: 'Med. Rectus' },
  { x: CENTER - R * SQ, y: CENTER - R * SQ, label: 'Up-Left', muscle: 'Sup. Oblique' },
];

const POS_COLORS: Record<string, string> = {
  'Sup. Rectus': '#4FC3F7', 'Sup. Oblique': '#a78bfa', 'Lat. Rectus': '#6ee7b7',
  'Inf. Oblique': '#fb7185', 'Inf. Rectus': '#fbbf24', 'Med. Rectus': '#f97316',
};

export function SaccadeGuide({ active }: Props) {
  const [speed, setSpeed] = useState(1);
  const prevSpeed = useRef(1);

  const [currentPos, setCurrentPos] = useState(POSITIONS[0]);
  const [nextPos, setNextPos] = useState(() => {
    let n: number;
    do { n = Math.floor(Math.random() * POSITIONS.length); } while (n === 0);
    return POSITIONS[n];
  });

  // Use ref to track which position is the jump target
  const atNextRef = useRef(false);

  const tx = useSharedValue(currentPos.x);
  const ty = useSharedValue(currentPos.y);
  const flash = useSharedValue(0);
  const targetPulse = useSharedValue(0);
  const wobbleX = useSharedValue(0);
  const wobbleY = useSharedValue(0);

  // Haptic on speed increase
  useEffect(() => {
    if (!active) { prevSpeed.current = 1; return; }
    if (speed > prevSpeed.current) {
      prevSpeed.current = speed;
      if      (speed >= 3.0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (speed >= 2.0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else                   void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [speed, active]);

  // Speed + wobble
  useEffect(() => {
    if (!active) { setSpeed(1); cancelAnimation(wobbleX); cancelAnimation(wobbleY); wobbleX.value = 0; wobbleY.value = 0; return; }
    const id = setInterval(() => setSpeed(s => Math.min(s + SPEED_STEP, MAX_SPEED)), SPEED_INTERVAL);
    const wiggle = () => {
      wobbleX.value = withTiming((Math.random() - 0.5) * 2, { duration: 400, easing: Easing.inOut(Easing.ease) });
      wobbleY.value = withTiming((Math.random() - 0.5) * 2, { duration: 400, easing: Easing.inOut(Easing.ease) });
    };
    wiggle();
    const wId = setInterval(wiggle, 500);
    return () => { clearInterval(id); clearInterval(wId); };
  }, [active, wobbleX, wobbleY]);

  // Random jump cycle — preserves state via refs
  useEffect(() => {
    if (!active) {
      atNextRef.current = false;
      setCurrentPos(POSITIONS[0]);
      tx.value = POSITIONS[0].x;
      ty.value = POSITIONS[0].y;
      return;
    }

    const interval = BASE_JUMP_MS / speed;

    const id = setInterval(() => {
      atNextRef.current = !atNextRef.current;

      // Pick a random next target (different from current)
      const currentTarget = atNextRef.current ? nextPos : currentPos;
      const currentIdx = POSITIONS.findIndex(p => p.x === currentTarget.x && p.y === currentTarget.y);
      let nextIdx: number;
      do { nextIdx = Math.floor(Math.random() * POSITIONS.length); } while (nextIdx === currentIdx);

      if (atNextRef.current) {
        // Jump back to a new random position
        setCurrentPos(nextPos); // current becomes what was next
        const newNext = POSITIONS[nextIdx];
        setNextPos(newNext);
        tx.value = withTiming(newNext.x, { duration: SNAP_MS, easing: Easing.out(Easing.cubic) });
        ty.value = withTiming(newNext.y, { duration: SNAP_MS, easing: Easing.out(Easing.cubic) });
      } else {
        // Jump to the next target
        const target = POSITIONS[nextIdx];
        setNextPos(target);
        tx.value = withTiming(target.x, { duration: SNAP_MS, easing: Easing.out(Easing.cubic) });
        ty.value = withTiming(target.y, { duration: SNAP_MS, easing: Easing.out(Easing.cubic) });
      }

      flash.value = withSequence(
        withTiming(1, { duration: SNAP_MS, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) }),
      );
      targetPulse.value = withSequence(
        withTiming(1, { duration: SNAP_MS + 40 }),
        withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }),
      );
      void Haptics.selectionAsync();
    }, interval);

    return () => clearInterval(id);
  }, [active, speed, tx, ty, flash, targetPulse, currentPos, nextPos]);

  const jumpTarget = atNextRef.current ? nextPos : currentPos;
  const jumpColor = POS_COLORS[jumpTarget.muscle] || '#fde047';

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value - 16 + wobbleX.value }, { translateY: ty.value - 16 + wobbleY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value - 36 }, { translateY: ty.value - 36 }, { scale: 0.5 + flash.value * 1.7 }],
    opacity: flash.value * 0.6,
  }));

  const targetRingStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + targetPulse.value * 0.6,
    transform: [{ scale: 1 + targetPulse.value * 0.25 }],
  }));

  // Current position ring style (pulses with pulse value)
  const currentRingStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + (1 - targetPulse.value) * 0.15,
  }));

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sgBg" cx="130" cy="130" r="125">
            <Stop offset="0%" stopColor={jumpColor} stopOpacity="0.10" />
            <Stop offset="55%" stopColor="#22d3ee" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sgFlash" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff8b5" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={CENTER} cy={CENTER} r="120" fill="url(#sgBg)" />
        <Circle cx={CENTER} cy={CENTER} r="3" fill="rgba(255,255,255,0.18)" />

        {/* Reference ring — smaller to avoid overflow */}
        <Circle cx={CENTER} cy={CENTER} r={R + 6} stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />

        {/* Crosshair */}
        <G transform={`translate(${CENTER}, ${CENTER})`}>
          <Path d="M 0,-102 L 0,102" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          <Path d="M -102,0 L 102,0" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </G>

        {/* All position markers — dim */ }
        {POSITIONS.map((pos, i) => {
          const isJump = pos === jumpTarget;
          const isCurrent = pos === currentPos;
          const active = isJump || isCurrent;
          const accent = POS_COLORS[pos.muscle] || '#fbbf24';
          return (
            <G key={i}>
              <Circle cx={pos.x} cy={pos.y} r={active ? 8 : 3}
                fill={active ? accent + '44' : 'rgba(255,255,255,0.05)'}
                stroke={active ? accent + '88' : 'transparent'}
                strokeWidth={active ? 1.5 : 0}
              />
              <Circle cx={pos.x} cy={pos.y} r={active ? 3 : 1.5}
                fill={active ? '#FFFFFF' : 'rgba(255,255,255,0.12)'}
              />
              {/* Connection line from center */}
              <Path d={`M ${CENTER},${CENTER} L ${pos.x},${pos.y}`}
                stroke={active ? accent + '33' : 'rgba(255,255,255,0.03)'}
                strokeWidth={active ? 1 : 0.5}
                strokeDasharray="2,4"
              />
            </G>
          );
        })}
      </Svg>

      {/* Flash */}
      <Animated.View style={[styles.flashWrap, flashStyle]} pointerEvents="none">
        <Svg width="72" height="72"><Circle cx="36" cy="36" r="36" fill="url(#sgFlash)" /></Svg>
      </Animated.View>

      {/* Target ring — smaller (32px) to avoid overflow */}
      <Animated.View style={[styles.targetRing, { left: jumpTarget.x - 16, top: jumpTarget.y - 16, borderColor: jumpColor + '99' }, targetRingStyle]} pointerEvents="none" />
      <Animated.View style={[styles.targetRing, { left: currentPos.x - 16, top: currentPos.y - 16, borderColor: '#ffffff33' }, currentRingStyle]} pointerEvents="none" />

      {/* Main orb */}
      <Animated.View style={[styles.orb, orbStyle]} pointerEvents="none">
        <FocusDot color={jumpColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', left: 0, top: 0, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  flashWrap: { position: 'absolute', left: 0, top: 0, width: 72, height: 72 },
  targetRing: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.04)' },
});
