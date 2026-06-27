import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop, G, Path } from 'react-native-svg';
import { FocusDot } from './FocusDot';

interface Props { active: boolean }

const CENTER = 130, RING_R = 95;
const BASE_HOLD_MS = 3000, MOVE_MS = 320;
const SPEED_INTERVAL = 3000, SPEED_STEP = 0.2, MAX_SPEED = 3.0;

interface GazePos { x: number; y: number; label: string; muscle: string }
const SQRT = Math.SQRT1_2;

const POSITIONS: GazePos[] = [
  { x: CENTER, y: CENTER - RING_R, label: 'Up', muscle: 'Sup. Rectus' },
  { x: CENTER + RING_R * SQRT, y: CENTER - RING_R * SQRT, label: 'Up-Right', muscle: 'Sup. Oblique' },
  { x: CENTER + RING_R, y: CENTER, label: 'Right', muscle: 'Lat. Rectus' },
  { x: CENTER + RING_R * SQRT, y: CENTER + RING_R * SQRT, label: 'Down-Right', muscle: 'Inf. Oblique' },
  { x: CENTER, y: CENTER + RING_R, label: 'Down', muscle: 'Inf. Rectus' },
  { x: CENTER - RING_R * SQRT, y: CENTER + RING_R * SQRT, label: 'Down-Left', muscle: 'Inf. Oblique' },
  { x: CENTER - RING_R, y: CENTER, label: 'Left', muscle: 'Med. Rectus' },
  { x: CENTER - RING_R * SQRT, y: CENTER - RING_R * SQRT, label: 'Up-Left', muscle: 'Sup. Oblique' },
];

const MUSCLE_COLORS: Record<string, string> = {
  'Sup. Rectus': '#4FC3F7', 'Sup. Oblique': '#a78bfa', 'Lat. Rectus': '#6ee7b7',
  'Inf. Oblique': '#fb7185', 'Inf. Rectus': '#fbbf24', 'Med. Rectus': '#f97316',
};

