import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, DimensionValue, type LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { type GameEndStats } from './GameOverScreen';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  running: boolean;
  onSession?: (score: number) => void;
  onGameEnd?: (stats: GameEndStats) => void;
}

type Difficulty = 'easy' | 'sharp' | 'elite';
type OrbState   = 'sharp' | 'blurring' | 'blurry' | 'sharpening';

interface DiffConfig {
  label: string; icon: string; size: number; pts: number;
  sharpWindowMs: number; blurInMs: number; blurHoldMs: number; blurOutMs: number;
  baseMoveMs: number; minMoveMs: number;
}

// ─── Difficulty table ─────────────────────────────────────────────────────────
const DIFF: Record<Difficulty, DiffConfig> = {
  easy:  { label: 'Casual', icon: '🟢', size: 80, pts: 1, sharpWindowMs: 1600, blurInMs: 520, blurHoldMs: 460, blurOutMs: 520, baseMoveMs: 1400, minMoveMs: 500 },
  sharp: { label: 'Sharp',  icon: '🟡', size: 60, pts: 2, sharpWindowMs: 1050, blurInMs: 380, blurHoldMs: 340, blurOutMs: 380, baseMoveMs: 950,  minMoveMs: 360 },
  elite: { label: 'Elite',  icon: '🔴', size: 44, pts: 3, sharpWindowMs: 780,  blurInMs: 290, blurHoldMs: 260, blurOutMs: 290, baseMoveMs: 700,  minMoveMs: 280 },
};

// ─── CPU random scoring intervals ────────────────────────────────────────────
const CPU_INTERVAL: Record<Difficulty, { minMs: number; maxMs: number }> = {
  easy:  { minMs: 2600, maxMs: 4800 },
  sharp: { minMs: 1700, maxMs: 3200 },
  elite: { minMs: 1000, maxMs: 2100 },
};

const SESSION_SECS = 60;
const PAD          = 40;
const VW           = 64;
const VH           = 85;
const ARENA_H      = 390;
const TOPBAR_H     = 5;

const WAYPOINTS: { x: number; y: number }[] = [
  { x: 0.08, y: 0.08 }, { x: 0.92, y: 0.08 }, { x: 0.08, y: 0.92 },
  { x: 0.92, y: 0.92 }, { x: 0.50, y: 0.50 }, { x: 0.50, y: 0.08 },
  { x: 0.92, y: 0.50 }, { x: 0.50, y: 0.92 }, { x: 0.08, y: 0.50 },
];
const MOVE_ORDER = [0, 3, 1, 2, 4, 5, 7, 8, 6, 4, 1, 2, 3, 0, 6, 8];

const EYE_TIPS = [
  'Full blinks reset your tear film — blink between targets.',
  'Saccadic training improves reading speed and reduces fatigue.',
  'After this session, look 20 ft away for 20 seconds.',
  'Peripheral vision exercises reduce central eye strain.',
  'Daily training reduces CVS symptoms in 3–4 weeks.',
];

const C = {
  card:        '#1a1535',
  purple:      '#7f77dd',
  purpleLight: '#a78bfa',
  green:       '#6ee7b7',
  red:         '#e24b4a',
  gold:        '#ffd700',
  orange:      '#f97316',
  amber:       '#f59e0b',
  muted:       '#9b8ec4',
  dim:         '#7a6fa0',
  arenaBg:     '#0a0818',
};

const { width: SW } = Dimensions.get('window');
const ARENA_W = SW - 32;

function getTimeMult(t: number): number {
  const e = SESSION_SECS - t;
  if (e < 12) return 1.0 - e * 0.015;
  if (e < 35) return 0.82 - (e - 12) * 0.022;
  return Math.max(0.25, 0.31 - (e - 35) * 0.004);
}

function getAccuracyMsg(pct: number): string {
  if (pct > 80) return 'Excellent focus control. Your ciliary muscle is recovering.';
  if (pct >= 60) return 'Good timing. Keep training to sharpen your focus window.';
  if (pct >= 40) return 'Getting there. Focus switching improves with daily practice.';
  return 'Tough one. This game gets easier as your eyes adapt.';
}

// ─── Particle types ───────────────────────────────────────────────────────────
type ParticleId = string;
interface RippleData { id: ParticleId; x: number; y: number; color: string }
interface FloatData  { id: ParticleId; x: number; y: number; text: string; isHit: boolean }

// ─── Ripple (same as SaccadeSniper) ──────────────────────────────────────────
function Ripple({ x, y, color, size, onDone }: RippleData & { size: number; onDone: () => void }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value   = withTiming(3.0, { duration: 480 });
    opacity.value = withTiming(0,   { duration: 480 }, (f) => { if (f) runOnJS(onDone)(); });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: color,
        left: x - size / 2, top: y - size / 2,
      }, style]}
    />
  );
}

