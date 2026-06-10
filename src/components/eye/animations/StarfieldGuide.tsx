import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import { colors } from '@/constants/colors';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  active: boolean;
}

const STAR_COUNT = 18;
const ARENA = 260;
const CENTER = 130;

export function StarfieldGuide({ active }: Props) {
  // Breathing scale for the zen mandala (1.0 to 1.35)
  const breath = useSharedValue(1.0);
  
  // Continuous rotation (in radians)
  const rotateVal = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(breath);
      cancelAnimation(rotateVal);
      breath.value = 1.0;
      rotateVal.value = 0;
      return;
    }

    // Slow, deep meditation breathing pulse (5s loop: 2.5s inhale, 2.5s exhale)
    breath.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Continuous slow rotation of mandala
    rotateVal.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 12000, easing: Easing.linear }),
      -1,
    );
  }, [active, breath, rotateVal]);

  // Scale + rotate around the mandala center via direct origin props.
  // The `transform` string form crashes Fabric Android (RNSVGGroupManagerDelegate.setProp).
  const outerProps = useAnimatedProps(() => {
    const deg = (rotateVal.value * 180) / Math.PI;
    return {
      scale: breath.value,
      rotation: deg,
      originX: CENTER,
      originY: CENTER,
    };
  });

  const innerProps = useAnimatedProps(() => {
    const deg = -(rotateVal.value * 180) / Math.PI;
    const s = 1 + (breath.value - 1) * 0.5;
    return {
      scale: s,
      rotation: deg,
      originX: CENTER,
      originY: CENTER,
    };
  });

  const stars = useMemo(() => {
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      cx: Math.random() * (ARENA - 40) + 20,
      cy: Math.random() * (ARENA - 40) + 20,
      r: Math.random() * 1.5 + 0.6,
      delay: i * 150,
    }));
  }, []);

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="zenGlow" cx="130" cy="130" r="75" fx="130" fy="130" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#7B61FF" stopOpacity="0.22" />
            <Stop offset="50%" stopColor="#4FC3F7" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#040408" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ambient background glow */}
        <Circle cx="130" cy="130" r="85" fill="url(#zenGlow)" />

        {/* Flickering Background Stars */}
        {stars.map((s) => (
          <StarNode key={s.id} cx={s.cx} cy={s.cy} r={s.r} delay={s.delay} active={active} />
        ))}

        {/* Mandala Outer Group (Clockwise) */}
        <AnimatedG animatedProps={outerProps}>
          {/* Outer ring */}
          <Circle
            cx="130"
            cy="130"
            r="48"
            stroke="rgba(79, 195, 247, 0.3)"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Intersecting sacred geometry loops */}
          <Circle cx="106" cy="130" r="24" stroke="rgba(123, 97, 255, 0.15)" strokeWidth="1" fill="none" />
          <Circle cx="154" cy="130" r="24" stroke="rgba(123, 97, 255, 0.15)" strokeWidth="1" fill="none" />
          <Circle cx="130" cy="106" r="24" stroke="rgba(123, 97, 255, 0.15)" strokeWidth="1" fill="none" />
          <Circle cx="130" cy="154" r="24" stroke="rgba(123, 97, 255, 0.15)" strokeWidth="1" fill="none" />
        </AnimatedG>

        {/* Mandala Inner Group (Counter-Clockwise) */}
        <AnimatedG animatedProps={innerProps}>
          {/* Inner core rings intersecting */}
          <Circle cx="118" cy="130" r="18" stroke="rgba(110, 231, 183, 0.25)" strokeWidth="1" fill="none" />
          <Circle cx="142" cy="130" r="18" stroke="rgba(110, 231, 183, 0.25)" strokeWidth="1" fill="none" />
          <Circle cx="130" cy="118" r="18" stroke="rgba(110, 231, 183, 0.25)" strokeWidth="1" fill="none" />
          <Circle cx="130" cy="142" r="18" stroke="rgba(110, 231, 183, 0.25)" strokeWidth="1" fill="none" />

          {/* Tiny center core ring */}
          <Circle
            cx="130"
            cy="130"
            r="10"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.2"
            fill="none"
          />
        </AnimatedG>

        {/* Ambient center point */}
        <Circle cx="130" cy="130" r="2" fill="#E0F7FA" />
      </Svg>

      <View style={styles.textContainer}>
        <Text style={styles.closeText}>Close your eyes</Text>
        <Text style={styles.sublabel}>Let them rest completely</Text>
      </View>
    </View>
  );
}

// Single star element with custom delay and pulsing opacity
function StarNode({ cx, cy, r, delay, active }: { cx: number; cy: number; r: number; delay: number; active: boolean }) {
  const opacity = useSharedValue(0.1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(opacity);
      opacity.value = 0.1;
      return;
    }

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1500 }),
          withTiming(0.1, { duration: 1500 }),
        ),
        -1,
      ),
    );
  }, [active, delay, opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      fill="#FFFFFF"
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  arena: {
    width: 260,
    height: 260,
    borderRadius: 20,
    backgroundColor: '#040408',
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  closeText: {
    fontSize: 19,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontWeight: '500',
  },
});