export function CardinalGazesGuide({ active }: Props) {
  const [posIdx, setPosIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showCenter, setShowCenter] = useState(true);
  const prevSpeed = useRef(1);
  const tx = useSharedValue(POSITIONS[0].x);
  const ty = useSharedValue(POSITIONS[0].y);
  const flash = useSharedValue(0);
  const pulse = useSharedValue(0);
  const wobbleX = useSharedValue(0);
  const wobbleY = useSharedValue(0);

  const current = POSITIONS[posIdx];
  const currentColor = MUSCLE_COLORS[current.muscle] || '#fbbf24';

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
    const speedId = setInterval(() => setSpeed(s => Math.min(s + SPEED_STEP, MAX_SPEED)), SPEED_INTERVAL);
    const wiggle = () => {
      wobbleX.value = withTiming((Math.random() - 0.5) * 2.5, { duration: 400, easing: Easing.inOut(Easing.ease) });
      wobbleY.value = withTiming((Math.random() - 0.5) * 2.5, { duration: 400, easing: Easing.inOut(Easing.ease) });
    };
    wiggle();
    const wId = setInterval(wiggle, 500);
    return () => { clearInterval(speedId); clearInterval(wId); };
  }, [active, wobbleX, wobbleY]);

  // Random position jumps — start with a short center hold, then random
  useEffect(() => {
    if (!active) { setPosIdx(0); setShowCenter(true); tx.value = POSITIONS[0].x; ty.value = POSITIONS[0].y; return; }
    // Show center for 1.5s first
    const centerTimer = setTimeout(() => setShowCenter(false), 1500);
    const holdMs = BASE_HOLD_MS / speed;
    const id = setInterval(() => {
      setPosIdx(prev => {
        let next;
        do { next = Math.floor(Math.random() * POSITIONS.length); } while (next === prev);
        return next;
      });
    }, holdMs);
    return () => { clearTimeout(centerTimer); clearInterval(id); };
  }, [active, speed, tx, ty]);

  // Animate to position
  useEffect(() => {
    if (showCenter) return;
    const p = POSITIONS[posIdx];
    tx.value = withTiming(p.x, { duration: MOVE_MS, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(p.y, { duration: MOVE_MS, easing: Easing.out(Easing.cubic) });
    flash.value = withSequence(
      withTiming(1, { duration: MOVE_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
    );
    pulse.value = withSequence(
      withTiming(1, { duration: MOVE_MS + 60 }),
      withTiming(0.3, { duration: 500, easing: Easing.out(Easing.ease) }),
    );
    void Haptics.selectionAsync();
  }, [posIdx, showCenter, tx, ty, flash, pulse]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value - 16 + wobbleX.value }, { translateY: ty.value - 16 + wobbleY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value - 32 }, { translateY: ty.value - 32 }, { scale: 0.5 + flash.value * 1.8 }],
    opacity: flash.value * 0.6,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + pulse.value * 0.5,
    transform: [{ scale: 1 + pulse.value * 0.3 }],
  }));

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cgBg" cx="130" cy="130" r="130">
            <Stop offset="0%" stopColor={currentColor} stopOpacity="0.10" />
            <Stop offset="60%" stopColor="#22d3ee" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={CENTER} cy={CENTER} r="130" fill="url(#cgBg)" />

        {/* Reference ring — tighter to avoid overflow */}
        <Circle cx={CENTER} cy={CENTER} r={RING_R} stroke="rgba(251, 191, 36, 0.08)" strokeWidth="1" fill="none" strokeDasharray="2,5" />
        <Circle cx={CENTER} cy={CENTER} r="2.5" fill="rgba(255,255,255,0.15)" />

        {/* Crosshair */}
        <G transform={`translate(${CENTER}, ${CENTER})`}>
          <Path d="M 0,-102 L 0,102" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <Path d="M -102,0 L 102,0" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        </G>

        {/* Position markers */}
        {POSITIONS.map((p, i) => {
          const isCurrent = i === posIdx && !showCenter;
          const accent = MUSCLE_COLORS[p.muscle] || '#fbbf24';
          return (
            <G key={i}>
              <Circle cx={p.x} cy={p.y} r={isCurrent ? 10 : 4}
                fill={isCurrent ? accent + '55' : 'rgba(255,255,255,0.06)'}
                stroke={isCurrent ? accent + '99' : 'transparent'}
                strokeWidth={isCurrent ? 2 : 0}
              />
              <Circle cx={p.x} cy={p.y} r={isCurrent ? 4 : 2}
                fill={isCurrent ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}
              />
              <Path d={`M ${CENTER},${CENTER} L ${p.x},${p.y}`}
                stroke={isCurrent ? accent + '44' : 'rgba(255,255,255,0.03)'}
                strokeWidth={isCurrent ? 1.5 : 0.5}
                strokeDasharray="2,3"
              />
            </G>
          );
        })}
      </Svg>

      {/* Flash ring — smaller to avoid overflow */}
      <Animated.View style={[styles.flashWrap, flashStyle]} pointerEvents="none">
        <Svg width="64" height="64">
          <Defs>
            <RadialGradient id="cgFlash" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fff8b5" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="32" cy="32" r="32" fill="url(#cgFlash)" />
        </Svg>
      </Animated.View>

      {/* Position ring — smaller radius to stay in bounds */}
      {!showCenter && (
        <Animated.View
          style={[styles.landingRing, { left: current.x - 20, top: current.y - 20, borderColor: currentColor + '66' }, pulseStyle]}
          pointerEvents="none"
        />
      )}

      {/* Main orb */}
      <Animated.View style={[styles.orb, orbStyle]} pointerEvents="none">
        <FocusDot color={currentColor} />
      </Animated.View>


    </View>
  );
}

const styles = StyleSheet.create({
  arena: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', left: 0, top: 0, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  flashWrap: { position: 'absolute', left: 0, top: 0, width: 64, height: 64 },
  landingRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.03)' },

});
