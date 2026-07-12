import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Footprints, Infinity as InfinityIcon, Rabbit, Snail, type LucideIcon } from 'lucide-react-native';
import { FocusDot } from '@/components/eye/animations/FocusDot';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { PILLAR_THEME } from '@/constants/theme';
import { getFirestore, collection, addDoc } from '@react-native-firebase/firestore';
import { useAuth } from '@/context/AuthContext';

const db = getFirestore();
import { type GameEndStats } from './GameOverScreen';

const EYES = PILLAR_THEME.eyes;

const PATH_ICONS: Record<string, LucideIcon> = {
  slow: Snail, medium: Footprints, faster: Rabbit, figure8: InfinityIcon,
};

// Fixed positions (fractions of the arena) for the ambient specks — placed
// away from the center so they never compete with the dot.
const ARENA_SPECKS = [
  { x: 0.16, y: 0.22, r: 3 },
  { x: 0.82, y: 0.16, r: 2 },
  { x: 0.9,  y: 0.55, r: 3 },
  { x: 0.72, y: 0.85, r: 2 },
  { x: 0.22, y: 0.8,  r: 3 },
  { x: 0.08, y: 0.5,  r: 2 },
];

interface Props {
  running: boolean;
  onGameEnd?: (stats: GameEndStats) => void;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
// Eyes-pillar palette (cyan accent + glass surfaces) — matches the Eye tab.
const C = {
  arenaBg:     '#06121a',
  card:        'rgba(255,255,255,0.045)',
  blue:        '#22d3ee',  // eyes accent — high contrast on the dark teal arena
  blueDim:     '#06b6d4',
  green:       '#6ee7b7',  // status feedback only ("FOLLOWING")
  guide:       'rgba(34,211,238,0.22)',
  red:         '#e24b4a',
  text:        '#ffffff',
  muted:       'rgba(255,255,255,0.6)',
  dim:         'rgba(255,255,255,0.38)',
  purpleLight: '#5eead4',
};

// ─── Path style ───────────────────────────────────────────────────────────────
type PathStyle = 'slow' | 'medium' | 'faster' | 'figure8';

interface PathCfg {
  label:  string;
  loopMs: number;
  lockR:  number;
}

// lockR values increased for easier finger tracking — wider catch zone
const PATHS: Record<PathStyle, PathCfg> = {
  slow:    { label: 'Slow',   loopMs: 6000, lockR: 80 },
  medium:  { label: 'Medium', loopMs: 5000, lockR: 70 },
  faster:  { label: 'Faster', loopMs: 4000, lockR: 60 },
  figure8: { label: 'Fig-8',  loopMs: 5500, lockR: 75 },
};
const STYLE_IDX: Record<PathStyle, number> = { slow: 0, medium: 1, faster: 2, figure8: 3 };

const SESSION_SECS = 60;
const ARENA_H = 360;
const { width: SW } = Dimensions.get('window');
const ARENA_W = SW - 32;
const ARENA_PAD = 26;

// Eye-health pacing
const BLINK_PROMPT_MS = 20000;
const CHAIN_LIMIT     = 2;
const REST_COOLDOWN_S = 30;

// Short one-liners: the tip bar has a FIXED height, so a longer line must
// never wrap and shift the whole arena below it.
const TIPS = [
  'Breathe naturally.',
  'Keep your head still.',
  'Relax your forehead.',
  'Blink if needed.',
  'Let your eyes move effortlessly.',
  'Stay relaxed.',
  "You're doing great.",
];

// ─── Guided session ───────────────────────────────────────────────────────────
// The app is the coach: speed progresses through phases automatically and
// interpolates smoothly (never jumps). Presentation only — the circle path,
// 60s duration and tracking logic are untouched.
type SessionMode = 'guided' | 'practice';

// INVISIBLE progression (the Calm way): one circle path, the pace simply
// eases up behind the scenes. No phase labels, no overlays, no haptics —
// users shouldn't think "I'm in Phase 3", they should just follow the dot.
const GUIDED_SPEEDS: { at: number; loopMs: number }[] = [
  { at: 0,  loopMs: 8000 }, // slow start
  { at: 15, loopMs: 6200 }, // slightly faster
  { at: 35, loopMs: 5400 }, // comfortable pace to the end
];

// Coaching changes quietly with time — one line every ~12s, ending on
// "Almost done." right before the finish.
const GUIDED_COACH: { at: number; text: string }[] = [
  { at: 0,  text: 'Keep your head still.' },
  { at: 12, text: 'Blink naturally.' },
  { at: 24, text: 'Stay relaxed.' },
  { at: 36, text: 'Eyes on the dot.' },
  { at: 48, text: 'Almost done.' },
];

// Sample path into an SVG `d` string (drawn once per path style — static, no per-frame work)
function buildPathD(style: PathStyle, cx: number, cy: number, R: number): string {
  const N = 96;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * Math.PI * 2;
    let dx = 0, dy = 0;
    if (style === 'slow') {
      dx = R * Math.cos(theta);
      dy = R * Math.sin(theta);
    } else if (style === 'medium') {
      dx = R * Math.sin(2 * theta);
      dy = R * 0.7 * Math.sin(theta);
    } else if (style === 'faster') {
      dx = R * Math.sin(2 * theta) * 0.9;
      dy = R * 0.6 * Math.sin(3 * theta);
    } else {
      // figure-8 lemniscate
      const denom = 1 + Math.cos(theta) * Math.cos(theta);
      dx = R * 0.85 * Math.sin(theta) / denom;
      dy = R * 0.5 * Math.sin(theta) * Math.cos(theta) / denom;
    }
    d += (i === 0 ? 'M ' : 'L ') + (cx + dx).toFixed(1) + ' ' + (cy + dy).toFixed(1) + ' ';
  }
  return d;
}

