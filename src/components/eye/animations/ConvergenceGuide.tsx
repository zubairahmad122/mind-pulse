import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { FocusDot } from './FocusDot';

interface Props { active: boolean }

const CENTER_X = 130, FAR_Y = 40, NEAR_Y = 170;
const GLOW_SIZE = 100;
const BASE_APPROACH_MS = 5000, BASE_NEAR_HOLD_MS = 1800, BASE_RECEDE_MS = 800, BASE_FAR_REST_MS = 500;
const SPEED_INTERVAL = 4000, SPEED_STEP = 0.2, MAX_SPEED = 3.0;
const AnimatedLine = Animated.createAnimatedComponent(Line);

export function ConvergenceGuide({ active }: Props) {
  const depth = useSharedValue(0);
  const [speed, setSpeed] = useState(1);
  const prevSpeed = useRef(1);
  const speedRef = useRef(1);
  const pulseGlow = useSharedValue(0);

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

  useEffect(() => {
    if (!active) { setSpeed(1); cancelAnimation(pulseGlow); pulseGlow.value = 0; return; }
    const id = setInterval(() => setSpeed(s => Math.min(s + SPEED_STEP, MAX_SPEED)), SPEED_INTERVAL);
    return () => clearInterval(id);
  }, [active, pulseGlow]);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Depth animation
  useEffect(() => {
    if (!active) { cancelAnimation(depth); cancelAnimation(pulseGlow); depth.value = 0; pulseGlow.value = 0; return; }
    let last = Date.now();
    let phase: 'approach' | 'hold' | 'recede' | 'rest' = 'approach';
    let elapsed = 0;
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const s = speedRef.current;
      const approach = BASE_APPROACH_MS / s;
      const nearHold = BASE_NEAR_HOLD_MS / s;
      const recede = BASE_RECEDE_MS / s;
      const farRest = BASE_FAR_REST_MS / s;
      elapsed += dt;
      if (phase === 'approach') {
        const t = Math.min(1, elapsed / approach);
        depth.value = t * t * (3 - 2 * t); // smoothstep
        if (elapsed >= approach) { phase = 'hold'; elapsed = 0; pulseGlow.value = withTiming(1, { duration: 200 }); }
      } else if (phase === 'hold') {
        depth.value = 1;
        if (elapsed >= nearHold) { phase = 'recede'; elapsed = 0; pulseGlow.value = withTiming(0, { duration: 300 }); }
      } else if (phase === 'recede') {
        const t = Math.min(1, elapsed / recede);
        depth.value = 1 - t * t;
        if (elapsed >= recede) { phase = 'rest'; elapsed = 0; }
      } else {
        depth.value = 0;
        if (elapsed >= farRest) { phase = 'approach'; elapsed = 0; }
      }
    }, 16);
    return () => clearInterval(id);
  }, [active, depth, pulseGlow]);

  const orbY = FAR_Y + (NEAR_Y - FAR_Y) * depth.value;
  const orbScale = 0.6 + depth.value * 1.4;

  const orbStyle = useAnimatedStyle(() => {
    'worklet';
    const y = FAR_Y + depth.value * (NEAR_Y - FAR_Y);
    const s = 0.6 + depth.value * 1.4;
    // Position center at CENTER_X, y, with original size ORB_SIZE, then scale
    return { transform: [{ translateX: CENTER_X - 16 }, { translateY: y - 16 }, { scale: s }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    const y = FAR_Y + depth.value * (NEAR_Y - FAR_Y);
    const g = 0.5 + depth.value * 1.5;
    return { transform: [{ translateX: CENTER_X - GLOW_SIZE / 2 }, { translateY: y - GLOW_SIZE / 2 }, { scale: g }], opacity: 0.1 + depth.value * 0.6 };
  });

  const tipProps = useAnimatedProps(() => {
    'worklet';
    const y = FAR_Y + depth.value * (NEAR_Y - FAR_Y);
    return { x2: CENTER_X, y2: y };
  });

  const depthFillStyle = useAnimatedStyle(() => ({ height: `${10 + depth.value * 90}%` }));

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="convBg" cx="130" cy="120" r="130">
            <Stop offset="0%" stopColor="#fb7185" stopOpacity="0.08" />
            <Stop offset="50%" stopColor="#22d3ee" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="130" cy="130" r="130" fill="url(#convBg)" />

        {/* Depth reference dots */}
        <Circle cx={CENTER_X} cy={FAR_Y} r="2" fill="rgba(255,255,255,0.12)" />
        <Circle cx={CENTER_X} cy={FAR_Y + 45} r="1.5" fill="rgba(255,255,255,0.06)" />
        <Circle cx={CENTER_X} cy={FAR_Y + 90} r="1.5" fill="rgba(255,255,255,0.06)" />
        <Circle cx={CENTER_X} cy={NEAR_Y} r="2" fill="rgba(255,255,255,0.12)" />

        {/* Guide lines from bottom to target */}
        <Line x1={CENTER_X - 60} y1={220} x2={CENTER_X} y2={FAR_Y}
          stroke="rgba(251, 113, 133, 0.15)" strokeWidth="1" strokeDasharray="3,5"
        />
        <Line x1={CENTER_X + 60} y1={220} x2={CENTER_X} y2={FAR_Y}
          stroke="rgba(251, 113, 133, 0.15)" strokeWidth="1" strokeDasharray="3,5"
        />
        <AnimatedLine x1={CENTER_X - 60} y1={220} x2={CENTER_X} y2={FAR_Y}
          stroke="rgba(251, 113, 133, 0.25)" strokeWidth="1.5" strokeDasharray="3,5"
          animatedProps={tipProps}
        />
        <AnimatedLine x1={CENTER_X + 60} y1={220} x2={CENTER_X} y2={FAR_Y}
          stroke="rgba(251, 113, 133, 0.25)" strokeWidth="1.5" strokeDasharray="3,5"
          animatedProps={tipProps}
        />
      </Svg>

      {/* Glow */}
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="glowFill" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fb7185" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#glowFill)" />
        </Svg>
      </Animated.View>

      {/* Orb */}
      <Animated.View style={[styles.orb, orbStyle]} pointerEvents="none">
        <FocusDot color="#fb7185" />
      </Animated.View>



      {/* Depth gauge */}
      <View style={styles.depthBar}>
        <Animated.View style={[styles.depthFill, depthFillStyle]} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  arena: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', left: 0, top: 0, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: GLOW_SIZE, height: GLOW_SIZE },
  depthBar: { position: 'absolute', right: 10, top: 40, bottom: 36, width: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' },
  depthFill: { width: 4, backgroundColor: '#fb7185', borderRadius: 2 },

});
