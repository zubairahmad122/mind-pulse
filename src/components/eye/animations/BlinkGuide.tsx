import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';
import { colors } from '@/constants/colors';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  active: boolean;
}

// Iris radial fibers — 16 short strokes from limbus inward
const FIBER_COUNT = 16;
const FIBERS = Array.from({ length: FIBER_COUNT }, (_, i) => {
  const a = (i / FIBER_COUNT) * Math.PI * 2;
  return {
    x1: 130 + Math.cos(a) * 20,
    y1: 130 + Math.sin(a) * 20,
    x2: 130 + Math.cos(a) * 30,
    y2: 130 + Math.sin(a) * 30,
    op: 0.25 + (i % 3) * 0.15,
  };
});

export function BlinkGuide({ active }: Props) {
  // 0 = open, 1 = closed
  const blink = useSharedValue(0);
  const irisRotation = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(blink);
      cancelAnimation(irisRotation);
      blink.value = 0;
      irisRotation.value = 0;
      return;
    }

    // Slow deliberate blink: 1.0s close → 0.5s hold → 0.9s open → 2.6s rest = 5s cycle
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 900, easing: Easing.bezier(0.25, 1, 0.5, 1) }),
        withTiming(0, { duration: 2600 }),
      ),
      -1,
    );

    irisRotation.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
    );
  }, [active, blink, irisRotation]);

  // Use react-native-svg's direct transform PROPS (translateY / rotation /
  // originX/Y) instead of a `transform` string. The string form crashes Fabric
  // Android inside RNSVGGroupManagerDelegate.setProp (ClassCastException).
  const topLidProps = useAnimatedProps(() => ({
    translateY: blink.value * 56,
  }));

  const bottomLidProps = useAnimatedProps(() => ({
    translateY: -blink.value * 56,
  }));

  const irisProps = useAnimatedProps(() => ({
    rotation: irisRotation.value,
    originX: 130,
    originY: 130,
    opacity: 1 - blink.value * 0.6,
  }));

  // Pupil dilates slightly during the close (low light reflex feel)
  const pupilProps = useAnimatedProps(() => ({
    r: 11 + blink.value * 2.5,
    opacity: 1 - blink.value * 0.4,
  }));

  // Catchlight fades when eye closes
  const catchlightProps = useAnimatedProps(() => ({
    opacity: 0.85 * (1 - blink.value),
  }));

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" viewBox="0 0 260 260">
        <Defs>
          {/* Iris gradient: warm center, cool outer */}
          <RadialGradient id="irisGrad" cx="130" cy="130" r="32" fx="126" fy="126" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#80F5FF" stopOpacity="1" />
            <Stop offset="55%" stopColor="#4FC3F7" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#2C3E78" stopOpacity="0.85" />
          </RadialGradient>

          {/* Sclera (eye white) gradient — subtle warmth */}
          <RadialGradient id="scleraGrad" cx="130" cy="130" r="82" fx="130" fy="125" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#F4F1FF" stopOpacity="0.06" />
            <Stop offset="75%" stopColor="#1a1535" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0a0818" stopOpacity="0.6" />
          </RadialGradient>

          <RadialGradient id="outerGlow" cx="130" cy="130" r="110" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="rgba(123,97,255,0.18)" />
            <Stop offset="100%" stopColor="rgba(10,14,38,0)" />
          </RadialGradient>

          {/* Eyelid skin gradient */}
          <LinearGradient id="lidTopGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1a1535" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#2a1f55" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="lidBotGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#1a1535" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#2a1f55" stopOpacity="1" />
          </LinearGradient>

          {/* Clip everything to the eye contour */}
          <ClipPath id="eyeClip">
            <Circle cx="130" cy="130" r="78" />
          </ClipPath>
        </Defs>

        {/* Ambient outer glow */}
        <Circle cx="130" cy="130" r="110" fill="url(#outerGlow)" />

        {/* Sclera ring base */}
        <Circle cx="130" cy="130" r="78" fill="url(#scleraGrad)" />

        {/* Soft dotted contour */}
        <Circle
          cx="130" cy="130" r="78"
          stroke="rgba(123,97,255,0.35)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Iris assembly inside clip */}
        <G clipPath="url(#eyeClip)">
          {/* Iris base disc */}
          <AnimatedG animatedProps={irisProps}>
            <Circle cx="130" cy="130" r="32" fill="url(#irisGrad)" />
            {/* Limbus ring (the dark outer iris boundary) */}
            <Circle cx="130" cy="130" r="32" stroke="#0A0E1A" strokeWidth="1.5" fill="none" opacity="0.6" />
            {/* Radial fibers — gives the iris real texture */}
            {FIBERS.map((f, i) => (
              <Line
                key={i}
                x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2}
                stroke="#FFFFFF"
                strokeWidth="0.8"
                opacity={f.op}
              />
            ))}
            {/* Inner accent ring */}
            <Circle cx="130" cy="130" r="19" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none" />
          </AnimatedG>

          {/* Pupil — dilates slightly with blink */}
          <AnimatedCircle
            cx={130} cy={130}
            fill="#05060E"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="0.5"
            animatedProps={pupilProps}
          />

          {/* Specular catchlight — the spark of life */}
          <AnimatedCircle
            cx={124} cy={124} r={3}
            fill="#FFFFFF"
            animatedProps={catchlightProps}
          />
          <AnimatedCircle
            cx={132} cy={120} r={1.2}
            fill="#FFFFFF"
            animatedProps={catchlightProps}
          />

          {/* Top eyelid — curved upper lid that meets bottom in a soft curve */}
          <AnimatedG animatedProps={topLidProps}>
            <Path
              d="M 40,40 L 220,40 L 220,80 Q 175,118 130,118 Q 85,118 40,80 Z"
              fill="url(#lidTopGrad)"
            />
            {/* Lash line */}
            <Path
              d="M 60,80 Q 130,118 200,80"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Crease */}
            <Path
              d="M 70,68 Q 130,98 190,68"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              fill="none"
            />
          </AnimatedG>

          {/* Bottom eyelid */}
          <AnimatedG animatedProps={bottomLidProps}>
            <Path
              d="M 40,220 L 220,220 L 220,180 Q 175,142 130,142 Q 85,142 40,180 Z"
              fill="url(#lidBotGrad)"
            />
            {/* Bottom lash line */}
            <Path
              d="M 60,180 Q 130,142 200,180"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="1.2"
              fill="none"
            />
          </AnimatedG>
        </G>

        {/* Outer eye contour (over everything) */}
        <Circle
          cx="130" cy="130" r="78"
          stroke="rgba(123,97,255,0.4)"
          strokeWidth="1.2"
          fill="none"
        />
      </Svg>

      <Text style={styles.label}>Slow deliberate blinks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    bottom: 4,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});
