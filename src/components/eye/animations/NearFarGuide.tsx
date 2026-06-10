import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

interface Props { active: boolean }

const CENTER = 130;
const FAR_Y = 50;
const NEAR_Y = 165;
const BASE_FADE_MS = 600;
const BASE_HOLD_MS = 2000;
const SPEED_INTERVAL = 4000;
const SPEED_STEP = 0.2;
const MAX_SPEED = 3.0;
const FAR_COLOR = '#A78BFA';
const NEAR_COLOR = '#80F5FF';

// Deterministic stars for ambiance
interface Star { x: number; y: number; r: number; o: number }
function useStars(): Star[] {
  return useMemo(() => {
    const stars: Star[] = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 24; i++) {
      stars.push({ x: 6 + rnd() * 248, y: 6 + rnd() * 248, r: 0.4 + rnd() * 1.2, o: 0.15 + rnd() * 0.4 });
    }
    return stars;
  }, []);
}

export function NearFarGuide({ active }: Props) {
  const focus = useSharedValue(0);
  const [speed, setSpeed] = useState(1);
  const prevSpeed = useRef(1);
  const stars = useStars();

  const farPulse = useSharedValue(0);
  const nearPulse = useSharedValue(0);

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

  // Speed up
  useEffect(() => {
    if (!active) { setSpeed(1); return; }
    const id = setInterval(() => setSpeed(s => Math.min(s + SPEED_STEP, MAX_SPEED)), SPEED_INTERVAL);
    return () => clearInterval(id);
  }, [active]);

  // Focus crossfade
  useEffect(() => {
    if (!active) { cancelAnimation(focus); focus.value = 0; return; }
    const fade = BASE_FADE_MS / speed;
    const hold = BASE_HOLD_MS / speed;
    focus.value = withRepeat(
      withSequence(
        withTiming(1, { duration: fade, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: hold }),
        withTiming(0, { duration: fade, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: hold }),
      ), -1,
    );
  }, [active, focus, speed]);

  // Far target — slow gentle pulse
  useEffect(() => {
    if (!active) { cancelAnimation(farPulse); farPulse.value = 0; return; }
    farPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ), -1,
    );
  }, [active, farPulse]);

  // Near target — faster pulse
  useEffect(() => {
    if (!active) { cancelAnimation(nearPulse); nearPulse.value = 0; return; }
    nearPulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ), -1,
    );
  }, [active, nearPulse]);

  // Animated styles
  const farStyle = useAnimatedStyle(() => {
    'worklet';
    const f = 1 - focus.value;
    const p = farPulse.value;
    return { transform: [{ scale: 0.5 + f * 0.6 }, { translateY: (1 - f) * 6 }], opacity: 0.1 + f * 0.9 };
  });

  const nearStyle = useAnimatedStyle(() => {
    'worklet';
    const f = focus.value;
    const p = nearPulse.value;
    const s = 0.4 + f * 0.8;
    return { transform: [{ scale: s * (0.92 + p * 0.08) }, { translateY: (1 - f) * 8 }], opacity: 0.1 + f * 0.9 };
  });

  const farGlowStyle = useAnimatedStyle(() => {
    'worklet';
    const f = 1 - focus.value;
    return { transform: [{ scale: 0.6 + f * 0.5 }], opacity: 0.1 + f * 0.7 };
  });

  const nearGlowStyle = useAnimatedStyle(() => {
    'worklet';
    const f = focus.value;
    return { transform: [{ scale: 0.5 + f * 0.5 }], opacity: 0.1 + f * 0.6 };
  });

  const gaugeFillStyle = useAnimatedStyle(() => {
    'worklet';
    return { height: `${15 + focus.value * 80}%`, backgroundColor: focus.value > 0.5 ? NEAR_COLOR : FAR_COLOR };
  });

  return (
    <View style={styles.arena}>
      {/* Background */}
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="nfBg" cx="130" cy="100" r="150">
            <Stop offset="0%" stopColor="#191445" />
            <Stop offset="50%" stopColor="#0e0b22" />
            <Stop offset="100%" stopColor="#050410" />
          </RadialGradient>
          <RadialGradient id="nfHaze" cx="130" cy="50" r="120">
            <Stop offset="0%" stopColor="#7b61ff" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#050410" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="130" cy="130" r="130" fill="url(#nfBg)" />
        <Circle cx="130" cy="50" r="120" fill="url(#nfHaze)" />
        {/* Subtle stars */}
        {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.o} />)}
      </Svg>

      {/* FAR target — large circle with glow */}
      <Animated.View style={[StyleSheet.absoluteFill, farGlowStyle]} pointerEvents="none">
        <Svg width="260" height="260">
          <Defs>
            <RadialGradient id="farG" cx={CENTER} cy={FAR_Y} r="55" fx={CENTER} fy={FAR_Y} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={FAR_COLOR} stopOpacity="0.6" />
              <Stop offset="50%" stopColor={FAR_COLOR} stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#050410" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={FAR_Y} r="55" fill="url(#farG)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, farStyle]} pointerEvents="none">
        <Svg width="260" height="260">
          <Defs>
            <RadialGradient id="farDot" cx={CENTER} cy={FAR_Y} r="24" fx={CENTER} fy={FAR_Y} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="40%" stopColor={FAR_COLOR} stopOpacity="0.9" />
              <Stop offset="100%" stopColor={FAR_COLOR} stopOpacity="0.3" />
            </RadialGradient>
          </Defs>
          {/* Outer ring */}
          <Circle cx={CENTER} cy={FAR_Y} r="24" stroke={FAR_COLOR} strokeWidth="1.5" fill="none" opacity="0.5" />
          {/* Core */}
          <Circle cx={CENTER} cy={FAR_Y} r="16" fill="url(#farDot)" />
          {/* Center */}
          <Circle cx={CENTER} cy={FAR_Y} r="5" fill="#FFFFFF" />
        </Svg>
      </Animated.View>

      {/* NEAR target — circle with ring */}
      <Animated.View style={[StyleSheet.absoluteFill, nearGlowStyle]} pointerEvents="none">
        <Svg width="260" height="260">
          <Defs>
            <RadialGradient id="nearG" cx={CENTER} cy={NEAR_Y} r="60" fx={CENTER} fy={NEAR_Y} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={NEAR_COLOR} stopOpacity="0.5" />
              <Stop offset="50%" stopColor={NEAR_COLOR} stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#050410" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={NEAR_Y} r="60" fill="url(#nearG)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, nearStyle]} pointerEvents="none">
        <Svg width="260" height="260">
          <Defs>
            <RadialGradient id="nearDot" cx={CENTER} cy={NEAR_Y} r="20" fx={CENTER} fy={NEAR_Y} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="35%" stopColor={NEAR_COLOR} stopOpacity="0.9" />
              <Stop offset="100%" stopColor={NEAR_COLOR} stopOpacity="0.2" />
            </RadialGradient>
          </Defs>
          {/* Animated ring */}
          <Circle cx={CENTER} cy={NEAR_Y} r="24" stroke={NEAR_COLOR} strokeWidth="1.5" fill="none" opacity="0.6" />
          {/* Expanding outer ring */}
          <Circle cx={CENTER} cy={NEAR_Y} r="14" stroke={NEAR_COLOR} strokeWidth="1" fill="none" opacity={0.3} />
          {/* Core */}
          <Circle cx={CENTER} cy={NEAR_Y} r="14" fill="url(#nearDot)" />
          {/* Center */}
          <Circle cx={CENTER} cy={NEAR_Y} r="4" fill="#FFFFFF" />
        </Svg>
      </Animated.View>

      {/* Depth gauge */}
      <View style={styles.gaugeWrap}>
        <View style={styles.gaugeTrack}><Animated.View style={[styles.gaugeFill, gaugeFillStyle]} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gaugeWrap: { position: 'absolute', right: 8, top: 40, bottom: 48, width: 12, alignItems: 'center' },
  gaugeTrack: { width: 4, flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' },
  gaugeFill: { width: 4, borderRadius: 2 },
});
