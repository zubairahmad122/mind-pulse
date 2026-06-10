import type { BreathingPattern } from '@/constants/breathingPatterns';
import { BREATHING_PATTERNS } from '@/constants/breathingPatterns';
import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface BreathingOrbProps {
  pattern: BreathingPattern;
  isRunning: boolean;
  isPaused: boolean;
  size?: number;
  secondsLeft?: number;
  phaseFill?: number; // 0-100, how far through the current phase
}

const ORBS_SIZE = 180;

function BreathingOrbInner({ pattern, isRunning, isPaused, size = ORBS_SIZE, secondsLeft, phaseFill }: BreathingOrbProps) {
  const patternDef = BREATHING_PATTERNS[pattern];

  // ─── Shared values ───────────────────────────────────────────────────────
  const scale         = useSharedValue(1);
  const glowOpacity   = useSharedValue(0.2);
  const ringScale     = useSharedValue(1);
  const ringOpacity   = useSharedValue(0);
  const coreBright    = useSharedValue(0.5);
  const innerPulse    = useSharedValue(0.6);
  const sparkle1      = useSharedValue(0);
  const sparkle2      = useSharedValue(0);
  const progressFade  = useSharedValue(0);

  // ─── Animations ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isPaused) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 1000 }),
          withTiming(0.1, { duration: 1000 }),
        ),
        -1,
        false,
      );
      ringOpacity.value = withTiming(0);
      progressFade.value = withTiming(0);
      coreBright.value = withTiming(0, { duration: 300 });
      innerPulse.value = withTiming(0.4, { duration: 300 });
      return;
    }

    coreBright.value = 0;

    const durIn  = patternDef.phases.find(p => p.name === 'inhale')?.duration  || 4000;
    const durEx  = patternDef.phases.find(p => p.name === 'exhale')?.duration  || 4000;
    const durHi  = patternDef.phases.find(p => p.name === 'hold-in')?.duration || 2000;
    const durHo  = patternDef.phases.find(p => p.name === 'hold-out')?.duration || 2000;

    if (pattern === 'calm') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.92, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: durIn * 1000,  easing: Easing.out(Easing.quad) }),
          withTiming(1.18, { duration: durHi * 1000 }),
          withTiming(0.78, { duration: durEx * 1000,  easing: Easing.in(Easing.quad) }),
          withTiming(0.78, { duration: durHo * 1000 }),
        ),
        -1,
        false,
      );
    }

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800 }),
        withTiming(0.15, { duration: 1000 }),
      ),
      -1,
      false,
    );

    const cycleDuration = (durIn + durHi + durEx + durHo) * 1000;
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: cycleDuration * 0.05 }),
        withTiming(1,   { duration: cycleDuration * 0.1 }),
        withTiming(0,   { duration: cycleDuration * 0.85 }),
      ),
      -1,
      false,
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: cycleDuration * 0.05 }),
        withTiming(1.40, { duration: cycleDuration * 0.95 }),
      ),
      -1,
      false,
    );

    coreBright.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: durIn * 1000, easing: Easing.out(Easing.quad) }),
        withTiming(1,   { duration: durHi * 1000 }),
        withTiming(0.3, { duration: durEx * 1000, easing: Easing.in(Easing.quad) }),
        withTiming(0.3, { duration: durHo * 1000 }),
      ),
      -1,
      false,
    );

    innerPulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    sparkle1.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
    sparkle2.value = withRepeat(
      withDelay(2000, withTiming(1, { duration: 4000, easing: Easing.linear })),
      -1,
      false,
    );

    // Fade in progress ring
    progressFade.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });

    return () => {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(coreBright);
      cancelAnimation(innerPulse);
      cancelAnimation(sparkle1);
      cancelAnimation(sparkle2);
      cancelAnimation(progressFade);
    };
  }, [isRunning, isPaused, pattern, patternDef]);

  // ─── Animated styles ─────────────────────────────────────────────────────
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringWaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(coreBright.value, [0.3, 1], [0.3, 0.9]),
    transform: [{ scale: interpolate(coreBright.value, [0.3, 1], [0.5, 0.85]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(innerPulse.value, [0.5, 0.9], [0.15, 0.5]),
  }));

  const progressFadeStyle = useAnimatedStyle(() => ({
    opacity: progressFade.value,
  }));

  const spark1Style = useAnimatedStyle(() => {
    const angle = sparkle1.value * 360;
    return {
      transform: [
        { rotate: `${angle}deg` },
        { translateX: size * 0.55 },
        { rotate: `${-angle}deg` },
      ],
      opacity: interpolate(Math.sin(sparkle1.value * Math.PI * 4), [-1, 1], [0, 0.8]),
    };
  });

  const spark2Style = useAnimatedStyle(() => {
    const angle = sparkle2.value * 360;
    return {
      transform: [
        { rotate: `${angle}deg` },
        { translateX: -size * 0.55 },
        { rotate: `${-angle}deg` },
      ],
      opacity: interpolate(Math.sin(sparkle2.value * Math.PI * 4), [-1, 1], [0, 0.8]),
    };
  });

  const orbSize = size -40 ;
  const containerSize = orbSize + 80;
  const ringSize = orbSize + 20;

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      {/* ── Outer glow ── */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: orbSize + 50,
            height: orbSize + 50,
            borderRadius: (orbSize + 50) / 2,
            backgroundColor: patternDef.glowColor,
          },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      {/* ── Expanding ring wave ── */}
      <Animated.View
        style={[
          styles.ringWave,
          {
            width: orbSize + 20,
            height: orbSize + 20,
            borderRadius: (orbSize + 20) / 2,
            borderColor: patternDef.color,
          },
          ringWaveStyle,
        ]}
        pointerEvents="none"
      />

      {/* ── Animated circular progress ring ── */}
      <Animated.View style={[styles.progressRingContainer, { width: ringSize, height: ringSize, left: (containerSize - ringSize) / 2, top: (containerSize - ringSize) / 2 }, progressFadeStyle]} pointerEvents="none">
        <AnimatedCircularProgress
          size={ringSize}
          width={3}
          fill={phaseFill ?? 0}
          tintColor={patternDef.color}
          tintTransparency
          backgroundColor="rgba(255,255,255,0.06)"
          lineCap="round"
          rotation={-90}
          duration={800}
          style={styles.progressRing}
        />
      </Animated.View>

      {/* ── Main orb with depth layers ── */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: patternDef.color,
            shadowColor: patternDef.color,
          },
          orbStyle,
        ]}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.innerCore,
            {
              borderRadius: orbSize / 2,
              backgroundColor: '#fff',
            },
            innerStyle,
          ]}
        />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            { borderRadius: orbSize / 2 },
            shimmerStyle,
          ]}
        />
        {secondsLeft !== undefined && secondsLeft > 0 && (
          <Text style={[styles.timerText, { color: 'rgba(255, 255, 255, 0.85)' }]}>
            {secondsLeft}
          </Text>
        )}
      </Animated.View>

      {/* ── Orbiting sparkle dots ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkDot,
          {
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: patternDef.color,
            shadowColor: patternDef.color,
          },
          spark1Style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkDot,
          {
            width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: patternDef.color,
            shadowColor: patternDef.color,
          },
          spark2Style,
        ]}
      />
    </View>
  );
}

export const BreathingOrb = memo(BreathingOrbInner);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.4,
    elevation: 10,
  },
  ringWave: {
    position: 'absolute',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  progressRingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    width: '100%',
    height: '100%',
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 24,
    shadowOpacity: 0.5,
    elevation: 8,
    overflow: 'hidden',
  },
  innerCore: {
    position: 'absolute',
  },
  shimmer: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1000,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '800',
    ...StyleSheet.absoluteFill as object,
    textAlign: 'center',
    textAlignVertical: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    zIndex: 2,
    includeFontPadding: false,
  },
  sparkDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 1,
    elevation: 4,
  },
});
