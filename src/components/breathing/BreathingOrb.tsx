import type { BreathingPattern } from '@/constants/breathingPatterns';
import { BREATHING_PATTERNS } from '@/constants/breathingPatterns';
import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
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
  /**
   * Current breathing phase ('inhale' | 'hold-in' | 'exhale' | 'hold-out').
   * The orb's motion IS the instruction: it expands for exactly the inhale
   * duration, freezes through holds, and contracts through the exhale — in
   * sync with the session timer, not a free-running loop of its own.
   */
  phaseName?: string | null;
  /** Seconds left in the current phase — the expand/contract animation length. */
  phaseSeconds?: number;
  /**
   * For the 'calm' pattern: seconds per direction of the free-breathing wave.
   * Narration sessions (Body Scan etc.) pass ~13 for a barely-there slow
   * breath; Calm Flow keeps the default 3.
   */
  waveSeconds?: number;
  accentColor?: string; // override the pattern color for a consistent feature accent
  /**
   * Hold the orb perfectly still. Used while the intro narration speaks — any
   * breathing-like motion before the exercise starts misleads the user into
   * breathing along too early.
   */
  still?: boolean;
}

const ORBS_SIZE = 180;

function BreathingOrbInner({ pattern, isRunning, isPaused, size = ORBS_SIZE, secondsLeft, phaseName, phaseSeconds, waveSeconds = 3, accentColor, still = false }: BreathingOrbProps) {
  const patternDef = BREATHING_PATTERNS[pattern];
  const orbColor = accentColor ?? patternDef.color;
  const orbGlow = accentColor ? accentColor + '33' : patternDef.glowColor;

  // ─── Shared values ───────────────────────────────────────────────────────
  const scale         = useSharedValue(1);
  const glowOpacity   = useSharedValue(0.2);
  const coreBright    = useSharedValue(0.5);
  const innerPulse    = useSharedValue(0.6);

  // Once the session feeds phases, THEY own the orb's size — even for the
  // 'calm' pattern. The free-running wave is only a fallback for sessions
  // that never produce phases (narration-style, phaseName stays null).
  const phaseDriven = !!phaseName;

  // Mode: still / idle / running ambience (glow + shimmer only — the orb's
  // SIZE is owned by the phase effect below so it can't drift out of sync).
  useEffect(() => {
    if (still) {
      // Settle to a calm, motionless state (assignments cancel running repeats).
      scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      glowOpacity.value = withTiming(0.18, { duration: 400 });
      coreBright.value = withTiming(0, { duration: 300 });
      innerPulse.value = withTiming(0.4, { duration: 300 });
      return;
    }

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
      coreBright.value = withTiming(0, { duration: 300 });
      innerPulse.value = withTiming(0.4, { duration: 300 });
      return;
    }

    // Calm fallback (no phases feeding the orb): gentle self-paced wave.
    if (pattern === 'calm' && !phaseDriven) {
      const wave = Math.max(2, waveSeconds) * 1000;
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: wave, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.92, { duration: wave, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      coreBright.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: wave, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: wave, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1600 }),
        withTiming(0.18, { duration: 1600 }),
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

    return () => {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
      cancelAnimation(coreBright);
      cancelAnimation(innerPulse);
    };
  }, [isRunning, isPaused, still, pattern, waveSeconds, phaseDriven]);

  // Phase-driven breathing (the direction signal): expand = breathe in,
  // freeze = hold, contract = breathe out. Runs over the phase's remaining
  // seconds so orb, label, cues, and haptics all move together.
  useEffect(() => {
    if (still || !isRunning || isPaused) return;

    if (!phaseName) {
      // Calm with no phases yet: the free wave (above) owns the orb.
      if (pattern === 'calm') return;
      // Waiting for the first inhale: settle small, ready to expand.
      scale.value = withTiming(0.82, { duration: 900, easing: Easing.inOut(Easing.ease) });
      coreBright.value = withTiming(0.3, { duration: 900 });
      return;
    }

    const dur = Math.max(700, (phaseSeconds ?? 4) * 1000);
    if (phaseName === 'inhale') {
      scale.value = withTiming(1.16, { duration: dur, easing: Easing.inOut(Easing.sin) });
      coreBright.value = withTiming(1, { duration: dur });
    } else if (phaseName === 'exhale') {
      scale.value = withTiming(0.82, { duration: dur, easing: Easing.inOut(Easing.sin) });
      coreBright.value = withTiming(0.3, { duration: dur });
    }
    // Holds: no assignment — the orb freezes exactly where the breath left it.
  }, [phaseName, phaseSeconds, still, isRunning, isPaused, pattern]);

  // ─── Animated styles ─────────────────────────────────────────────────────
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(coreBright.value, [0.3, 1], [0.3, 0.9]),
    transform: [{ scale: interpolate(coreBright.value, [0.3, 1], [0.5, 0.85]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(innerPulse.value, [0.5, 0.9], [0.15, 0.5]),
  }));

  const orbSize = size -40 ;
  const containerSize = orbSize + 80;

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
            backgroundColor: orbGlow,
          },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      {/* ── Main orb with depth layers ── */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: orbColor,
            shadowColor: orbColor,
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
});
