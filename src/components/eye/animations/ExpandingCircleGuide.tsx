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
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Line,
  G,
} from 'react-native-svg';
import { colors } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  active: boolean;
}

export function ExpandingCircleGuide({ active }: Props) {
  const gaze = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(gaze);
      cancelAnimation(pulse);
      gaze.value = 0;
      pulse.value = 1;
      return;
    }

    // Relaxing gaze drift (3.2s outward, 0.8s return)
    gaze.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Pulse for the celestial moon
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [active, gaze, pulse]);

  const ringProps = useAnimatedProps(() => {
    const yVal = 180 - gaze.value * 80; // Slide upwards towards moon
    const rVal = 10 + gaze.value * 48;  // Expand focus ring
    const opacityVal = Math.max(0, 1 - gaze.value); // Fade out

    return {
      cy: yVal,
      r: rVal,
      opacity: opacityVal,
    };
  });

  // Scale anchored at the moon's center (130, 95) via originX/Y. Avoid the
  // `transform` string form — it crashes Fabric Android inside
  // RNSVGGroupManagerDelegate.setProp (ClassCastException).
  const moonProps = useAnimatedProps(() => ({
    scale: pulse.value,
    originX: 130,
    originY: 95,
  }));

  // Mathematically perfect organic mountain path strings
  const mountainFar = "M 15,200 L 65,135 Q 95,115 125,145 L 185,105 L 245,170 L 245,245 L 15,245 Z";
  const mountainNear = "M 15,220 L 85,168 L 155,190 L 205,145 L 245,185 L 245,245 L 15,245 Z";

  return (
    <View style={styles.arena}>
      <Svg width="260" height="260" viewBox="0 0 260 260">
        <Defs>
          {/* Deep celestial sky background */}
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#060814" />
            <Stop offset="60%" stopColor="#111534" />
            <Stop offset="100%" stopColor="#251642" />
          </LinearGradient>

          {/* Mountains high-fidelity shading */}
          <LinearGradient id="mountFarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(123, 97, 255, 0.45)" />
            <Stop offset="100%" stopColor="#0B0D1B" />
          </LinearGradient>
          <LinearGradient id="mountNearGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(79, 195, 247, 0.35)" />
            <Stop offset="100%" stopColor="#080914" />
          </LinearGradient>

          {/* Glowing horizon sun/moon */}
          <RadialGradient id="celestialGlow" cx="130" cy="95" r="35">
            <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.8" />
            <Stop offset="45%" stopColor="#22d3ee" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Sky Base Card */}
        <Path d="M 15,15 L 245,15 L 245,245 L 15,245 Z" fill="url(#skyGrad)" />

        {/* Twinkling stars */}
        <Circle cx="50" cy="50" r="1" fill="#FFF" opacity="0.65" />
        <Circle cx="85" cy="35" r="1.5" fill="#FFF" opacity="0.8" />
        <Circle cx="185" cy="40" r="1.2" fill="#FFF" opacity="0.5" />
        <Circle cx="215" cy="65" r="1" fill="#FFF" opacity="0.75" />

        {/* Pulsing Glowing distant celestial orb */}
        <Circle cx="130" cy="95" r="35" fill="url(#celestialGlow)" />
        <AnimatedG animatedProps={moonProps}>
          <Circle cx="130" cy="95" r="11" fill="#EBFBFF" />
          <Circle cx="130" cy="95" r="8" fill="#FFF" opacity="0.9" />
        </AnimatedG>

        {/* Far mountain range */}
        <Path d={mountainFar} fill="url(#mountFarGrad)" />

        {/* Near mountain range */}
        <Path d={mountainNear} fill="url(#mountNearGrad)" />

        {/* Horizon guidance line */}
        <Line x1="25" y1="180" x2="235" y2="180" stroke="rgba(79, 195, 247, 0.18)" strokeWidth="1" strokeDasharray="4,4" />

        {/* Focus Ring that scales up and shifts from bottom (near) to center (far) */}
        <AnimatedCircle
          cx="130"
          stroke="#4FC3F7"
          strokeWidth="2"
          strokeDasharray="4,6"
          fill="none"
          animatedProps={ringProps}
        />

        {/* Near focal reference point */}
        <Circle cx="130" cy="180" r="5.5" fill="#FFA726" stroke="#000" strokeWidth="1" />
      </Svg>

      <Text style={styles.label}>Look 20+ feet away at the horizon</Text>
      <Text style={styles.sublabel}>Let your focus expand outward.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    bottom: 24,
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  sublabel: {
    position: 'absolute',
    bottom: 8,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});
