import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import AnimatedBackground from '@/components/AnimatedBackground';
import { BACKGROUND, FONTS, PILLAR_COLORS } from '@/constants/designSystem';

type AnimatedLaunchScreenProps = {
  ready: boolean;
  onReady: () => void;
  onFinish: () => void;
};

const MINIMUM_DISPLAY_TIME = 1200;

export function AnimatedLaunchScreen({
  ready,
  onReady,
  onFinish,
}: AnimatedLaunchScreenProps) {
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [entrance] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(1));
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breathingLoop.start();
    return () => breathingLoop.stop();
  }, [breathe, entrance]);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinimumTimeElapsed(true),
      MINIMUM_DISPLAY_TIME,
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !minimumTimeElapsed) return;
    const animation = Animated.timing(exit, {
      toValue: 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    // Native-driven animations can be interrupted when Android backgrounds or
    // resumes the app. Always remove the overlay; otherwise it can remain fully
    // transparent above the app forever.
    animation.start(finish);
    const fallback = setTimeout(finish, 600);

    return () => {
      clearTimeout(fallback);
      animation.stop();
    };
  }, [exit, finish, minimumTimeElapsed, ready]);

  // Hard ceiling, independent of `ready`: this overlay is full-screen and
  // opaque (zIndex 100) over the entire app. The effect above never even
  // runs until `ready` (fonts + auth) resolves, so a stuck font load or a
  // Firebase `onAuthStateChanged` that never fires on a given device/build
  // would otherwise leave it parked over the app forever with no recovery —
  // indistinguishable from a dead app, even though whatever screen is
  // underneath is still alive and responding to taps. This guarantees the
  // splash is gone within a bounded time no matter what upstream is slow or
  // broken.
  useEffect(() => {
    const ceiling = setTimeout(() => {
      exit.stopAnimation();
      exit.setValue(0);
      finish();
    }, 8000);
    return () => clearTimeout(ceiling);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot ceiling, must not reset if `finish`'s identity happens to change.
  }, []);

  return (
    <Animated.View
      accessibilityLabel="Mind Pulse is starting"
      accessibilityRole="progressbar"
      onLayout={onReady}
      style={[styles.container, { opacity: exit }]}
    >
      <AnimatedBackground />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoStage,
            {
              transform: [
                {
                  scale: breathe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1.02],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 240 220"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#00D4FF" stopOpacity={0.18} />
                <Stop offset="48%" stopColor="#1A8FFF" stopOpacity={0.06} />
                <Stop offset="100%" stopColor="#1A8FFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="240" height="220" fill="url(#launchGlow)" />
          </Svg>
          <Image
            source={require('@/assets/expo.icon/Assets/mind-pulse-playstore.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.title}>Mind Pulse</Text>
        <Text style={styles.tagline}>BREATHE · REST · REFOCUS</Text>
      </Animated.View>

      <View style={styles.loading}>
        {[0, 1, 2].map((dot) => (
          <Animated.View
            key={dot}
            style={[
              styles.loadingDot,
              {
                opacity: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange:
                    dot === 1
                      ? [0.28, 0.9]
                      : dot === 0
                        ? [0.7, 0.28]
                        : [0.4, 0.7],
                }),
              },
            ]}
          />
        ))}
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
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKGROUND.base,
  },
  content: {
    alignItems: 'center',
    marginTop: -24,
  },
  logoStage: {
    width: 240,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 190,
    height: 190,
  },
  title: {
    marginTop: -6,
    color: '#FFFFFF',
    fontFamily: FONTS.heading,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 12,
    paddingHorizontal: 4,
    color: 'rgba(126,184,255,0.62)',
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  loading: {
    position: 'absolute',
    bottom: 58,
    flexDirection: 'row',
    gap: 7,
  },
  loadingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PILLAR_COLORS.relax,
  },
});
