import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
  G,
} from 'react-native-svg';
import { colors } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// NOTE: do NOT animate <G transform={...}> via animatedProps on Android Fabric —
// the string form crashes inside RNSVGGroupManagerDelegate.setProp
// (ClassCastException: String cannot be cast to ReadableMap/Array).
// Pulse the hands instead via an Animated.View wrapping the whole <Svg>.

interface Props {
  active: boolean;
}

export function PalmingGuide({ active }: Props) {
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(wave1);
      cancelAnimation(wave2);
      cancelAnimation(wave3);
      cancelAnimation(pulse);
      wave1.value = 0;
      wave2.value = 0;
      wave3.value = 0;
      pulse.value = 1;
      return;
    }

    // Smooth staggered heat waves
    wave1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );

    wave2.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );

    wave3.value = withDelay(
      2000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );

    // Deep heartbeat pulse
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [active, pulse, wave1, wave2, wave3]);

  const waveProps1 = useAnimatedProps(() => ({
    r: 25 + wave1.value * 95,
    opacity: Math.max(0, 1 - wave1.value),
  }));

  const waveProps2 = useAnimatedProps(() => ({
    r: 25 + wave2.value * 95,
    opacity: Math.max(0, 1 - wave2.value),
  }));

  const waveProps3 = useAnimatedProps(() => ({
    r: 25 + wave3.value * 95,
    opacity: Math.max(0, 1 - wave3.value),
  }));

  // Pulse is applied to the wrapper Animated.View — RN transform, Fabric-safe.
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Highly geometric, symmetric, and modern stylized hand shapes
  const handShieldLeft = "M 105,185 C 75,180 50,150 50,115 C 50,85 70,60 100,55 C 112,53 122,60 126,70 C 130,55 145,45 155,50 C 165,55 170,70 160,95 C 150,115 125,160 105,185 Z";
  const handShieldRight = "M 155,185 C 185,180 210,150 210,115 C 210,85 190,60 160,55 C 148,53 138,60 134,70 C 130,55 115,45 105,50 C 95,55 90,70 100,95 C 110,115 135,160 155,185 Z";

  return (
    <View style={styles.arena}>
      <Animated.View style={pulseStyle}>
        <Svg width="260" height="260" viewBox="0 0 260 260">
          <Defs>
            {/* Calming golden warm core */}
            <RadialGradient id="warmthCore" cx="130" cy="120" r="110">
              <Stop offset="0%" stopColor="#FFA726" stopOpacity="0.4" />
              <Stop offset="45%" stopColor="#22d3ee" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#0A0E1A" stopOpacity="0" />
            </RadialGradient>

            {/* Smooth linear gradient for glass shields */}
            <LinearGradient id="glassShieldGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="rgba(123, 97, 255, 0.4)" />
              <Stop offset="40%" stopColor="rgba(79, 195, 247, 0.2)" />
              <Stop offset="100%" stopColor="rgba(255, 255, 255, 0.03)" />
            </LinearGradient>

            {/* Glowing contour */}
            <LinearGradient id="contourGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFA726" stopOpacity="0.8" />
              <Stop offset="60%" stopColor="#22d3ee" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#4FC3F7" stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {/* Deep background warmth core */}
          <Circle cx="130" cy="120" r="95" fill="url(#warmthCore)" />

          {/* Radiating concentric heat waves */}
          <AnimatedCircle cx="130" cy="120" stroke="url(#contourGrad)" strokeWidth="2.5" strokeDasharray="3,6" fill="none" animatedProps={waveProps1} />
          <AnimatedCircle cx="130" cy="120" stroke="#22d3ee" strokeWidth="1.5" fill="none" animatedProps={waveProps2} />
          <AnimatedCircle cx="130" cy="120" stroke="#4FC3F7" strokeWidth="1" strokeDasharray="2,2" fill="none" animatedProps={waveProps3} />

          {/* Shielding geometric cupped hands (static <G> — pulse comes from the wrapping Animated.View) */}
          <G>
            {/* Left Shield */}
            <Path
              d={handShieldLeft}
              fill="url(#glassShieldGrad)"
              stroke="url(#contourGrad)"
              strokeWidth="1.8"
              transform="rotate(-12 130 120)"
            />
            {/* Right Shield */}
            <Path
              d={handShieldRight}
              fill="url(#glassShieldGrad)"
              stroke="url(#contourGrad)"
              strokeWidth="1.8"
              transform="rotate(12 130 120)"
            />

            {/* Golden energy cores in palm center */}
            <Circle cx="110" cy="115" r="4" fill="#FFA726" opacity="0.9" />
            <Circle cx="150" cy="115" r="4" fill="#FFA726" opacity="0.9" />
          </G>
        </Svg>
      </Animated.View>

      <Text style={styles.label}>Cup your hands over your eyes</Text>
      <Text style={styles.sublabel}>Feel the darkness and soothing warmth.</Text>
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
