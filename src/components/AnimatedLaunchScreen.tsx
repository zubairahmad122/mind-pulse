import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BACKGROUND, FONTS, PILLAR_COLORS } from '@/constants/designSystem';

type AnimatedLaunchScreenProps = {
  ready: boolean;
  /** True once the custom fonts (SpaceGrotesk/Inter) this screen's title and
   * tagline render in have actually finished loading — or failed to, so a
   * font error doesn't strand the screen forever. Gates the entrance
   * animation's start so "Well Mode" is never shown with Android's fallback
   * system font for a frame before snapping to the real one. */
  fontsReady: boolean;
  onReady: () => void;
  onFinish: () => void;
};

const MINIMUM_DISPLAY_TIME = 1200;

/** Entrance timeline — logo → title → tagline → loader, staggered by
 * interpolation input-range offsets on ONE eased driver (0..ENTER_MS)
 * rather than four separate Animated.timings. Values are ms marks on that
 * driver; because the driver is monotonic the stagger order always holds
 * regardless of its easing curve. */
const ENTER_MS = 700;
const EXIT_MS = 280;
const INACTIVE_DOT = 'rgba(99,102,241,0.35)';
const ACTIVE_DOT = PILLAR_COLORS.relax;

export function AnimatedLaunchScreen({
  ready,
  fontsReady,
  onReady,
  onFinish,
}: AnimatedLaunchScreenProps) {
  const reducedMotion = useReducedMotion();
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [enter] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Waiting for fonts here (not just at exit) is the actual fix: starting
    // this unconditionally on mount let the title/tagline become visible —
    // and get measured/laid out — before SpaceGrotesk/Inter had necessarily
    // finished loading, showing Android's fallback system font for a frame
    // (different metrics, reads as "half loaded") before snapping to the
    // real one once a later re-render picked it up.
    if (!fontsReady) return;

    Animated.timing(enter, {
      toValue: reducedMotion ? 1 : ENTER_MS,
      duration: reducedMotion ? 200 : ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (reducedMotion) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot once fonts are ready; `reducedMotion` intentionally not re-run mid-animation.
  }, [breathe, enter, fontsReady]);

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
      toValue: reducedMotion ? 1 : EXIT_MS,
      duration: reducedMotion ? 150 : EXIT_MS,
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
  }, [exit, finish, minimumTimeElapsed, ready, reducedMotion]);

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
      // Always dismiss the native splash too — otherwise Android can keep
      // showing the system Splash Screen window after this overlay exits.
      onReady();
      exit.stopAnimation();
      finish();
    }, 8000);
    return () => clearTimeout(ceiling);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot ceiling, must not reset if callbacks' identities change.
  }, []);

  // ── Entrance interpolations ─────────────────────────────────────────────
  // Reduced motion: everything is one simple, fast, fade-only pass — no
  // scale, no translateY.
  const logoEnter = useMemo(
    () =>
      reducedMotion
        ? { opacity: enter, transform: [] as never[] }
        : {
            opacity: enter.interpolate({ inputRange: [0, 500], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 500], outputRange: [8, 0], extrapolate: 'clamp' }) },
              { scale: enter.interpolate({ inputRange: [0, 500], outputRange: [0.93, 1], extrapolate: 'clamp' }) },
            ],
          },
    [enter, reducedMotion],
  );
  const titleEnter = useMemo(
    () =>
      reducedMotion
        ? { opacity: enter, transform: [] as never[] }
        : {
            opacity: enter.interpolate({ inputRange: [140, 560], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
              { translateY: enter.interpolate({ inputRange: [140, 560], outputRange: [6, 0], extrapolate: 'clamp' }) },
            ],
          },
    [enter, reducedMotion],
  );
  const taglineEnter = useMemo(
    () =>
      reducedMotion
        ? { opacity: enter, transform: [] as never[] }
        : {
            opacity: enter.interpolate({ inputRange: [230, 610], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
              { translateY: enter.interpolate({ inputRange: [230, 610], outputRange: [4, 0], extrapolate: 'clamp' }) },
            ],
          },
    [enter, reducedMotion],
  );
  const loaderEnter = useMemo(
    () =>
      reducedMotion
        ? { opacity: enter }
        : { opacity: enter.interpolate({ inputRange: [450, 700], outputRange: [0, 1], extrapolate: 'clamp' }) },
    [enter, reducedMotion],
  );

  // ── Exit / reverse interpolations ───────────────────────────────────────
  // Loader fades first, then tagline, then title, then the logo — each
  // easing back and slightly up, never abrupt. Reduced motion collapses
  // this to one fast shared fade.
  const containerExitOpacity = reducedMotion
    ? exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
    : exit.interpolate({ inputRange: [0, 200, 280], outputRange: [1, 1, 0], extrapolate: 'clamp' });
  const loaderExit = reducedMotion
    ? { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
    : { opacity: exit.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: 'clamp' }) };
  const taglineExit = reducedMotion
    ? { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [] as never[] }
    : {
        opacity: exit.interpolate({ inputRange: [40, 220], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [
          { translateY: exit.interpolate({ inputRange: [40, 220], outputRange: [0, -3], extrapolate: 'clamp' }) },
        ],
      };
  const titleExit = reducedMotion
    ? { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [] as never[] }
    : {
        opacity: exit.interpolate({ inputRange: [60, 260], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [
          { translateY: exit.interpolate({ inputRange: [60, 260], outputRange: [0, -4], extrapolate: 'clamp' }) },
        ],
      };
  const logoExit = reducedMotion
    ? { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [] as never[] }
    : {
        opacity: exit.interpolate({ inputRange: [80, 280], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [
          { translateY: exit.interpolate({ inputRange: [80, 280], outputRange: [0, -6], extrapolate: 'clamp' }) },
          { scale: exit.interpolate({ inputRange: [80, 280], outputRange: [1, 0.96], extrapolate: 'clamp' }) },
        ],
      };

  // Combine entrance (in) and exit (out) into one opacity/transform per
  // element — `exit` stays at 0 until the release starts, so during the
  // entrance/idle phase only the `*Enter` values are in effect.
  const combine = (
    // Transform arrays are a union of many mutually-exclusive shapes in RN's
    // Animated typings (translateY-only vs scale-only vs ...) — `any` here
    // is a deliberate, localized escape from that union for two arrays
    // built entirely from our own `translateY`/`scale` entries above.
    enterStyle: { opacity: Animated.AnimatedInterpolation<number>; transform?: any[] },
    exitStyle: { opacity: Animated.AnimatedInterpolation<number>; transform?: any[] },
  ) => ({
    opacity: Animated.multiply(enterStyle.opacity, exitStyle.opacity),
    transform: [...(enterStyle.transform ?? []), ...(exitStyle.transform ?? [])] as any,
  });

  const logoStyle = combine(logoEnter, logoExit);
  const titleStyle = combine(titleEnter, titleExit);
  const taglineStyle = combine(taglineEnter, taglineExit);
  const loaderStyle = combine(loaderEnter, loaderExit);

  const dotBreathe = reducedMotion ? null : breathe;

  return (
    <Animated.View
      accessibilityLabel="Well Mode is starting"
      accessibilityRole="progressbar"
      onLayout={onReady}
      style={[styles.container, { opacity: containerExitOpacity }]}
    >
      {/* Static, non-looping background — same navy/violet/cyan palette as
          the app's shared AnimatedBackground, but deliberately motionless
          here (spec: no moving backgrounds on the splash). Local to this
          screen only; the shared component elsewhere is untouched. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={BACKGROUND.overlay} locations={[0, 1]} style={StyleSheet.absoluteFill} />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="splashViolet" cx="26%" cy="18%" r="46%">
              <Stop offset="0%" stopColor="#6d28d9" stopOpacity={0.12} />
              <Stop offset="55%" stopColor="#4f46c8" stopOpacity={0.03} />
              <Stop offset="100%" stopColor="#4f46c8" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="splashVignette" cx="50%" cy="50%" r="72%">
              <Stop offset="55%" stopColor="#000000" stopOpacity={0} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.32} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#splashViolet)" />
          <Rect width="100%" height="100%" fill="url(#splashVignette)" />
        </Svg>
      </View>

      <View style={styles.brandGroup}>
        <Animated.View style={[styles.logoStage, logoStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 208 196"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#4DE1C1" stopOpacity={0.14} />
                <Stop offset="48%" stopColor="#7B5CFF" stopOpacity={0.05} />
                <Stop offset="100%" stopColor="#7B5CFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="208" height="196" fill="url(#launchGlow)" />
          </Svg>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Not just gated to opacity 0 — left unmounted until fontsReady so
            Android never lays out this Text with fallback-font metrics
            first. A style/font swap on an already-mounted node can leave
            Android's text layout only partially repainted on a cold start
            (shows as the tail of the string going missing); a fresh mount
            always paints with the correct font from the start. */}
        {fontsReady && (
          <>
            <Animated.Text style={[styles.title, titleStyle]}>Well Mode</Animated.Text>
            <Animated.Text style={[styles.tagline, taglineStyle]}>Breathe · Rest · Refocus</Animated.Text>
          </>
        )}

        <Animated.View style={[styles.loading, loaderStyle]}>
          {[0, 1, 2].map(dot => (
            <Animated.View
              key={dot}
              style={[
                styles.loadingDot,
                dotBreathe
                  ? {
                      backgroundColor: dotBreathe.interpolate({
                        inputRange: dot === 1 ? [0, 1] : dot === 0 ? [0, 0.5, 1] : [0, 0.5, 1],
                        outputRange:
                          dot === 1
                            ? [INACTIVE_DOT, ACTIVE_DOT]
                            : dot === 0
                              ? [ACTIVE_DOT, INACTIVE_DOT, INACTIVE_DOT]
                              : [INACTIVE_DOT, INACTIVE_DOT, ACTIVE_DOT],
                      }),
                    }
                  : { backgroundColor: dot === 1 ? ACTIVE_DOT : INACTIVE_DOT },
              ]}
            />
          ))}
        </Animated.View>
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
  // Sits slightly above true center (a small constant nudge on top of the
  // parent's flex centering — responsive across device heights without any
  // hardcoded absolute Y position).
  brandGroup: {
    alignItems: 'center',
    marginTop: -22,
  },
  logoStage: {
    width: 208,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    marginTop: 20,
    color: '#FFFFFF',
    fontFamily: FONTS.headingSemi,
    fontWeight: '600',
    fontSize: 32,
    letterSpacing: -0.3,
  },
  tagline: {
    marginTop: 10,
    paddingHorizontal: 4,
    color: 'rgba(164,139,255,0.8)',
    fontFamily: FONTS.bodySemi,
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  loading: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
});
