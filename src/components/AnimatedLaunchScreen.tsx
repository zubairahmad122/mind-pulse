import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { COLORS, FONTS } from '@/constants';

type AnimatedLaunchScreenProps = {
  ready: boolean;
  onFinish: () => void;
};

const MINIMUM_DISPLAY_TIME = 1900;
const MARK_SIZE = 112;

export function AnimatedLaunchScreen({
  ready,
  onFinish,
}: AnimatedLaunchScreenProps) {
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [entrance] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [orbit] = useState(() => new Animated.Value(0));
  const [shimmer] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      damping: 16,
      stiffness: 105,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    breathingLoop.start();
    orbitLoop.start();
    shimmerLoop.start();

    return () => {
      breathingLoop.stop();
      orbitLoop.stop();
      shimmerLoop.stop();
    };
  }, [breathe, entrance, orbit, shimmer]);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinimumTimeElapsed(true),
      MINIMUM_DISPLAY_TIME,
    );

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !minimumTimeElapsed) return;

    Animated.timing(exit, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [exit, minimumTimeElapsed, onFinish, ready]);

  const markScale = Animated.multiply(
    entrance,
    breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.035],
    }),
  );
  const orbitRotation = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessibilityLabel="Mind Pulse is starting"
      accessibilityRole="progressbar"
      style={[styles.container, { opacity: exit }]}
    >
      <LinearGradient
        colors={['#0C1225', COLORS.bg, '#040810']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.ambientLayer}>
        <View style={[styles.ambientOrb, styles.ambientOrbTop]} />
        <View style={[styles.ambientOrb, styles.ambientOrbBottom]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [22, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.markStage}>
          <Animated.View
            style={[
              styles.outerOrbit,
              { transform: [{ rotate: orbitRotation }] },
            ]}
          >
            <LinearGradient
              colors={['rgba(26,143,255,0.7)', 'rgba(0,212,255,0.04)']}
              style={styles.orbitDot}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.breatheRing,
              {
                opacity: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.16, 0],
                }),
                transform: [
                  {
                    scale: breathe.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.86, 1.28],
                    }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[styles.markShadow, { transform: [{ scale: markScale }] }]}
          >
            <LinearGradient
              colors={['rgba(25,57,112,0.95)', 'rgba(7,17,39,0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mark}
            >
              <View style={styles.markHighlight} />
              <Svg
                width={70}
                height={42}
                viewBox="0 0 70 42"
                accessibilityElementsHidden
              >
                <Defs>
                  <SvgGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#7EB8FF" />
                    <Stop offset="0.52" stopColor="#1A8FFF" />
                    <Stop offset="1" stopColor="#00D4FF" />
                  </SvgGradient>
                </Defs>
                <Path
                  d="M3 23h10l5-12 8 24 8-31 9 27 6-8h18"
                  fill="none"
                  stroke="url(#pulse)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={4}
                />
              </Svg>
            </LinearGradient>
          </Animated.View>
        </View>

        <View style={styles.wordmark}>
          <Text style={styles.title}>Mind Pulse</Text>
          <Animated.View
            style={[
              styles.titleAccent,
              {
                opacity: shimmer,
                transform: [
                  {
                    scaleX: shimmer.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1],
                    }),
                  },
                ],
              },
            ]}
          />
          <Text style={styles.tagline}>BREATHE • REST • REFOCUS</Text>
        </View>
      </Animated.View>

      <View style={styles.loadingTrack}>
        <Animated.View
          style={[
            styles.loadingGlow,
            {
              opacity: breathe.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 1],
              }),
              transform: [
                {
                  scaleX: breathe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    zIndex: 100,
  },
  ambientLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  ambientOrb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(26,143,255,0.07)',
  },
  ambientOrbTop: {
    top: -92,
    right: -126,
  },
  ambientOrbBottom: {
    bottom: -120,
    left: -150,
    backgroundColor: 'rgba(0,212,255,0.045)',
  },
  content: {
    alignItems: 'center',
    marginTop: -34,
  },
  markStage: {
    width: 178,
    height: 178,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerOrbit: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1,
    borderColor: 'rgba(126,184,255,0.12)',
  },
  orbitDot: {
    position: 'absolute',
    top: -3,
    left: 75,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breatheRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(26,143,255,0.06)',
  },
  markShadow: {
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 18,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(126,184,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  markHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  wordmark: {
    alignItems: 'center',
    marginTop: 24,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.heading,
    fontSize: 34,
    letterSpacing: -0.7,
  },
  titleAccent: {
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.blue,
    marginTop: 12,
    marginBottom: 15,
  },
  tagline: {
    color: 'rgba(126,184,255,0.68)',
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    letterSpacing: 2.4,
  },
  loadingTrack: {
    position: 'absolute',
    bottom: 64,
    width: 58,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  loadingGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.blue,
  },
});