// ─── Tail dot ─────────────────────────────────────────────────────────────────
function TailDot({
  sx, sy, r, alpha, glow,
}: {
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  r: number;
  alpha: number;
  glow: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: sx.value - r }, { translateY: sy.value - r }],
    opacity:   glow.value * alpha,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: 0, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: C.blue },
        style,
      ]}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CometTrace({ running, onGameEnd }: Props) {
  const { user } = useAuth();

  const [pathStyle, setPathStyle]     = useState<PathStyle>('slow');
  // Guided (default): the app manages speed. Practice: manual path chips.
  const [mode, setMode]               = useState<SessionMode>('guided');
  // Current quiet coaching line during a guided session (time-sequenced).
  const [guidedCoach, setGuidedCoach] = useState(GUIDED_COACH[0].text);
  const sessionModeRef                = useRef<SessionMode>('guided');
  const guidedSpeedRef                = useRef(0);
  const guidedCoachRef                = useRef(0);
  const [exerciseActive, setActive]   = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [paused, setPaused]           = useState(false);
  const [timer, setTimer]             = useState(SESSION_SECS);
  const [followingUi, setFollowingUi] = useState(false);
  const [tipIdx, setTipIdx]           = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownSecs, setCooldownSecs]     = useState(0);

  const sessionStyleRef = useRef<PathStyle>('slow');
  const pausedRef       = useRef(false);
  const endedRef        = useRef(false);
  const timerLeftRef    = useRef(SESSION_SECS);
  const sessionTimerHandle = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkFadeTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const cooldownTickerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneBeatTimerRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const consecutiveSessionsRef = useRef(0);

  // Geometry
  const cx0 = ARENA_W / 2;
  const cy0 = ARENA_H / 2;
  const R   = Math.min(ARENA_W, ARENA_H) / 2 - ARENA_PAD;

  // ─── Shared values driven on UI thread ──────────────────────────────────────
  const cometX = useSharedValue(cx0);
  const cometY = useSharedValue(cy0);
  const t1x = useSharedValue(cx0); const t1y = useSharedValue(cy0);
  const t2x = useSharedValue(cx0); const t2y = useSharedValue(cy0);
  const t3x = useSharedValue(cx0); const t3y = useSharedValue(cy0);
  const cometOpacity = useSharedValue(0.55);
  const cometScale   = useSharedValue(0.9);
  // Session progress bar (one continuous sweep).
  const barW         = useSharedValue(0);
  const steadyBar    = useSharedValue(0);
  const vignette     = useSharedValue(0);
  const blinkOpacity = useSharedValue(0);

  // Finger position lives in shared values so the worklet can read it lock-free
  const fingerX    = useSharedValue(-9999);
  const fingerY    = useSharedValue(-9999);
  const fingerDown = useSharedValue(0);

  // Frame-loop state (UI thread)
  const tSV          = useSharedValue(0);
  const styleIdxSV   = useSharedValue(0);
  const loopMsSV     = useSharedValue(PATHS.slow.loopMs);
  const lockRSV      = useSharedValue(PATHS.slow.lockR);
  const followingSV  = useSharedValue(0);
  const lastHapticSV = useSharedValue(0);

  // PanResponder writes finger position straight to shared values — no setState churn
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: e => {
        fingerX.value = e.nativeEvent.locationX;
        fingerY.value = e.nativeEvent.locationY;
        fingerDown.value = 1;
      },
      onPanResponderMove: e => {
        fingerX.value = e.nativeEvent.locationX;
        fingerY.value = e.nativeEvent.locationY;
      },
      onPanResponderRelease:   () => { fingerDown.value = 0; },
      onPanResponderTerminate: () => { fingerDown.value = 0; },
    }),
  []);

  // Guided sessions draw the current phase's shape; practice draws the choice.
  const effectiveStyle = mode === 'guided' ? 'slow' : pathStyle;
  const guidePathD = useMemo(
    () => buildPathD(effectiveStyle, cx0, cy0, R),
    [effectiveStyle, cx0, cy0, R],
  );

  // ─── UI-thread frame loop (no JS setInterval, no per-tick JS→UI hops) ───────
  function pulseHapticJS() {
    void Haptics.selectionAsync();
  }
  function syncFollowing(value: number) {
    setFollowingUi(value === 1);
  }
  const frameCb = useFrameCallback((frame) => {
    'worklet';
    const dt = Math.min(120, frame.timeSincePreviousFrame ?? 16);

    // Advance parametric time (loops 0..1)
    tSV.value = (tSV.value + dt / loopMsSV.value) % 1;
    const theta = tSV.value * Math.PI * 2;

    let dx = 0, dy = 0;
    if (styleIdxSV.value === 0) {
      dx = R * Math.cos(theta);
      dy = R * Math.sin(theta);
    } else if (styleIdxSV.value === 1) {
      dx = R * Math.sin(2 * theta);
      dy = R * 0.7 * Math.sin(theta);
    } else if (styleIdxSV.value === 2) {
      dx = R * Math.sin(2 * theta) * 0.9;
      dy = R * 0.6 * Math.sin(3 * theta);
    } else {
      // figure-8 lemniscate
      const denom = 1 + Math.cos(theta) * Math.cos(theta);
      dx = R * 0.85 * Math.sin(theta) / denom;
      dy = R * 0.5 * Math.sin(theta) * Math.cos(theta) / denom;
    }
    const nx = cx0 + dx;
    const ny = cy0 + dy;

    // Trail: shift previous positions down (3 dots — fewer writes per frame)
    t3x.value = t2x.value; t3y.value = t2y.value;
    t2x.value = t1x.value; t2y.value = t1y.value;
    t1x.value = cometX.value; t1y.value = cometY.value;

    cometX.value = nx;
    cometY.value = ny;

    // Following detection (visual feedback only — no scoring)
    let following = 0;
    if (fingerDown.value === 1) {
      const ddx = fingerX.value - nx;
      const ddy = fingerY.value - ny;
      if (Math.sqrt(ddx * ddx + ddy * ddy) <= lockRSV.value) following = 1;
    }

    if (following === 1) {
      const now = frame.timestamp;
      if (now - lastHapticSV.value > 700) {
        lastHapticSV.value = now;
        runOnJS(pulseHapticJS)();
      }
    }

    if (following !== followingSV.value) {
      followingSV.value = following;
      cometOpacity.value = withTiming(following === 1 ? 1    : 0.45, { duration: 180 });
      cometScale.value   = withTiming(following === 1 ? 1.12 : 0.9,  { duration: 180 });
      vignette.value     = withTiming(following === 1 ? 0    : 0.12, { duration: 220 });
      steadyBar.value    = withTiming(following === 1 ? 1    : 0,    { duration: 1200 });
      runOnJS(syncFollowing)(following);
    }
  }, false);

  // ─── Blink prompt ───────────────────────────────────────────────────────────
  function triggerBlinkPrompt() {
    if (endedRef.current || pausedRef.current) return;
    blinkOpacity.value = withTiming(1, { duration: 220 });
    if (blinkFadeTimerRef.current) clearTimeout(blinkFadeTimerRef.current);
    blinkFadeTimerRef.current = setTimeout(() => {
      blinkOpacity.value = withTiming(0, { duration: 320 });
    }, 1100);
    void Haptics.selectionAsync();
  }
  function stopBlinkPrompt() {
    if (blinkIntervalRef.current)  { clearInterval(blinkIntervalRef.current);  blinkIntervalRef.current  = null; }
    if (blinkFadeTimerRef.current) { clearTimeout(blinkFadeTimerRef.current);  blinkFadeTimerRef.current = null; }
    blinkOpacity.value = 0;
  }

  // ─── Rest cooldown ──────────────────────────────────────────────────────────
  function maybeStartCooldown() {
    if (consecutiveSessionsRef.current < CHAIN_LIMIT) return;
    consecutiveSessionsRef.current = 0;
    setCooldownActive(true);
    setCooldownSecs(REST_COOLDOWN_S);
    cooldownTickerRef.current = setInterval(() => {
      setCooldownSecs(s => {
        const next = s - 1;
        if (next <= 0) {
          if (cooldownTickerRef.current) { clearInterval(cooldownTickerRef.current); cooldownTickerRef.current = null; }
          setCooldownActive(false);
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  // Invisible progression: the pace glides to its next step over 4s — most
  // users only notice the session "flowing", never a change. The coaching
  // line swaps quietly on its own schedule. No haptics, no overlays.
  function tickGuidedPhase() {
    if (sessionModeRef.current !== 'guided') return;
    const elapsed = SESSION_SECS - timerLeftRef.current;

    let sIdx = 0;
    for (let i = 0; i < GUIDED_SPEEDS.length; i++) {
      if (elapsed >= GUIDED_SPEEDS[i].at) sIdx = i;
    }
    if (sIdx !== guidedSpeedRef.current) {
      guidedSpeedRef.current = sIdx;
      loopMsSV.value = withTiming(GUIDED_SPEEDS[sIdx].loopMs, {
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
      });
    }

    let cIdx = 0;
    for (let i = 0; i < GUIDED_COACH.length; i++) {
      if (elapsed >= GUIDED_COACH[i].at) cIdx = i;
    }
    if (cIdx !== guidedCoachRef.current) {
      guidedCoachRef.current = cIdx;
      setGuidedCoach(GUIDED_COACH[cIdx].text);
    }
  }

  // ─── Session lifecycle ──────────────────────────────────────────────────────
  function startSession() {
    if (exerciseActive) return;
    sessionModeRef.current = mode;
    sessionStyleRef.current = mode === 'guided' ? 'slow' : pathStyle;

    if (mode === 'guided') {
      // One circle path; only the pace evolves (invisibly) from here on.
      styleIdxSV.value = STYLE_IDX.slow;
      loopMsSV.value   = GUIDED_SPEEDS[0].loopMs;
      lockRSV.value    = PATHS.slow.lockR;
      guidedSpeedRef.current = 0;
      guidedCoachRef.current = 0;
      setGuidedCoach(GUIDED_COACH[0].text);
    } else {
      // Practice mode: manual path/speed choice, as before.
      styleIdxSV.value = STYLE_IDX[pathStyle];
      loopMsSV.value   = PATHS[pathStyle].loopMs;
      lockRSV.value    = PATHS[pathStyle].lockR;
    }

    // Reset frame state
    tSV.value          = 0;
    fingerX.value      = -9999;
    fingerY.value      = -9999;
    fingerDown.value   = 0;
    followingSV.value  = 0;
    lastHapticSV.value = 0;

    pausedRef.current    = false;
    endedRef.current     = false;
    timerLeftRef.current = SESSION_SECS;

    setFollowingUi(false);
    setTimer(SESSION_SECS); setSessionDone(false); setPaused(false);
    setTipIdx(t => (t + 1) % TIPS.length);

    cometOpacity.value = 0.55;
    cometScale.value   = 0.9;
    steadyBar.value    = 0;
    vignette.value     = 0;

    setActive(true);
    consecutiveSessionsRef.current += 1;

    // Progress bar: one continuous linear sweep over the whole session.
    barW.value = 0;
    barW.value = withTiming(1, { duration: SESSION_SECS * 1000, easing: Easing.linear });

    frameCb.setActive(true);
    sessionTimerHandle.current = setInterval(() => {
      timerLeftRef.current -= 1;
      setTimer(timerLeftRef.current);
      tickGuidedPhase();
      if (timerLeftRef.current <= 0) endSession();
    }, 1000);
    blinkIntervalRef.current = setInterval(triggerBlinkPrompt, BLINK_PROMPT_MS);
  }

  function pauseSession() {
    if (!exerciseActive || pausedRef.current) return;
    void Haptics.selectionAsync();
    pausedRef.current = true;
    setPaused(true);
    frameCb.setActive(false);
    cancelAnimation(barW); // hold the sweep where it is
    if (sessionTimerHandle.current) { clearInterval(sessionTimerHandle.current); sessionTimerHandle.current = null; }
    stopBlinkPrompt();
  }

  function resumeSession() {
    if (!exerciseActive || !pausedRef.current) return;
    void Haptics.selectionAsync();
    pausedRef.current = false;
    setPaused(false);
    barW.value = withTiming(1, { duration: Math.max(0, timerLeftRef.current) * 1000, easing: Easing.linear });
    frameCb.setActive(true);
    sessionTimerHandle.current = setInterval(() => {
      timerLeftRef.current -= 1;
      setTimer(timerLeftRef.current);
      tickGuidedPhase();
      if (timerLeftRef.current <= 0) endSession();
    }, 1000);
    blinkIntervalRef.current = setInterval(triggerBlinkPrompt, BLINK_PROMPT_MS);
  }

  function clearAllTimers() {
    if (sessionTimerHandle.current) { clearInterval(sessionTimerHandle.current); sessionTimerHandle.current = null; }
    if (cooldownTickerRef.current)  { clearInterval(cooldownTickerRef.current);  cooldownTickerRef.current  = null; }
    if (doneBeatTimerRef.current)   { clearTimeout(doneBeatTimerRef.current);    doneBeatTimerRef.current   = null; }
    stopBlinkPrompt();
    frameCb.setActive(false);
  }

  function endSession(immediate = false) {
    if (endedRef.current) return;
    endedRef.current  = true;
    pausedRef.current = false;
    if (sessionTimerHandle.current) { clearInterval(sessionTimerHandle.current); sessionTimerHandle.current = null; }
    stopBlinkPrompt();
    frameCb.setActive(false);

    cancelAnimation(cometOpacity);
    cancelAnimation(cometScale);
    cancelAnimation(steadyBar);
    cancelAnimation(vignette);
    cancelAnimation(barW);
    barW.value = withTiming(1, { duration: 300 });

    setActive(false);
    setPaused(false);
    setSessionDone(true);
    setFollowingUi(false);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveToFirestore();

    const handOff = () => {
      // Parent routes comet-trace straight to the 20-second look-away reset.
      onGameEnd?.({
        headline: '',
        subline:  '',
        rating:   3,
        stats:    [],
        survived: true,
      });
      maybeStartCooldown();
    };

    if (immediate) { handOff(); return; }
    // Completion beat: the dot glows out and "Exercise complete" breathes
    // for a moment before the look-away reset takes over.
    cometScale.value   = withTiming(1.5, { duration: 600, easing: Easing.out(Easing.ease) });
    cometOpacity.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) });
    setDoneBeat(true);
    doneBeatTimerRef.current = setTimeout(() => {
      setDoneBeat(false);
      handOff();
    }, 1400);
  }

  function saveToFirestore() {
    try {
      void addDoc(collection(db, 'eyeGameScores'), {
        userId:       user?.uid ?? 'guest',
        game:         'comet_trace',
        kind:         'exercise',
        durationSecs: SESSION_SECS,
        pathStyle:    sessionStyleRef.current,
        timestamp:    new Date(),
      });
    } catch { /* offline */ }
  }

  useEffect(() => { if (!running && exerciseActive) endSession(true); }, [running]);
  useEffect(() => () => { clearAllTimers(); }, []);

  // ─── 3-2-1 prep beat before the session (presentation only) ────────────────
  const [prepNum, setPrepNum] = useState<number | null>(null);

  function beginExercise() {
    if (exerciseActive || cooldownActive || prepNum !== null) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    frameCb.setActive(false); // stop the idle preview; the dot rests during 3-2-1
    setPrepNum(3);
  }

  // Idle preview: the dot drifts the upcoming path at 1/3 speed, faint —
  // "this is what you'll follow". Presentation only; startSession resets
  // everything to real speed. (No cleanup here on purpose: startSession owns
  // the frame loop the moment the session begins.)
  useEffect(() => {
    if (exerciseActive || prepNum !== null) return;
    // Preview whatever path is drawn on screen (guided: current phase shape).
    styleIdxSV.value = STYLE_IDX[effectiveStyle];
    loopMsSV.value = PATHS[effectiveStyle].loopMs * 3;
    lockRSV.value = 0; // no follow-detection during preview
    cometOpacity.value = withTiming(0.3, { duration: 400 });
    cometScale.value = withTiming(0.78, { duration: 400 });
    frameCb.setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStyle, exerciseActive, prepNum]);

  // Breathing halo around the dot — alive, never mechanical.
  const halo = useSharedValue(0);
  useEffect(() => {
    halo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [halo]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + halo.value * 0.22,
    transform: [{ scale: 1 + halo.value * 0.35 }],
  }));
  // The dot itself breathes very slightly (1.00 -> 1.04) on the same wave.
  const dotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.value * 0.04 }],
  }));

  useEffect(() => {
    if (prepNum === null) return;
    if (prepNum <= 0) {
      const t = setTimeout(() => { setPrepNum(null); startSession(); }, 600);
      return () => clearTimeout(t);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = setTimeout(() => setPrepNum(n => (n ?? 1) - 1), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepNum]);

  // Rotate the coaching tip every ~7s while tracking (fades via key remount).
  // Guided sessions coach per phase; practice uses the general set.
  // (mode can't change mid-session — the selector is hidden while active)
  const activeTips =
    exerciseActive && mode === 'guided' ? GUIDED_PHASES[phaseIdx].tips : TIPS;
  useEffect(() => {
    if (!exerciseActive || paused) return;
    // Slow rotation — coaching should whisper, not flicker.
    const id = setInterval(() => setTipIdx(t => t + 1), 7000);
    return () => clearInterval(id);
  }, [exerciseActive, paused]);

  // Countdown tick: each second lands with a tiny settle (1.08 → 1.0).
  const timerTickIn = new Keyframe({
    0:   { opacity: 0.35, transform: [{ scale: 1.08 }] },
    100: { opacity: 1,    transform: [{ scale: 1 }] },
  }).duration(260);

  // Session progress: ONE continuous linear sweep instead of 1s steps.
  const barStyle = useAnimatedStyle(() => ({
    width: `${barW.value * 100}%` as `${number}%`,
  }));

  // Ambient glow behind the path center — breathes very slowly, ≤5% opacity.
  const ambient = useSharedValue(0);
  useEffect(() => {
    ambient.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [ambient]);
  const ambientStyle = useAnimatedStyle(() => ({
    opacity: 0.03 + ambient.value * 0.03,
    transform: [{ scale: 1 + ambient.value * 0.06 }],
  }));
  // Counter-phase twinkle so the specks don't blink in unison.
  const ambientStyleAlt = useAnimatedStyle(() => ({
    opacity: 0.06 - ambient.value * 0.03,
  }));
  // Eye Comfort Ring: every ~7s a ring slowly expands and dissolves — the
  // whole arena breathes (rides the same ambient wave, no extra loop).
  const comfortRingStyle = useAnimatedStyle(() => ({
    opacity: (1 - ambient.value) * 0.1,
    transform: [{ scale: 0.86 + ambient.value * 0.24 }],
  }));

  // End-of-exercise beat: dot's job is done → soft "✓ Exercise complete"
  // moment before the parent takes over (look-away reset).
  const [doneBeat, setDoneBeat] = useState(false);

  // ─── Animated styles ────────────────────────────────────────────────────────
  const cometStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cometX.value - 16 },
      { translateY: cometY.value - 16 },
      { scale: cometScale.value },
    ],
    opacity: cometOpacity.value,
  }));
  const steadyBarStyle   = useAnimatedStyle(() => ({ width: `${Math.round(steadyBar.value * 100)}%` as `${number}%` }));
  const vignetteStyle    = useAnimatedStyle(() => ({ opacity: vignette.value }));
  const blinkPromptStyle = useAnimatedStyle(() => ({ opacity: blinkOpacity.value }));

  return (
    <View style={s.wrap}>

      {/* Timer is the focal point — chips before the session, big countdown
          during it. Fixed height: swapping content must never shift the arena. */}
      <View style={s.infoRow}>
        {exerciseActive || sessionDone ? (
          <View style={s.activeInfo}>
            <Animated.Text key={timer} entering={timerTickIn} style={s.timerBig}>
              {timer}s
            </Animated.Text>
            <Text style={[s.statusWord, { color: followingUi ? C.green : C.dim }]}>
              {exerciseActive
                ? (followingUi ? 'Following' : paused ? 'Paused' : 'Eyes on the dot')
                : 'Complete'}
            </Text>
          </View>
        ) : (
          <View style={s.chipsRow}>
            {['60 sec', 'Beginner', 'Eyes only'].map(c => (
              <View key={c} style={s.infoChip}><Text style={s.infoChipText}>{c}</Text></View>
            ))}
          </View>
        )}
      </View>

      {/* Session progress — one continuous 60s sweep, not per-second steps */}
      <View style={s.sessionTrack}>
        <Animated.View style={[s.sessionFill, barStyle]} />
      </View>

      {/* Mode: Guided (app coaches, speed evolves) vs Practice (manual).
          Hidden during the completion beat too — reappearing mid-beat used
          to shove the arena down right as the session ended. */}
      {!exerciseActive && !doneBeat && (
        <View style={s.modeRow}>
          {(['guided', 'practice'] as SessionMode[]).map(m => {
            const selected = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => { void Haptics.selectionAsync(); setMode(m); }}
                style={[s.modeBtn, selected && s.modeBtnActive]}
              >
                <Text style={[s.modeBtnText, selected && s.modeBtnTextActive]}>
                  {m === 'guided' ? 'Guided' : 'Practice'}
                </Text>
                {m === 'guided' && (
                  <Text style={[s.modeBtnHint, selected && s.modeBtnHintActive]}>Recommended</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ONE slot below: phase + coaching while tracking; path chips only in
          Practice mode; a calm hint in Guided — fixed height, never a shift. */}
      <View style={s.midSlot}>
        {exerciseActive ? (
          <View style={s.tipBar}>
            {mode === 'guided' ? (
              <Animated.View key={`ph-${phaseIdx}`} entering={FadeIn.duration(350)} style={s.phaseChip}>
                <Text style={s.phaseChipText}>
                  {`${GUIDED_PHASES[phaseIdx].kicker} · ${GUIDED_PHASES[phaseIdx].label}`}
                </Text>
              </Animated.View>
            ) : (
              <Ionicons name="eye-outline" size={13} color={C.muted} />
            )}
            <Animated.Text
              key={`${phaseIdx}-${tipIdx}`}
              entering={FadeIn.duration(450)}
              style={s.tipText}
              numberOfLines={1}
            >
              {activeTips[tipIdx % activeTips.length]}
            </Animated.Text>
          </View>
        ) : mode === 'practice' ? (
          <View style={s.diffRow}>
            {(['slow', 'medium', 'faster', 'figure8'] as PathStyle[]).map(p => {
              const PathIcon = PATH_ICONS[p];
              const selected = pathStyle === p;
              return (
                <TouchableOpacity
                  key={p} onPress={() => setPathStyle(p)}
                  style={[s.diffBtn, selected && s.diffBtnActive]}
                >
                  <PathIcon size={14} color={selected ? C.blue : C.dim} strokeWidth={2} />
                  <Text style={[s.diffBtnText, selected && s.diffBtnTextActive]}>
                    {PATHS[p].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={s.guidedHint}>Speed adjusts automatically — just follow the dot.</Text>
        )}
      </View>

      {/* Rest cooldown banner */}
      {cooldownActive && (
        <View style={s.restBanner}>
          <Ionicons name="leaf-outline" size={15} color={C.green} />
          <Text style={s.restText} numberOfLines={2}>
            Great — now give your eyes a real rest. Step away from the screen for a few minutes. ({cooldownSecs}s)
          </Text>
        </View>
      )}

      {/* Steady-follow bar (calm visual feedback only) */}
      <View style={s.steadyTrack}>
        <Animated.View style={[s.steadyFill, steadyBarStyle]} />
      </View>

      {/* Arena */}
      <View
        style={[s.arena, { width: ARENA_W, height: ARENA_H }]}
        {...panResponder.panHandlers}
      >
        {/* Ambient glow — breathes behind the path, ≤6% opacity */}
        <Animated.View
          pointerEvents="none"
          style={[
            s.ambientGlow,
            {
              left: ARENA_W / 2 - 110,
              top: ARENA_H / 2 - 110,
              backgroundColor:
                exerciseActive && mode === 'guided' ? GUIDED_PHASES[phaseIdx].glow : C.blue,
            },
            ambientStyle,
          ]}
        />

        {/* Eye Comfort Ring — slow expand + dissolve */}
        <Animated.View
          pointerEvents="none"
          style={[s.comfortRing, { left: ARENA_W / 2 - 120, top: ARENA_H / 2 - 120 }, comfortRingStyle]}
        />

        {/* Floating specks — barely there, the arena never feels empty */}
        {ARENA_SPECKS.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              s.speck,
              { left: p.x * ARENA_W, top: p.y * ARENA_H, width: p.r, height: p.r, borderRadius: p.r / 2 },
              i % 2 === 0 ? ambientStyle : ambientStyleAlt,
            ]}
          />
        ))}

        {/* Guide path (dotted, drawn once) */}
        <Svg
          width={ARENA_W} height={ARENA_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path d={guidePathD} stroke={C.guide} strokeWidth={1.5} strokeDasharray="3,5" fill="none" />
        </Svg>

        {/* Trail (3 dots, oldest first) */}
        <TailDot sx={t3x} sy={t3y} r={4} alpha={0.15} glow={cometOpacity} />
        <TailDot sx={t2x} sy={t2y} r={6} alpha={0.30} glow={cometOpacity} />
        <TailDot sx={t1x} sy={t1y} r={8} alpha={0.55} glow={cometOpacity} />

        {/* Comet — target-style dot with a breathing halo */}
        <Animated.View pointerEvents="none" style={[s.cometWrap, cometStyle]}>
          <Animated.View style={[s.cometHalo, haloStyle]} />
          <Animated.View style={dotPulseStyle}>
            <FocusDot color={C.blue} size={32} />
          </Animated.View>
        </Animated.View>

        {/* Drift vignette (red edge fade — gentle) */}
        <Animated.View pointerEvents="none" style={[s.vignette, vignetteStyle]} />

        {/* Following indicator */}
        {followingUi && exerciseActive && (
          <View pointerEvents="none" style={s.followLabel}>
            <Text style={s.followLabelText}>FOLLOWING</Text>
          </View>
        )}

        {/* Blink reminder */}
        <Animated.View pointerEvents="none" style={[s.blinkPrompt, blinkPromptStyle]}>
          <Text style={s.blinkPromptText}>👁  Blink</Text>
        </Animated.View>

        {/* Idle overlay — the slow preview dot drifts behind these lines */}
        {!exerciseActive && !sessionDone && prepNum === null && (
          <View style={s.idleOverlay} pointerEvents="none">
            <Text style={s.idleTitle}>Follow the Dot</Text>
            <View style={s.idleLines}>
              <Text style={s.idleLine}>Guide the glowing dot with your finger.</Text>
              <Text style={s.idleLine}>Keep your head still.</Text>
              <Text style={s.idleLine}>Let only your eyes follow.</Text>
            </View>
          </View>
        )}

        {/* Completion beat — the dot glows out, then the look-away takes over */}
        {doneBeat && (
          <Animated.View entering={FadeIn.duration(300)} style={s.prepOverlay} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={42} color={C.green} />
            <Text style={s.idleTitle}>Exercise complete</Text>
          </Animated.View>
        )}

        {/* Done overlay — a small celebration, not a dead arena */}
        {sessionDone && !exerciseActive && prepNum === null && !doneBeat && (
          <Animated.View entering={FadeIn.duration(450)} style={s.idleOverlay} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={46} color={C.green} />
            <Text style={s.idleTitle}>Great job</Text>
            <Text style={s.idleLine}>
              Eyes refreshed.{'\n'}Go again — or give them a real break.
            </Text>
          </Animated.View>
        )}

        {/* Guided phase announce — "TRACKING / Follow the gentle waves" */}
        {phaseAnnounce && exerciseActive && !paused && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(400)}
            style={s.phaseAnnounce}
            pointerEvents="none"
          >
            <Text style={s.phaseAnnounceKicker}>{phaseAnnounce.kicker}</Text>
            <Text style={s.phaseAnnounceLabel}>{phaseAnnounce.label.toUpperCase()}</Text>
            <Text style={s.phaseAnnounceHint}>{phaseAnnounce.hint}</Text>
          </Animated.View>
        )}

        {/* 3-2-1 prep beat */}
        {prepNum !== null && (
          <View style={s.prepOverlay} pointerEvents="none">
            <Animated.Text key={prepNum} entering={FadeIn.duration(200)} style={[s.prepNum, { color: C.blue }]}>
              {prepNum > 0 ? prepNum : 'Begin'}
            </Animated.Text>
            <Text style={s.prepHint}>Head still  ·  blink naturally</Text>
          </View>
        )}

        {/* Pause overlay */}
        {paused && (
          <View style={s.pauseOverlay}>
            <Text style={s.pauseTitle}>Paused</Text>
            <TouchableOpacity style={s.resumeBtn} onPress={resumeSession} activeOpacity={0.8}>
              <Text style={s.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.endGameBtn} onPress={() => endSession()} activeOpacity={0.8}>
              <Ionicons name="stop-circle-outline" size={15} color={C.red} />
              <Text style={s.endGameBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pause button */}
        {exerciseActive && !paused && (
          <TouchableOpacity style={s.pauseBtn} onPress={pauseSession} activeOpacity={0.7} hitSlop={8}>
            <Ionicons name="pause" size={14} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Start button — the app's premium CTA (sentence case: calm, not a status bar) */}
      <GradientCTA
        label={
          exerciseActive ? 'Following'
            : cooldownActive ? 'Resting'
            : prepNum !== null ? 'Get ready…'
            : sessionDone ? 'Go Again'
            : 'Start Exercise'
        }
        sublabel={
          // Always present — a sublabel-less state shrinks the button and
          // jolts the layout at the exact moment the session ends.
          exerciseActive ? `${timer} sec remaining`
            : cooldownActive ? `${cooldownSecs} sec`
            : prepNum !== null ? 'Starting…'
            : sessionDone ? 'Eyes refreshed'
            : 'Ready when you are'
        }
        icon={
          exerciseActive
            ? <Ionicons name="eye" size={15} color={EYES.buttonTextColor} />
            : !cooldownActive && prepNum === null
              ? <Ionicons name="play" size={16} color={EYES.buttonTextColor} />
              : undefined
        }
        compact
        onPress={beginExercise}
        disabled={exerciseActive || cooldownActive || prepNum !== null}
        keepBright={exerciseActive}
        colors={EYES.buttonGradient}
        glowColor={EYES.buttonShadow}
        textColor={EYES.buttonTextColor}
        letterSpacing={1.4}
        style={s.startCta}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, width: '100%', paddingTop: 10 },

  tipBar: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    height: 34, // fixed — rotating tips must never resize the layout
  },
  tipText: { fontSize: 11.5, color: C.muted, fontWeight: '500', flex: 1 },

  // Info row: chips (idle) ↔ timer (active) — fixed height, zero layout shift
  infoRow: { alignSelf: 'stretch', height: 44, justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  infoChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  infoChipText: { fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 0.3 },
  activeInfo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10 },
  timerBig: { fontSize: 26, fontWeight: '800', color: C.purpleLight },
  statusWord: { fontSize: 14, fontWeight: '700' },

  // Mode selector (idle only)
  modeRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9, gap: 1,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modeBtnActive: { borderColor: C.blue + '99', backgroundColor: 'rgba(34,211,238,0.12)' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: C.dim },
  modeBtnTextActive: { color: C.blue },
  modeBtnHint: { fontSize: 9, fontWeight: '600', color: C.dim, letterSpacing: 0.4 },
  modeBtnHintActive: { color: C.blue + 'aa' },

  guidedHint: { fontSize: 12, color: C.dim, fontWeight: '500', textAlign: 'center', letterSpacing: 0.2 },

  phaseChip: {
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3,
  },
  phaseChipText: { fontSize: 10, fontWeight: '800', color: C.blue, letterSpacing: 0.8, textTransform: 'uppercase' },

  // One mid slot: phase/coaching (active) ↔ chips or hint (idle) — fixed height
  midSlot: { alignSelf: 'stretch', height: 40, justifyContent: 'center' },

  // Path chips — same recipe as the app's selector chips (sound grid etc.)
  diffRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  diffBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  diffBtnActive:     { borderColor: C.blue + '99', backgroundColor: 'rgba(34,211,238,0.12)' },
  diffBtnText:       { fontSize: 12, fontWeight: '700', color: C.dim },
  diffBtnTextActive: { color: C.blue },

  ambientGlow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.blue,
  },
  speck: { position: 'absolute', backgroundColor: '#ffffff' },
  comfortRing: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 1.5, borderColor: C.blue,
  },

  phaseAnnounce: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(3,8,11,0.55)',
  },
  phaseAnnounceKicker: {
    fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 2.5,
  },
  phaseAnnounceLabel: {
    fontSize: 20, fontWeight: '800', color: C.blue,
    letterSpacing: 3,
    textShadowColor: 'rgba(34,211,238,0.4)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  phaseAnnounceHint: { fontSize: 13, color: C.muted, fontWeight: '500' },

  steadyTrack: { alignSelf: 'stretch', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  steadyFill:  { height: 4, backgroundColor: C.blue, borderRadius: 2, opacity: 0.8 },

  arena: {
    borderRadius: 22, backgroundColor: C.arenaBg,
    borderWidth: 1.5, borderColor: 'rgba(34,211,238,0.25)',
    overflow: 'hidden', position: 'relative',
  },

  cometWrap: {
    position: 'absolute', top: 0, left: 0,
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },


  vignette: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    borderWidth: 4, borderColor: C.red,
  },

  followLabel: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    backgroundColor: 'rgba(110,231,183,0.18)',
    borderWidth: 1, borderColor: C.green,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3,
  },
  followLabelText: { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.4 },

  blinkPrompt: {
    position: 'absolute', top: 14, alignSelf: 'center',
    backgroundColor: 'rgba(94,234,212,0.14)',
    borderWidth: 1, borderColor: C.purpleLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
  },
  blinkPromptText: { fontSize: 12, fontWeight: '800', color: C.purpleLight, letterSpacing: 0.8 },

  restBanner: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(34,211,238,0.10)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  restText: { fontSize: 11, color: C.blue, fontWeight: '700', flex: 1, lineHeight: 15 },

  idleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  idleTitle: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.5 },
  idleLines: { gap: 5, marginTop: 2 },
  idleLine: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },

  cometHalo: {
    position: 'absolute',
    width: 46, height: 46, borderRadius: 23,
    left: -7, top: -7,
    borderWidth: 1.5, borderColor: C.blue,
    backgroundColor: 'rgba(34,211,238,0.08)',
  },

  prepOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(3,8,11,0.35)',
  },
  prepHint: { fontSize: 12, color: C.muted, fontWeight: '600', letterSpacing: 0.4 },
  prepNum: {
    fontSize: 84, fontWeight: '200', letterSpacing: 1,
    textShadowColor: 'rgba(34,211,238,0.35)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 22,
  },

  sessionTrack: {
    alignSelf: 'stretch', height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden',
  },
  sessionFill: { height: 3, backgroundColor: C.blue, borderRadius: 2 },
  startCta: { alignSelf: 'stretch' },

  pauseBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(6,18,26,0.88)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3,8,11,0.93)',
    alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10,
  },
  pauseTitle:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  resumeBtn:     { backgroundColor: C.blue, borderRadius: 100, paddingHorizontal: 38, paddingVertical: 13 },
  resumeBtnText: { fontSize: 15, fontWeight: '800', color: '#03212c' },
  endGameBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'rgba(226,75,74,0.45)',
    borderRadius: 100, paddingHorizontal: 28, paddingVertical: 10, marginTop: 4,
  },
  endGameBtnText: { fontSize: 13, fontWeight: '700', color: C.red },

});
