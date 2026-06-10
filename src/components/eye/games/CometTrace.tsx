import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FocusDot } from '@/components/eye/animations/FocusDot';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getDb } from '@/lib/firebase';
import { type GameEndStats } from './GameOverScreen';

interface Props {
  running: boolean;
  onGameEnd?: (stats: GameEndStats) => void;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  arenaBg:     '#0a0818',
  card:        '#1a1535',
  blue:        '#60a5fa',  // solid sky-blue — high contrast on dark navy, easy to track
  blueDim:     '#3b82f6',
  green:       '#6ee7b7',  // status feedback only ("FOLLOWING")
  guide:       '#2a2550',
  red:         '#e24b4a',
  text:        '#ffffff',
  muted:       '#9b8ec4',
  dim:         '#7a6fa0',
  purpleLight: '#a78bfa',
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

const TIPS = [
  'Hold your finger on the comet and let your eyes follow it.',
  'Breathe steadily — this is rest for your eyes, not a race.',
  'If you lose the comet, just rejoin it — no penalty.',
  'Blink whenever you need to — keep your eyes relaxed.',
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

  const guidePathD = useMemo(() => buildPathD(pathStyle, cx0, cy0, R), [pathStyle, cx0, cy0, R]);

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

  // ─── Session lifecycle ──────────────────────────────────────────────────────
  function startSession() {
    if (exerciseActive) return;
    sessionStyleRef.current = pathStyle;

    // Apply path cfg to UI-thread shared values
    styleIdxSV.value = STYLE_IDX[pathStyle];
    loopMsSV.value   = PATHS[pathStyle].loopMs;
    lockRSV.value    = PATHS[pathStyle].lockR;

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

    frameCb.setActive(true);
    sessionTimerHandle.current = setInterval(() => {
      timerLeftRef.current -= 1;
      setTimer(timerLeftRef.current);
      if (timerLeftRef.current <= 0) endSession();
    }, 1000);
    blinkIntervalRef.current = setInterval(triggerBlinkPrompt, BLINK_PROMPT_MS);
  }

  function pauseSession() {
    if (!exerciseActive || pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    frameCb.setActive(false);
    if (sessionTimerHandle.current) { clearInterval(sessionTimerHandle.current); sessionTimerHandle.current = null; }
    stopBlinkPrompt();
  }

  function resumeSession() {
    if (!exerciseActive || !pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    frameCb.setActive(true);
    sessionTimerHandle.current = setInterval(() => {
      timerLeftRef.current -= 1;
      setTimer(timerLeftRef.current);
      if (timerLeftRef.current <= 0) endSession();
    }, 1000);
    blinkIntervalRef.current = setInterval(triggerBlinkPrompt, BLINK_PROMPT_MS);
  }

  function clearAllTimers() {
    if (sessionTimerHandle.current) { clearInterval(sessionTimerHandle.current); sessionTimerHandle.current = null; }
    if (cooldownTickerRef.current)  { clearInterval(cooldownTickerRef.current);  cooldownTickerRef.current  = null; }
    stopBlinkPrompt();
    frameCb.setActive(false);
  }

  function endSession() {
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

    setActive(false);
    setPaused(false);
    setSessionDone(true);
    setFollowingUi(false);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveToFirestore();
    // Parent routes comet-trace straight to the 20-second look-away reset.
    onGameEnd?.({
      headline: '',
      subline:  '',
      rating:   3,
      stats:    [],
      survived: true,
    });
    maybeStartCooldown();
  }

  function saveToFirestore() {
    try {
      void firestore()
        .collection('eyeGameScores')
        .add({
          userId:       user?.uid ?? 'guest',
          game:         'comet_trace',
          kind:         'exercise',
          durationSecs: SESSION_SECS,
          pathStyle:    sessionStyleRef.current,
          timestamp:    new Date(),
        });
    } catch { /* offline */ }
  }

  useEffect(() => { if (!running && exerciseActive) endSession(); }, [running]);
  useEffect(() => () => { clearAllTimers(); }, []);

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

      {/* Eye tip */}
      <View style={s.tipBar}>
        <Ionicons name="eye-outline" size={13} color={C.muted} />
        <Text style={s.tipText} numberOfLines={2}>{TIPS[tipIdx]}</Text>
      </View>

      {/* Time + status (no score / accuracy / combo) */}
      <View style={s.statusRow}>
        <View style={s.statusBlock}>
          <Text style={s.statusLbl}>TIME REMAINING</Text>
          <Text style={s.statusVal}>{timer}s</Text>
        </View>
        <View style={s.statusBlock}>
          <Text style={s.statusLbl}>STATUS</Text>
          <Text style={[s.statusVal, { color: followingUi ? C.green : C.dim, fontSize: 16, lineHeight: 24 }]}>
            {exerciseActive ? (followingUi ? 'Following' : paused ? 'Paused' : 'Rejoin comet') : sessionDone ? 'Complete' : 'Ready'}
          </Text>
        </View>
      </View>

      {/* Path style selector */}
      <View style={s.diffRow}>
        {(['slow', 'medium', 'faster', 'figure8'] as PathStyle[]).map(p => (
          <TouchableOpacity
            key={p} disabled={exerciseActive} onPress={() => setPathStyle(p)}
            style={[s.diffBtn, pathStyle === p && s.diffBtnActive, exerciseActive && s.diffBtnDisabled]}
          >
            <Text style={[s.diffBtnText, pathStyle === p && s.diffBtnTextActive]}>
              {PATHS[p].label}
            </Text>
          </TouchableOpacity>
        ))}
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

        {/* Comet — target-style dot for easy eye tracking */}
        <Animated.View pointerEvents="none" style={[s.cometWrap, cometStyle]}>
          <FocusDot color={C.blue} size={32} />
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

        {/* Idle overlay */}
        {!exerciseActive && !sessionDone && (
          <View style={s.idleOverlay} pointerEvents="none">
            <Ionicons name="planet-outline" size={48} color={C.blue} />
            <Text style={s.idleTitle}>Comet Trace</Text>
            <Text style={s.idleSub}>
              Hold your finger on the comet.{'\n'}
              Eyes follow smoothly — let yourself relax.
            </Text>
          </View>
        )}

        {/* Pause overlay */}
        {paused && (
          <View style={s.pauseOverlay}>
            <Text style={s.pauseTitle}>Paused</Text>
            <TouchableOpacity style={s.resumeBtn} onPress={resumeSession} activeOpacity={0.8}>
              <Text style={s.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.endGameBtn} onPress={endSession} activeOpacity={0.8}>
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

      {/* Start button */}
      <TouchableOpacity
        style={[s.startBtn, (exerciseActive || cooldownActive) && s.startBtnDisabled]}
        onPress={startSession}
        disabled={exerciseActive || cooldownActive}
        activeOpacity={0.8}
      >
        <Text style={s.startBtnText}>
          {exerciseActive  ? `Following · ${timer}s left`
            : cooldownActive ? `Resting · ${cooldownSecs}s`
            : sessionDone    ? '▶  Begin Again'
            : '▶  Begin Exercise'}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, width: '100%' },

  tipBar: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#16113a', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.20)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tipText: { fontSize: 11, color: C.muted, fontWeight: '500', flex: 1, lineHeight: 15 },

  statusRow: {
    flexDirection: 'row', alignSelf: 'stretch',
    backgroundColor: C.card, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  statusBlock: { flex: 1, gap: 4 },
  statusLbl:   { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 1 },
  statusVal:   { fontSize: 24, fontWeight: '800', color: C.purpleLight, lineHeight: 28 },

  diffRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  diffBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: C.card,
  },
  diffBtnActive:     { borderColor: C.blue, backgroundColor: 'rgba(96,165,250,0.14)' },
  diffBtnDisabled:   { opacity: 0.4 },
  diffBtnText:       { fontSize: 12, fontWeight: '700', color: C.dim },
  diffBtnTextActive: { color: C.blue },

  steadyTrack: { alignSelf: 'stretch', height: 4, backgroundColor: '#0f0d22', borderRadius: 2, overflow: 'hidden' },
  steadyFill:  { height: 4, backgroundColor: C.blue, borderRadius: 2, opacity: 0.8 },

  arena: {
    borderRadius: 22, backgroundColor: C.arenaBg,
    borderWidth: 1.5, borderColor: 'rgba(96,165,250,0.22)',
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
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderWidth: 1, borderColor: C.purpleLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
  },
  blinkPromptText: { fontSize: 12, fontWeight: '800', color: C.purpleLight, letterSpacing: 0.8 },

  restBanner: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(96,165,250,0.10)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  restText: { fontSize: 11, color: C.blue, fontWeight: '700', flex: 1, lineHeight: 15 },

  idleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  idleTitle: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.5 },
  idleSub:   { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 22 },

  pauseBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(26,21,53,0.88)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6,4,19,0.93)',
    alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10,
  },
  pauseTitle:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  resumeBtn:     { backgroundColor: C.blue, borderRadius: 100, paddingHorizontal: 38, paddingVertical: 13 },
  resumeBtnText: { fontSize: 15, fontWeight: '800', color: '#0a0818' },
  endGameBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'rgba(226,75,74,0.45)',
    borderRadius: 100, paddingHorizontal: 28, paddingVertical: 10, marginTop: 4,
  },
  endGameBtnText: { fontSize: 13, fontWeight: '700', color: C.red },

  startBtn: {
    alignSelf: 'stretch', backgroundColor: C.blue,
    borderRadius: 100, paddingVertical: 16, alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: '#3d3870' },
  startBtnText:     { fontSize: 15, fontWeight: '800', color: '#0a0818', letterSpacing: 0.5 },
});