// ─── Float text (same as SaccadeSniper) ──────────────────────────────────────
function FloatText({ x, y, text, isHit, onDone }: FloatData & { onDone: () => void }) {
  const ty      = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    ty.value      = withTiming(-60, { duration: 800 });
    opacity.value = withTiming(0,   { duration: 800 }, (f) => { if (f) runOnJS(onDone)(); });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      pointerEvents="none"
      style={[{
        position: 'absolute',
        left: x - 54, top: y - 22,
        width: 108, textAlign: 'center',
        fontSize: 18, fontWeight: '900',
        color: isHit ? C.green : C.red,
        textShadowColor: isHit ? 'rgba(110,231,183,0.8)' : 'rgba(226,75,74,0.8)',
        textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
      }, style]}
    >
      {text}
    </Animated.Text>
  );
}

// ─── VS bar (same as SaccadeSniper) ──────────────────────────────────────────
function VsBar({ playerScore, cpuScore, isActive }: { playerScore: number; cpuScore: number; isActive: boolean }) {
  const total  = playerScore + cpuScore;
  const pct    = total > 0 ? Math.max(6, Math.min(94, Math.round((playerScore / total) * 100))) : 50;
  const isWin  = playerScore > cpuScore;
  const isLose = playerScore < cpuScore;

  return (
    <View style={vs.card}>
      <View style={vs.row}>
        <View style={vs.side}>
          <Text style={vs.roleYou}>YOU</Text>
          <Text style={[vs.num, isWin && { color: C.green }, isLose && { color: C.red }]}>
            {playerScore}
          </Text>
        </View>
        <View style={vs.mid}>
          <Text style={vs.vsLabel}>VS</Text>
          <Text style={[vs.status, isWin && { color: C.green }, isLose && { color: C.red }]}>
            {isActive
              ? (isWin ? '🔥 WINNING' : isLose ? '😤 LOSING' : '🤝 TIED')
              : (isWin ? '🏆 YOU WIN' : isLose ? '💔 CPU WIN' : '🤝 DRAW')}
          </Text>
        </View>
        <View style={[vs.side, { alignItems: 'flex-end' }]}>
          <Text style={vs.roleCpu}>CPU 🤖</Text>
          <Text style={[vs.num, isLose && { color: C.red }]}>{cpuScore}</Text>
        </View>
      </View>
      <View style={vs.track}>
        <View style={[vs.fill, isWin && { backgroundColor: C.green }, isLose && { backgroundColor: C.red }, { width: `${pct}%` as DimensionValue }]} />
        <View style={vs.midLine} />
      </View>
    </View>
  );
}
const vs = StyleSheet.create({
  card:    { alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 8 },
  row:     { flexDirection: 'row', alignItems: 'center' },
  side:    { flex: 1 },
  mid:     { flex: 1, alignItems: 'center', gap: 2 },
  roleYou: { fontSize: 10, fontWeight: '800', color: C.purpleLight, letterSpacing: 1 },
  roleCpu: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1 },
  num:     { fontSize: 26, fontWeight: '900', color: C.muted },
  vsLabel: { fontSize: 10, fontWeight: '800', color: C.dim, letterSpacing: 2 },
  status:  { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.4 },
  track:   { height: 5, backgroundColor: '#0f0d22', borderRadius: 3, overflow: 'hidden', position: 'relative' },
  fill:    { height: 5, backgroundColor: C.purple, borderRadius: 3 },
  midLine: { position: 'absolute', left: '50%', top: 0, width: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.12)' },
});

// ─── Streak dots (same as SaccadeSniper) ─────────────────────────────────────
function StreakDots({ streak, rush }: { streak: number; rush: boolean }) {
  const activeColor = rush ? C.orange : C.purpleLight;
  return (
    <View style={dt.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[dt.base, i < Math.min(streak, 5) && {
            backgroundColor: activeColor, borderColor: activeColor,
            shadowColor: activeColor, shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6, shadowOpacity: 0.85,
          }]}
        />
      ))}
    </View>
  );
}
const dt = StyleSheet.create({
  row:  { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  base: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a1535', borderWidth: 1, borderColor: '#2e2660' },
});

// ─── Firefly character ────────────────────────────────────────────────────────
function Firefly({
  size, isSharp, sharpnessSV, spawnScaleSV,
}: {
  size: number; isSharp: boolean;
  sharpnessSV: SharedValue<number>;
  spawnScaleSV: SharedValue<number>;
}) {
  const tailPulse = useSharedValue(0.3);

  useEffect(() => {
    tailPulse.value = 0.3;
    tailPulse.value = withRepeat(
      withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    return () => cancelAnimation(tailPulse);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spawnScaleSV.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(sharpnessSV.value, [0, 1], [0, 0.85]),
  }));

  const tailAnimProps = useAnimatedProps(() => ({ opacity: tailPulse.value }));

  const BODY     = '#6ee7b7';
  const BODY_MID = '#4dd9a0';
  const EYE      = '#0a0818';
  const SVG_W    = 64;
  const SVG_H    = 85;
  const svgLeft  = (size - SVG_W) / 2;
  const svgTop   = (size - SVG_H) / 2;

  return (
    <Animated.View style={[{ width: size, height: size, opacity: isSharp ? 1 : 0.2 }, containerStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[{
          position: 'absolute', left: svgLeft, top: svgTop,
          width: SVG_W, height: SVG_H,
          shadowColor: '#6ee7b7', shadowOffset: { width: 0, height: 0 },
          shadowRadius: 18, elevation: 10,
        }, glowStyle]}
      >
        <Svg width={SVG_W} height={SVG_H} viewBox="0 0 60 80">
          <Ellipse cx={15} cy={35} rx={13} ry={7} fill="rgba(255,255,255,0.25)" transform="rotate(-25, 15, 35)" />
          <Ellipse cx={45} cy={35} rx={13} ry={7} fill="rgba(255,255,255,0.25)" transform="rotate(25, 45, 35)" />
          <Ellipse cx={30} cy={50} rx={9} ry={14} fill={BODY} />
          <Ellipse cx={30} cy={34} rx={7} ry={8}  fill={BODY_MID} />
          <Circle  cx={30} cy={22} r={7}           fill={BODY_MID} />
          <Path d="M 27 16 Q 20 8 18 4" stroke={BODY} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <Path d="M 33 16 Q 40 8 42 4" stroke={BODY} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <Circle cx={18} cy={4} r={2} fill={BODY} />
          <Circle cx={42} cy={4} r={2} fill={BODY} />
          <AnimatedCircle cx={30} cy={64} r={4} fill="#ffffff" animatedProps={tailAnimProps} />
          <Circle cx={27} cy={21} r={2} fill={EYE} />
          <Circle cx={33} cy={21} r={2} fill={EYE} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Arena corner markers ─────────────────────────────────────────────────────
function ArenaCorners({ color }: { color: string }) {
  const L = 14;
  const corners = [
    { top: 10, left: 10,     borderTopWidth: 1.5, borderLeftWidth: 1.5   },
    { top: 10, right: 10,    borderTopWidth: 1.5, borderRightWidth: 1.5  },
    { bottom: 10, left: 10,  borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
    { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  ] as const;
  return (
    <>
      {corners.map((c, i) => (
        <View key={i} pointerEvents="none"
          style={[{ position: 'absolute', width: L, height: L, borderColor: color }, c]}
        />
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FocusSprint({ running, onSession, onGameEnd }: Props) {
  const [diff, setDiff]              = useState<Difficulty>('easy');
  const [gameActive, setGameActive]  = useState(false);
  const [paused, setPaused]          = useState(false);
  const [orbState, setOrbState]      = useState<OrbState>('sharp');
  const [score, setScore]            = useState(0);
  const [cpuScore, setCpuScore]      = useState(0);
  const [streak, setStreak]          = useState(0);
  const [bestStreak, setBestStreak]  = useState(0);
  const [hits, setHits]              = useState(0);
  const [timer, setTimer]            = useState(SESSION_SECS);
  const [tipIdx, setTipIdx]          = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [missFlash, setMissFlash]    = useState(false);
  const [rushMode, setRushMode]      = useState(false);
  const [streakGlow, setStreakGlow]  = useState(false);

  // Particles
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [floats, setFloats]   = useState<FloatData[]>([]);

  // Combo popup
  const comboPopScale   = useSharedValue(0);
  const comboPopOpacity = useSharedValue(0);
  const [comboLabel, setComboLabel] = useState('');

  // Shared values
  const timerBarAnim = useSharedValue(1);
  const sharpness    = useSharedValue(1);
  const orbNormX     = useSharedValue(0.5);
  const orbNormY     = useSharedValue(0.5);
  const spawnScaleSV = useSharedValue(1);
  const rushSV       = useSharedValue(0);
  const arenaWSV     = useSharedValue(ARENA_W);
  const arenaHSV     = useSharedValue(ARENA_H);
  const tapScale     = useSharedValue(1);

  // Refs
  const gameActiveRef  = useRef(false);
  const pausedRef      = useRef(false);
  const endedRef       = useRef(false);
  const rushModeRef    = useRef(false);
  const orbStateRef    = useRef<OrbState>('sharp');
  const sessionDiffRef = useRef<Difficulty>('easy');
  const sessionTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const orbTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cpuHitTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerLeft      = useRef(SESSION_SECS);
  const scoreRef       = useRef(0);
  const cpuScoreRef    = useRef(0);
  const streakRef      = useRef(0);
  const bestStreakRef  = useRef(0);
  const hitsRef        = useRef(0);
  const totalTapsRef   = useRef(0);
  const focusTimesRef  = useRef<number[]>([]);
  const phaseStartRef  = useRef(0);
  const sharpEndRef    = useRef(0);
  const particleId     = useRef(0);
  const patternStepRef = useRef(0);

  function uid() { return String(particleId.current++); }
  function clearOrbTimer() { if (orbTimer.current) { clearTimeout(orbTimer.current); orbTimer.current = null; } }
  function clearCpuTimer() { if (cpuHitTimer.current) { clearTimeout(cpuHitTimer.current); cpuHitTimer.current = null; } }

  function scheduleNextMove() {
    if (!gameActiveRef.current || pausedRef.current) return;
    const d = DIFF[sessionDiffRef.current];
    const timeMult   = getTimeMult(timerLeft.current);
    const streakMult = Math.max(0.60, 1 - streakRef.current * 0.022);
    const rushMult   = rushModeRef.current ? 0.52 : 1.0;
    const duration   = Math.max(d.minMoveMs, Math.round(d.baseMoveMs * timeMult * streakMult * rushMult));

    const wp = WAYPOINTS[MOVE_ORDER[patternStepRef.current % MOVE_ORDER.length]];
    patternStepRef.current += 1;

    const jx = (Math.random() - 0.5) * 0.05;
    const jy = (Math.random() - 0.5) * 0.05;
    const nx = Math.max(0.04, Math.min(0.96, wp.x + jx));
    const ny = Math.max(0.04, Math.min(0.96, wp.y + jy));

    orbNormX.value = withTiming(nx, { duration, easing: Easing.inOut(Easing.quad) });
    orbNormY.value = withTiming(ny, { duration, easing: Easing.inOut(Easing.quad) }, (finished) => {
      if (finished) runOnJS(scheduleNextMove)();
    });
  }

  function onArenaLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    arenaWSV.value = width;
    arenaHSV.value = height;
  }

  function scheduleCpuNext() {
    if (!gameActiveRef.current || pausedRef.current) return;
    const { minMs, maxMs } = CPU_INTERVAL[sessionDiffRef.current];
    const delay = minMs + Math.random() * (maxMs - minMs);
    cpuHitTimer.current = setTimeout(() => {
      if (!gameActiveRef.current || pausedRef.current) return;
      cpuScoreRef.current += DIFF[sessionDiffRef.current].pts;
      setCpuScore(cpuScoreRef.current);
      scheduleCpuNext();
    }, delay);
  }

  function startSharpPhase() {
    if (!gameActiveRef.current) return;
    clearOrbTimer();
    orbStateRef.current   = 'sharp';
    phaseStartRef.current = Date.now();
    setOrbState('sharp');
    const d = DIFF[sessionDiffRef.current];
    orbTimer.current = setTimeout(() => {
      if (!pausedRef.current && gameActiveRef.current) startBlurringPhase();
    }, d.sharpWindowMs);
  }

  function startBlurringPhase() {
    if (!gameActiveRef.current) return;
    clearOrbTimer();
    sharpEndRef.current = Date.now();
    orbStateRef.current = 'blurring';
    setOrbState('blurring');
    const d = DIFF[sessionDiffRef.current];
    sharpness.value = withTiming(0, { duration: d.blurInMs });
    orbTimer.current = setTimeout(() => {
      if (!pausedRef.current && gameActiveRef.current) startBlurryPhase();
    }, d.blurInMs);
  }

  function startBlurryPhase() {
    if (!gameActiveRef.current) return;
    clearOrbTimer();
    orbStateRef.current = 'blurry';
    setOrbState('blurry');
    const d = DIFF[sessionDiffRef.current];
    orbTimer.current = setTimeout(() => {
      if (!pausedRef.current && gameActiveRef.current) startSharpeningPhase();
    }, d.blurHoldMs);
  }

  function startSharpeningPhase() {
    if (!gameActiveRef.current) return;
    clearOrbTimer();
    orbStateRef.current = 'sharpening';
    setOrbState('sharpening');
    const d = DIFF[sessionDiffRef.current];
    sharpness.value = withTiming(1, { duration: d.blurOutMs });
    orbTimer.current = setTimeout(() => {
      if (!pausedRef.current && gameActiveRef.current) startSharpPhase();
    }, d.blurOutMs);
  }

  function showComboPopup(combo: number) {
    if (combo < 2) return;
    const labels = ['', '', '⚡ x2 Combo!', '🔥 x3 Combo!', '💥 x4 ULTRA!'];
    setComboLabel(labels[Math.min(combo, 4)] ?? `x${combo}`);
    comboPopScale.value   = 1;
    comboPopOpacity.value = withTiming(1, { duration: 120 }, () => {
      comboPopOpacity.value = withTiming(0, { duration: 480 });
    });
  }

  function handleOrbTap(tapX: number, tapY: number) {
    if (!gameActiveRef.current || pausedRef.current) return;
    totalTapsRef.current += 1;

    const graceHit = orbStateRef.current !== 'sharp' && Date.now() - sharpEndRef.current < 160;
    if (orbStateRef.current === 'sharp' || graceHit) {
      const focusMs  = Date.now() - phaseStartRef.current;
      focusTimesRef.current.push(focusMs);

      const d        = DIFF[sessionDiffRef.current];
      const newStreak = streakRef.current + 1;
      const combo     = newStreak >= 9 ? 4 : newStreak >= 6 ? 3 : newStreak >= 3 ? 2 : 1;
      const earned    = d.pts * combo;

      streakRef.current    = newStreak;
      scoreRef.current    += earned;
      bestStreakRef.current = Math.max(bestStreakRef.current, newStreak);
      hitsRef.current     += 1;

      setStreak(newStreak);
      setScore(scoreRef.current);
      setBestStreak(bestStreakRef.current);
      setHits(hitsRef.current);
      setStreakGlow(newStreak >= 3);

      if (newStreak >= 3 && !rushModeRef.current) {
        rushModeRef.current = true;
        setRushMode(true);
      }

      // Tap scale pulse on firefly
      tapScale.value = withSequence(
        withSpring(combo >= 2 ? 1.28 : 1.18, { damping: 8, stiffness: 260 }),
        withSpring(1.0, { damping: 14 }),
      );

      // Ripple + float at tap position
      const rippleColor = rushMode ? C.orange : combo >= 2 ? C.gold : C.green;
      setRipples(r => [...r, { id: uid(), x: tapX, y: tapY, color: rippleColor }]);

      const label =
        combo >= 4 ? `💥 ×4  +${earned}` :
        combo >= 3 ? `🔥 ×3  +${earned}` :
        combo >= 2 ? `⚡ ×2  +${earned}` :
        `+${earned}`;
      setFloats(f => [...f, { id: uid(), x: tapX, y: tapY, text: label, isHit: true }]);

      showComboPopup(combo);

      if      (combo >= 3) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (combo >= 2) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else                 void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      startBlurringPhase();
    } else {
      streakRef.current = 0;
      setStreak(0);
      setStreakGlow(false);
      if (rushModeRef.current) { rushModeRef.current = false; setRushMode(false); }
      setFloats(f => [...f, { id: uid(), x: tapX, y: tapY, text: '✗ MISS', isHit: false }]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMissFlash(true);
      setTimeout(() => setMissFlash(false), 320);
    }
  }

  function startSession() {
    if (gameActive) return;
    scoreRef.current = 0; cpuScoreRef.current = 0; streakRef.current = 0;
    bestStreakRef.current = 0; hitsRef.current = 0; totalTapsRef.current = 0;
    timerLeft.current = SESSION_SECS; focusTimesRef.current = [];
    sessionDiffRef.current = diff; pausedRef.current = false;
    endedRef.current = false; rushModeRef.current = false;
    gameActiveRef.current = true; patternStepRef.current = 0;

    orbNormX.value = 0.5; orbNormY.value = 0.5;
    sharpness.value = 1; rushSV.value = 0; spawnScaleSV.value = 1;

    setScore(0); setCpuScore(0); setStreak(0); setBestStreak(0); setHits(0);
    setTimer(SESSION_SECS); setSessionDone(false);
    setPaused(false); setMissFlash(false); setRushMode(false); setStreakGlow(false);
    setRipples([]); setFloats([]);
    setTipIdx(t => (t + 1) % EYE_TIPS.length);
    setGameActive(true);

    timerBarAnim.value = 1;
    timerBarAnim.value = withTiming(0, { duration: SESSION_SECS * 1000 });

    sessionTimer.current = setInterval(() => {
      timerLeft.current -= 1;
      setTimer(timerLeft.current);
      if (timerLeft.current <= 0) endSession();
    }, 1000);

    setTimeout(() => {
      if (gameActiveRef.current) { scheduleNextMove(); startSharpPhase(); scheduleCpuNext(); }
    }, 350);
  }

  function pauseSession() {
    if (!gameActiveRef.current || pausedRef.current) return;
    pausedRef.current = true; setPaused(true);
    clearOrbTimer(); clearCpuTimer();
    if (sessionTimer.current) { clearInterval(sessionTimer.current); sessionTimer.current = null; }
    cancelAnimation(timerBarAnim); cancelAnimation(sharpness);
    cancelAnimation(orbNormX); cancelAnimation(orbNormY);
  }

  function resumeSession() {
    if (!gameActiveRef.current || !pausedRef.current) return;
    pausedRef.current = false; setPaused(false);
    timerBarAnim.value = withTiming(0, { duration: timerLeft.current * 1000 });
    sessionTimer.current = setInterval(() => {
      timerLeft.current -= 1;
      setTimer(timerLeft.current);
      if (timerLeft.current <= 0) endSession();
    }, 1000);
    scheduleNextMove(); startSharpPhase(); scheduleCpuNext();
  }

  function endSession() {
    if (endedRef.current) return;
    endedRef.current = true; pausedRef.current = false; gameActiveRef.current = false;
    rushModeRef.current = false;
    setPaused(false); setGameActive(false); setRushMode(false); setStreakGlow(false);
    clearOrbTimer(); clearCpuTimer();
    if (sessionTimer.current) { clearInterval(sessionTimer.current); sessionTimer.current = null; }
    setSessionDone(true);
    cancelAnimation(timerBarAnim); cancelAnimation(sharpness);
    cancelAnimation(orbNormX); cancelAnimation(orbNormY); cancelAnimation(rushSV);

    const h        = hitsRef.current;
    const accuracy = totalTapsRef.current > 0 ? Math.round((h / totalTapsRef.current) * 100) : 0;
    const youWon   = scoreRef.current > cpuScoreRef.current;
    const tied     = scoreRef.current === cpuScoreRef.current;
    const gap      = Math.abs(scoreRef.current - cpuScoreRef.current);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSession?.(scoreRef.current);
    onGameEnd?.({
      headline: youWon ? `${scoreRef.current} PTS 🏆` : `${scoreRef.current} PTS`,
      subline: youWon
        ? `Beat CPU by ${gap} pts — ${getAccuracyMsg(accuracy)}`
        : tied
        ? `Tied with CPU! — ${getAccuracyMsg(accuracy)}`
        : `CPU won by ${gap} pts — ${getAccuracyMsg(accuracy)}`,
      rating:  accuracy > 80 ? 3 : accuracy >= 50 ? 2 : 1,
      stats: [
        { label: 'Your Score',  value: `${scoreRef.current}` },
        { label: 'CPU Score',   value: `${cpuScoreRef.current}` },
        { label: 'Hits',        value: `${hitsRef.current}` },
        { label: 'Best Streak', value: `${bestStreakRef.current}` },
      ],
      survived: true,
    });
  }

  useEffect(() => { if (!running && gameActiveRef.current) endSession(); }, [running]);
  useEffect(() => {
    return () => {
      clearOrbTimer(); clearCpuTimer();
      if (sessionTimer.current) clearInterval(sessionTimer.current);
    };
  }, []);

  // ─── Animated styles ───────────────────────────────────────────────────────
  const timerBarStyle = useAnimatedStyle(() => {
    const v = timerBarAnim.value;
    return {
      width: `${Math.round(v * 100)}%` as `${number}%`,
      backgroundColor: v < 0.25 ? C.red : v < 0.5 ? C.amber : C.purple,
    };
  });

  const orbMoveStyle = useAnimatedStyle(() => {
    const aW = arenaWSV.value;
    const aH = arenaHSV.value;
    const x  = PAD + orbNormX.value * Math.max(0, aW - PAD * 2 - VW);
    const y  = PAD + orbNormY.value * Math.max(0, aH - PAD * 2 - VH);
    return { position: 'absolute' as const, left: x, top: y, width: VW, height: VH };
  });

  const orbTapScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));

  const comboPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboPopScale.value }],
    opacity:   comboPopOpacity.value,
  }));

  const isOrbSharp  = orbState === 'sharp';
  const lowTime     = gameActive && timer <= 15;
  const hiStreak    = streak >= 3;
  const cornerColor = rushMode ? C.orange : hiStreak ? C.gold : 'rgba(127,119,221,0.25)';

  const arenaStyle = [
    s.arena, { width: ARENA_W } as const,
    missFlash  && s.arenaFlash,
    rushMode   && !missFlash && s.arenaRush,
    !rushMode  && hiStreak && !missFlash && s.arenaGold,
    lowTime    && !rushMode && !missFlash && !hiStreak && s.arenaLow,
  ];

  return (
    <View style={s.wrap}>

      {/* Eye tip */}
      <View style={s.tipBar}>
        <Ionicons name="eye-outline" size={13} color={C.muted} />
        <Text style={s.tipText} numberOfLines={1}>{EYE_TIPS[tipIdx]}</Text>
      </View>

      {/* Stats row — Hits · Score · Streak · Best */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statVal}>{hits}</Text>
          <Text style={s.statLbl}>Hits</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={s.statVal}>{score}</Text>
          <Text style={s.statLbl}>Score</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={[
            s.statVal,
            streak >= 9 ? { color: C.gold }   :
            streak >= 6 ? { color: C.orange }  :
            streak >= 3 ? { color: C.amber }   : null,
          ]}>
            {streak >= 5 ? `${streak}⚡` : streak}
          </Text>
          <Text style={s.statLbl}>Streak</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={s.statVal}>{bestStreak}</Text>
          <Text style={s.statLbl}>Best</Text>
        </View>
      </View>

      {/* Difficulty pills */}
      <View style={s.diffRow}>
        {(['easy', 'sharp', 'elite'] as Difficulty[]).map(d => (
          <TouchableOpacity
            key={d} disabled={gameActive} onPress={() => setDiff(d)}
            style={[s.diffBtn, diff === d && s.diffBtnActive, gameActive && s.diffBtnDisabled]}
          >
            <Text style={[s.diffBtnText, diff === d && s.diffBtnTextActive]}>
              {DIFF[d].icon} {DIFF[d].label}
            </Text>
            {diff === d && <Text style={s.diffSub}>{DIFF[d].sharpWindowMs}ms window</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* VS bar */}
      {(gameActive || sessionDone) && (
        <VsBar playerScore={score} cpuScore={cpuScore} isActive={gameActive} />
      )}

      {/* Arena */}
      <View style={arenaStyle} onLayout={onArenaLayout}>
        <ArenaCorners color={cornerColor} />

        {/* Timer bar (top strip) */}
        <View style={s.timerTrack}>
          <Animated.View style={[s.timerFill, timerBarStyle]} />
        </View>

        {/* Rush badge */}
        {rushMode && gameActive && (
          <View style={s.rushBadge} pointerEvents="none">
            <Text style={s.rushBadgeText}>⚡ RUSH</Text>
          </View>
        )}

        {/* Firefly */}
        <Animated.View style={orbMoveStyle} pointerEvents="box-none">
          {gameActive && (
            <Text style={[s.orbLabel, { color: isOrbSharp ? (rushMode ? C.orange : C.green) : C.dim }]}>
              {isOrbSharp ? (rushMode ? '⚡ Catch it!' : 'Catch it!') : orbState === 'blurry' ? 'Wait...' : ''}
            </Text>
          )}
          <TouchableOpacity
            onPressIn={e => {
              const { locationX, locationY } = e.nativeEvent;
              const maxX = Math.max(0, arenaWSV.value - PAD * 2 - VW);
              const maxY = Math.max(0, arenaHSV.value - PAD * 2 - VH);
              handleOrbTap(
                PAD + orbNormX.value * maxX + locationX,
                PAD + orbNormY.value * maxY + locationY,
              );
            }}
            activeOpacity={1}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={s.orbTouch}
          >
            <Animated.View style={orbTapScaleStyle}>
              <Firefly
                size={DIFF[sessionDiffRef.current].size}
                isSharp={isOrbSharp}
                sharpnessSV={sharpness}
                spawnScaleSV={spawnScaleSV}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* Ripples + floats */}
        {ripples.map(r => (
          <Ripple key={r.id} {...r} size={DIFF[sessionDiffRef.current].size}
            onDone={() => setRipples(p => p.filter(x => x.id !== r.id))}
          />
        ))}
        {floats.map(f => (
          <FloatText key={f.id} {...f}
            onDone={() => setFloats(p => p.filter(x => x.id !== f.id))}
          />
        ))}

        {/* Combo popup */}
        <Animated.View style={[s.comboPill, comboPopStyle]} pointerEvents="none">
          <Text style={s.comboText}>{comboLabel}</Text>
        </Animated.View>

        {/* Idle overlay */}
        {!gameActive && !sessionDone && (
          <View style={s.idleOverlay}>
            <Ionicons name="eye-outline" size={52} color={C.purpleLight} />
            <Text style={s.idleTitle}>Focus Sprint</Text>
            <Text style={s.idleSub}>
              Track the firefly.{'\n'}
              Tap when <Text style={{ color: C.green, fontWeight: '800' }}>glowing</Text> to score.{'\n'}
              Build streaks for bonus points.
            </Text>
          </View>
        )}

        {/* Pause overlay */}
        {paused && (
          <View style={s.pauseOverlay}>
            <Text style={s.pauseTitle}>Paused</Text>
            <Text style={s.pauseSub}>CPU keeps scoring…</Text>
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
        {gameActive && !paused && (
          <TouchableOpacity style={s.pauseBtn} onPress={pauseSession} activeOpacity={0.7} hitSlop={8}>
            <Ionicons name="pause" size={14} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Streak dots */}
      <StreakDots streak={streak} rush={rushMode} />

      {/* Start / replay */}
      <TouchableOpacity
        style={[s.startBtn, gameActive && s.startBtnDisabled]}
        onPress={startSession} disabled={gameActive} activeOpacity={0.8}
      >
        <Text style={s.startBtnText}>
          {gameActive ? `Playing · ${timer}s left`
            : sessionDone ? '▶  Play Again'
            : '▶  Start Session'}
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
    borderWidth: 1, borderColor: 'rgba(127,119,221,0.2)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tipText: { fontSize: 11, color: C.muted, fontWeight: '500', flex: 1 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch',
    backgroundColor: C.card, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  stat:    { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 20, fontWeight: '800', color: C.purpleLight },
  statLbl: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.5 },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  diffRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  diffBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: C.card,
  },
  diffBtnActive:     { borderColor: C.purple, backgroundColor: 'rgba(127,119,221,0.15)' },
  diffBtnDisabled:   { opacity: 0.4 },
  diffBtnText:       { fontSize: 12, fontWeight: '700', color: C.dim },
  diffBtnTextActive: { color: C.purpleLight },
  diffSub:           { fontSize: 9, color: C.muted, marginTop: 2 },

  arena: {
    height: ARENA_H, borderRadius: 22,
    backgroundColor: C.arenaBg,
    borderWidth: 1.5, borderColor: 'rgba(127,119,221,0.2)',
    overflow: 'hidden', position: 'relative',
  },
  arenaFlash: { borderColor: C.red,    borderWidth: 2.5 },
  arenaRush:  { borderColor: C.orange, borderWidth: 2, shadowColor: C.orange, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
  arenaGold:  { borderColor: C.gold,   borderWidth: 2, shadowColor: C.gold,   shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  arenaLow:   { borderColor: C.red,    borderWidth: 1.5, shadowColor: C.red,  shadowOpacity: 0.2,  shadowRadius: 8 },

  timerTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: TOPBAR_H, backgroundColor: 'rgba(255,255,255,0.04)' },
  timerFill:  { height: TOPBAR_H, borderRadius: 0 },

  rushBadge: {
    position: 'absolute', top: 12, left: 12, zIndex: 5,
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderWidth: 1, borderColor: C.orange,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  rushBadgeText: { fontSize: 11, fontWeight: '900', color: C.orange, letterSpacing: 1 },

  comboPill: {
    position: 'absolute', top: 14, right: 14, zIndex: 8,
    backgroundColor: 'rgba(83,74,183,0.9)', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(127,119,221,0.5)',
  },
  comboText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  orbLabel: {
    position: 'absolute', top: -27, left: -26, right: -26,
    textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
  },
  orbTouch: { width: '100%', height: '100%' },

  idleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  idleTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  idleSub:   { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 24 },

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
  pauseSub:      { fontSize: 12, color: C.red, fontWeight: '600', marginBottom: 8 },
  resumeBtn:     { backgroundColor: C.purple, borderRadius: 100, paddingHorizontal: 38, paddingVertical: 13 },
  resumeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  endGameBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'rgba(226,75,74,0.45)',
    borderRadius: 100, paddingHorizontal: 28, paddingVertical: 10, marginTop: 4,
  },
  endGameBtnText: { fontSize: 13, fontWeight: '700', color: C.red },

  startBtn: {
    alignSelf: 'stretch', backgroundColor: C.purple,
    borderRadius: 100, paddingVertical: 16, alignItems: 'center',
    shadowColor: C.purple, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  startBtnDisabled: { backgroundColor: '#3d3870', shadowOpacity: 0 },
  startBtnText:     { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});
