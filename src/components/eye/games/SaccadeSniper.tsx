import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, DimensionValue, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { getFirestore, collection, addDoc } from '@react-native-firebase/firestore';
import { useAuth } from '@/context/AuthContext';

const db = getFirestore();
import { type GameEndStats } from './GameOverScreen';

interface Props {
  running: boolean;
  onScore?: (score: number, bestMs: number) => void;
  onGameEnd?: (stats: GameEndStats) => void;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#0e0b1e',
  arenaBg:     '#060413',
  card:        '#1a1535',
  purple:      '#7f77dd',
  purpleLight: '#a78bfa',
  green:       '#6ee7b7',
  text:        '#ffffff',
  muted:       '#9b8ec4',
  dim:         '#7a6fa0',
  amber:       '#f59e0b',
  red:         '#e24b4a',
  gold:        '#ffd700',
  orange:      '#f97316',
};

const TARGET_COLORS = ['#7f77dd', '#a78bfa', '#6ee7b7', '#f59e0b', '#f472b6', '#38bdf8'];

const EYE_TIPS = [
  'Blinking resets tear film — blink between targets.',
  'Saccadic training improves reading speed and reduces fatigue.',
  'After this session, look 20 feet away for 20 seconds.',
  'Peripheral vision exercises reduce central eye strain.',
  'Daily training reduces CVS symptoms in 3–4 weeks.',
];

// ─── Difficulty ───────────────────────────────────────────────────────────────
type Difficulty = 'easy' | 'sharp' | 'elite';
const DIFF: Record<Difficulty, { icon: string; size: number; speedMs: number; pts: number; label: string }> = {
  easy:  { icon: '🟢', size: 80, speedMs: 1000, pts: 1, label: 'Casual' },
  sharp: { icon: '🟡', size: 60, speedMs:  600, pts: 2, label: 'Sharp'  },
  elite: { icon: '🔴', size: 48, speedMs:  380, pts: 3, label: 'Elite'  },
};

// ─── CPU random scoring intervals ────────────────────────────────────────────
const CPU_INTERVAL: Record<Difficulty, { minMs: number; maxMs: number }> = {
  easy:  { minMs: 2400, maxMs: 4400 },
  sharp: { minMs: 1300, maxMs: 2500 },
  elite: { minMs: 720,  maxMs: 1500 },
};

const SESSION_SECS = 60;
const ARENA_H      = 420;
const TOPBAR_H     = 5;
const { width: SW } = Dimensions.get('window');
const ARENA_W = SW - 32;

// Speed ramps aggressively from the start — trains full eye speed
function getTimeMult(t: number): number {
  const e = SESSION_SECS - t;
  if (e < 10) return 1.0  - e * 0.018;  // 1.0 → 0.82 (fast first 10s)
  if (e < 30) return 0.82 - (e - 10) * 0.030; // 0.82 → 0.22 (intense ramp 10–30s)
  return Math.max(0.18, 0.22 - (e - 30) * 0.003); // 0.22 → 0.18 (peak)
}

function getMotivation(s: number): string {
  if (s >= 80) return 'Incredible! Your eyes are fully online.';
  if (s >= 50) return 'Excellent! Elite-level eye coordination.';
  if (s >= 25) return 'Sharp reflexes! Your saccadic muscles are improving.';
  if (s >= 10) return 'Good start! Daily sessions reduce eye fatigue.';
  return 'Keep going — your eyes need the practice.';
}

// ─── Particle types ───────────────────────────────────────────────────────────
type ParticleId = string;
interface RippleData { id: ParticleId; x: number; y: number; color: string }
interface FloatData  { id: ParticleId; x: number; y: number; text: string; isHit: boolean }

// ─── Ripple ───────────────────────────────────────────────────────────────────
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

// ─── Float text ───────────────────────────────────────────────────────────────
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
        left: x - 48, top: y - 22,
        width: 96, textAlign: 'center',
        fontSize: 17, fontWeight: '900',
        color: isHit ? C.green : C.red,
        textShadowColor: isHit ? 'rgba(110,231,183,0.8)' : 'rgba(226,75,74,0.8)',
        textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
      }, style]}
    >
      {text}
    </Animated.Text>
  );
}

// ─── Target shapes ───────────────────────────────────────────────────────────
const TARGET_SHAPES = ['star', 'circle', 'diamond', 'triangle'] as const;
type TargetShape = typeof TARGET_SHAPES[number];

function getShapePath(shape: TargetShape, size: number): string {
  switch (shape) {
    case 'star':
      // 5-point star
      return 'M25 2 L29 21 L48 25 L29 29 L25 48 L21 29 L2 25 L21 21 Z';
    case 'circle':
      return 'M9,25 A16,16 0 1,1 41,25 A16,16 0 1,1 9,25 Z';
    case 'diamond':
      return 'M25 2 L48 25 L25 48 L2 25 Z';
    case 'triangle':
      return 'M25 4 L47 43 L3 43 Z';
  }
}// ─── Target ───────────────────────────────────────────────────────────────────
function Target({ x, y, size, color, shape, onPress }: { x: number; y: number; size: number; color: string; shape: TargetShape; onPress: () => void }) {
  // No spawn animation at all — appears instantly, fully tappable from frame 1.
  const slop = Math.max(22, Math.round(40 - size * 0.35));

  return (
    <View style={{
      position: 'absolute',
      width: size, height: size,
      left: x - size / 2, top: y - size / 2,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowRadius: 14, shadowOpacity: 0.9, elevation: 10,
    }}>
      <TouchableOpacity
        onPressIn={onPress} activeOpacity={0.7}
        hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={size} height={size} viewBox="0 0 50 50">
          <Path
            d={getShapePath(shape, size)}
            fill={color}
          />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

// ─── Dying target ─────────────────────────────────────────────────────────────
function DyingTarget({ x, y, size, color, shape, onDone }: { x: number; y: number; size: number; color: string; shape: TargetShape; onDone: () => void }) {
  const opacity = useSharedValue(0.5);
  const scale   = useSharedValue(1);
  useEffect(() => {
    // Shorter + smaller — was a 240ms 1.6x bloom which read as a "shake"
    // when elite cycles overlap with new spawns.
    opacity.value = withTiming(0,    { duration: 160 }, (f) => { if (f) runOnJS(onDone)(); });
    scale.value   = withTiming(1.25, { duration: 160 });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, left: x - size / 2, top: y - size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 50 50">
        <Path
          d={getShapePath(shape, size)}
          fill="none" stroke={color} strokeWidth={2}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Arena corners ────────────────────────────────────────────────────────────
function ArenaCorners({ color }: { color: string }) {
  const L = 14;
  const corners = [
    { top: 12, left: 10,     borderTopWidth: 1.5, borderLeftWidth: 1.5    },
    { top: 12, right: 10,    borderTopWidth: 1.5, borderRightWidth: 1.5   },
    { bottom: 10, left: 10,  borderBottomWidth: 1.5, borderLeftWidth: 1.5  },
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

// ─── Streak dots ──────────────────────────────────────────────────────────────
function StreakDots({ streak, rush }: { streak: number; rush: boolean }) {
  const activeColor = rush ? C.orange : C.purpleLight;
  return (
    <View style={dot.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[dot.base, i < Math.min(streak, 5) && { backgroundColor: activeColor, borderColor: activeColor, shadowColor: activeColor, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 0.85 }]}
        />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  row:  { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  base: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a1535', borderWidth: 1, borderColor: '#2e2660' },
});

// ─── VS bar ───────────────────────────────────────────────────────────────────
function VsBar({ playerScore, cpuScore, isActive }: { playerScore: number; cpuScore: number; isActive: boolean }) {
  const total   = playerScore + cpuScore;
  const pct     = total > 0 ? Math.max(6, Math.min(94, Math.round((playerScore / total) * 100))) : 50;
  const isWin   = playerScore > cpuScore;
  const isLose  = playerScore < cpuScore;

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

// ─── Main component ───────────────────────────────────────────────────────────
export function SaccadeSniper({ running, onScore, onGameEnd }: Props) {
  const { user } = useAuth();

  const [diff, setDiff]              = useState<Difficulty>('easy');
  const [gameActive, setGameActive]  = useState(false);
  const [paused, setPaused]          = useState(false);
  const [hits, setHits]              = useState(0);
  const [streak, setStreak]          = useState(0);
  const [bestStreak, setBestStreak]  = useState(0);
  const [combo, setCombo]            = useState(1);
  const [score, setScore]            = useState(0);
  const [cpuScore, setCpuScore]      = useState(0);
  const [timer, setTimer]            = useState(SESSION_SECS);
  const [tipIdx, setTipIdx]          = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [rushMode, setRushMode]      = useState(false);
  const [missFlash, setMissFlash]    = useState(false);
  const [streakGlow, setStreakGlow]  = useState(false);

  // Target state
  const [targetVisible, setTargetVisible] = useState(false);
  const [targetDying, setTargetDying]     = useState(false);
  const [targetPos, setTargetPos]         = useState({ x: 0, y: 0 });
  const [targetColor, setTargetColor]     = useState(TARGET_COLORS[0]);
  const [targetShape, setTargetShape]     = useState<TargetShape>('star');

  // Particles
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [floats, setFloats]   = useState<FloatData[]>([]);

  // Combo popup
  const comboPopScale   = useSharedValue(0);
  const comboPopOpacity = useSharedValue(0);
  const [comboLabel, setComboLabel] = useState('');

  // Timer bar
  const timerBarAnim = useSharedValue(1);

  // Refs
  const hitsRef       = useRef(0);
  const streakRef     = useRef(0);
  const bestStreakRef  = useRef(0);
  const comboRef      = useRef(1);
  const scoreRef      = useRef(0);
  const cpuScoreRef   = useRef(0);
  const rushModeRef   = useRef(false);
  const targetTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const respawnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cpuHitTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetExpiredRef = useRef(false);  // grace flag — target lifetime ended but still tappable
  const targetClaimedRef = useRef(false);  // prevents the same target counting twice
  const timerLeft     = useRef(SESSION_SECS);
  const sessionDiff   = useRef<Difficulty>('easy');
  const particleId    = useRef(0);
  const pausedRef     = useRef(false);
  const endedRef      = useRef(false);

  function uid() { return String(particleId.current++); }
  function clearTargetTimer()  { if (targetTimer.current)  { clearTimeout(targetTimer.current);  targetTimer.current  = null; } }
  function clearGraceTimer()   { if (graceTimer.current)   { clearTimeout(graceTimer.current);   graceTimer.current   = null; } targetExpiredRef.current = false; }
  function clearRespawnTimer() { if (respawnTimer.current) { clearTimeout(respawnTimer.current); respawnTimer.current = null; } }
  function clearCpuTimer()     { if (cpuHitTimer.current)  { clearTimeout(cpuHitTimer.current);  cpuHitTimer.current  = null; } }
  function clearAllGameTimers() { clearTargetTimer(); clearGraceTimer(); clearRespawnTimer(); clearCpuTimer(); }

  function getComboForStreak(s: number): number {
    if (s >= 9) return 4;
    if (s >= 6) return 3;
    if (s >= 3) return 2;
    return 1;
  }

  function showComboPopup(c: number) {
    if (c < 2) return;
    const labels = ['', '', '⚡ x2 Combo!', '🔥 x3 Combo!', '💥 x4 ULTRA!'];
    setComboLabel(labels[Math.min(c, 4)] ?? `x${c}`);
    // Pure timing — no spring → no oscillation when combos chain quickly.
    comboPopScale.value   = 1;
    comboPopOpacity.value = withTiming(1, { duration: 120 }, () => {
      comboPopOpacity.value = withTiming(0, { duration: 480 });
    });
  }

  // ─── CPU random scoring ───────────────────────────────────────────────────
  function scheduleCpuNext() {
    if (endedRef.current || pausedRef.current) return;
    const { minMs, maxMs } = CPU_INTERVAL[sessionDiff.current];
    const delay = minMs + Math.random() * (maxMs - minMs);

    cpuHitTimer.current = setTimeout(() => {
      if (endedRef.current || pausedRef.current) return;
      cpuScoreRef.current += DIFF[sessionDiff.current].pts;
      setCpuScore(cpuScoreRef.current);
      scheduleCpuNext();
    }, delay);
  }

  // ─── Target spawning ──────────────────────────────────────────────────────
  function spawnTarget() {
    if (endedRef.current || pausedRef.current) return;
    const cfg  = DIFF[sessionDiff.current];
    const half = cfg.size / 2;
    const pad  = 14;
    const x    = half + pad + Math.random() * (ARENA_W - half * 2 - pad * 2);
    const y    = TOPBAR_H + half + pad + Math.random() * (ARENA_H - TOPBAR_H - half * 2 - pad * 2);
    const color = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];
    const shape = TARGET_SHAPES[Math.floor(Math.random() * TARGET_SHAPES.length)];

    // Cancel any pending miss/respawn from a previous target — this spawn supersedes.
    clearTargetTimer();
    clearGraceTimer();
    clearRespawnTimer();
    targetClaimedRef.current = false;   // new target → fresh claim slot

    setTargetPos({ x, y });
    setTargetColor(color);
    setTargetShape(shape);
    setTargetDying(false);
    setTargetVisible(true);

    // Effective speed: time ramp × rush boost
    // Floor raised to 380 ms — 200 ms was below human reaction time +
    // finger-travel time, so end-game elite was unplayable. 380 ms is fast
    // but actually beatable.
    const timeMult   = getTimeMult(timerLeft.current);
    const rushMult   = rushModeRef.current ? 0.62 : 1.0;
    const effectiveMs = Math.max(380, Math.round(cfg.speedMs * timeMult * rushMult));

    targetTimer.current = setTimeout(() => {
      // Lifetime ended — open a grace window where the target stays tappable
      // so taps already in flight (finger-on-screen at high speed) still count.
      targetExpiredRef.current = true;
      graceTimer.current = setTimeout(() => {
        // Grace expired with no tap → confirmed miss
        if (!targetExpiredRef.current) return;
        targetExpiredRef.current = false;

        const hadStreak = streakRef.current > 0;
        // Miss feedback only when a real streak breaks. No per-cycle haptics
        // or screen flashes during elite — those WERE the "vibrating again
        // and again" feeling.
        if (hadStreak) {
          setFloats(f => [...f, { id: uid(), x, y, text: '✗ MISS', isHit: false }]);
        }
        setTargetDying(true);
        setTargetVisible(false);

        // Reset streak + combo
        streakRef.current = 0;
        comboRef.current  = 1;
        setStreak(0);
        setCombo(1);
        setStreakGlow(false);

        if (rushModeRef.current) {
          rushModeRef.current = false;
          setRushMode(false);
        }

        // Red border flash — only when a real streak broke
        if (hadStreak) {
          setMissFlash(true);
          setTimeout(() => setMissFlash(false), 320);
        }

        clearRespawnTimer();
        respawnTimer.current = setTimeout(() => {
          respawnTimer.current = null;
          setTargetDying(false);
          spawnTarget();   // guarded internally
        }, 140);
      }, 280);  // 280ms grace window absorbs finger-down lag at high speed
    }, effectiveMs);
  }

  // ─── Tap handler ─────────────────────────────────────────────────────────
  const onTap = useCallback(() => {
    if (endedRef.current || pausedRef.current) return;
    if (targetClaimedRef.current) return;       // this target already scored
    targetClaimedRef.current = true;
    clearTargetTimer();
    clearGraceTimer();   // claim any in-flight grace tap → count as hit

    const cfg        = DIFF[sessionDiff.current];
    const newStreak  = streakRef.current + 1;
    const newCombo   = getComboForStreak(newStreak);
    const earned     = cfg.pts * newCombo;
    const newScore   = scoreRef.current + earned;
    const newBest    = Math.max(bestStreakRef.current, newStreak);

    hitsRef.current       = hitsRef.current + 1;
    streakRef.current     = newStreak;
    comboRef.current      = newCombo;
    scoreRef.current      = newScore;
    bestStreakRef.current  = newBest;

    setHits(hitsRef.current);
    setStreak(newStreak);
    setCombo(newCombo);
    setScore(newScore);
    setBestStreak(newBest);
    setStreakGlow(newStreak >= 3);

    // Activate rush mode at streak 3 — visual only, no haptic
    if (newStreak >= 3 && !rushModeRef.current) {
      rushModeRef.current = true;
      setRushMode(true);
    }

    // Particles
    const { x, y } = targetPos;
    setRipples(r => [...r, { id: uid(), x, y, color: targetColor }]);

    const label =
      newCombo >= 4 ? `💥 ×4  +${earned}` :
      newCombo >= 3 ? `🔥 ×3  +${earned}` :
      newCombo >= 2 ? `⚡ ×2  +${earned}` :
      `+${earned}`;
    setFloats(f => [...f, { id: uid(), x, y, text: label, isHit: true }]);

    showComboPopup(newCombo);

    // Haptics removed from per-tap path — was firing every 400–500 ms in
    // elite mode and reading as "vibrating again and again". Rush activation
    // above is the only per-event haptic that survives.

    onScore?.(newScore, 0);
    // No 75ms gap — spawn the next target in the same handler so there's
    // never a dead window where taps land on empty arena. spawnTarget
    // resets targetClaimedRef and overwrites pos/color in one React batch.
    spawnTarget();
  }, [gameActive, targetPos, targetColor, onScore]);

  // ─── Session lifecycle ────────────────────────────────────────────────────
  function startSession() {
    if (gameActive) return;
    hitsRef.current       = 0;
    streakRef.current     = 0;
    bestStreakRef.current  = 0;
    comboRef.current      = 1;
    scoreRef.current      = 0;
    cpuScoreRef.current   = 0;
    timerLeft.current     = SESSION_SECS;
    sessionDiff.current   = diff;
    pausedRef.current     = false;
    endedRef.current      = false;
    rushModeRef.current   = false;
    targetClaimedRef.current = false;
    targetExpiredRef.current = false;

    setHits(0); setStreak(0); setBestStreak(0); setCombo(1);
    setScore(0); setCpuScore(0);
    setTimer(SESSION_SECS); setSessionDone(false);
    setPaused(false); setRushMode(false); setMissFlash(false); setStreakGlow(false);
    setTargetDying(false); setRipples([]); setFloats([]);
    setTipIdx(t => (t + 1) % EYE_TIPS.length);

    timerBarAnim.value = 1;
    timerBarAnim.value = withTiming(0, { duration: SESSION_SECS * 1000 });

    setGameActive(true);

    sessionTimer.current = setInterval(() => {
      timerLeft.current -= 1;
      setTimer(timerLeft.current);
      if (timerLeft.current <= 0) endSession();
    }, 1000);

    setTimeout(() => {
      if (!endedRef.current) { spawnTarget(); scheduleCpuNext(); }
    }, 300);
  }

  function pauseSession() {
    if (!gameActive || pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    clearAllGameTimers();
    if (sessionTimer.current) { clearInterval(sessionTimer.current); sessionTimer.current = null; }
    setTargetVisible(false);
    setTargetDying(false);
    cancelAnimation(timerBarAnim);
  }

  function resumeSession() {
    if (!gameActive || !pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);

    timerBarAnim.value = withTiming(0, { duration: timerLeft.current * 1000 });

    sessionTimer.current = setInterval(() => {
      timerLeft.current -= 1;
      setTimer(timerLeft.current);
      if (timerLeft.current <= 0) endSession();
    }, 1000);

    spawnTarget();
    scheduleCpuNext();
  }

  function endSession() {
    if (endedRef.current) return;
    endedRef.current  = true;
    pausedRef.current = false;

    setPaused(false); setGameActive(false); setRushMode(false); setStreakGlow(false);
    clearAllGameTimers();
    if (sessionTimer.current) { clearInterval(sessionTimer.current); sessionTimer.current = null; }
    setTargetVisible(false); setTargetDying(false); setSessionDone(true);
    cancelAnimation(timerBarAnim);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveToFirestore();

    const youWon = scoreRef.current > cpuScoreRef.current;
    const tied   = scoreRef.current === cpuScoreRef.current;
    const gap    = Math.abs(scoreRef.current - cpuScoreRef.current);

    onGameEnd?.({
      headline: youWon ? `${scoreRef.current} PTS 🏆` : `${scoreRef.current} PTS`,
      subline: youWon
        ? `Beat CPU by ${gap} pts — ${getMotivation(scoreRef.current)}`
        : tied
        ? `Tied with CPU! — ${getMotivation(scoreRef.current)}`
        : `CPU won by ${gap} pts — ${getMotivation(scoreRef.current)}`,
      rating:  scoreRef.current >= 50 ? 3 : scoreRef.current >= 20 ? 2 : 1,
      stats: [
        { label: 'Your Score',  value: `${scoreRef.current}`    },
        { label: 'CPU Score',   value: `${cpuScoreRef.current}` },
        { label: 'Targets Hit', value: `${hitsRef.current}`     },
        { label: 'Best Streak', value: `${bestStreakRef.current}` },
      ],
      survived: true,
    });
  }

  function saveToFirestore() {
    try {
      void addDoc(collection(db, 'eyeGameScores'), {
        userId:     user?.uid ?? 'guest',
        game:       'saccade_sniper',
        score:      scoreRef.current,
        difficulty: sessionDiff.current,
        hitsCount:  hitsRef.current,
        bestStreak: bestStreakRef.current,
        timestamp:  new Date(),
      });
    } catch { /* silent offline */ }
  }

  useEffect(() => { if (!running && gameActive) endSession(); }, [running]);
  useEffect(() => {
    return () => {
      clearAllGameTimers();
      if (sessionTimer.current) clearInterval(sessionTimer.current);
    };
  }, []);

  // ─── Animated styles ──────────────────────────────────────────────────────
  const timerBarStyle = useAnimatedStyle(() => {
    const v = timerBarAnim.value;
    return {
      width: `${Math.round(v * 100)}%` as `${number}%`,
      backgroundColor: v < 0.25 ? C.red : v < 0.5 ? C.amber : C.purple,
    };
  });
  const comboPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboPopScale.value }],
    opacity:   comboPopOpacity.value,
  }));

  const lowTime     = gameActive && timer <= 15;
  const cornerColor = rushMode ? C.orange : streakGlow ? C.gold : 'rgba(127,119,221,0.25)';
  const arenaStyle  = [
    s.arena, { width: ARENA_W, height: ARENA_H } as const,
    missFlash  && s.arenaFlash,
    rushMode   && !missFlash && s.arenaRush,
    !rushMode  && streakGlow && !missFlash && s.arenaGold,
    lowTime    && !rushMode && !missFlash && !streakGlow && s.arenaLow,
  ];

  return (
    <View style={s.wrap}>

      {/* Eye tip */}
      <View style={s.tipBar}>
        <Ionicons name="eye-outline" size={13} color={C.muted} />
        <Text style={s.tipText} numberOfLines={1}>{EYE_TIPS[tipIdx]}</Text>
      </View>

      {/* Stats row */}
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
            combo >= 4 ? { color: C.gold }   :
            combo >= 3 ? { color: C.orange }  :
            combo >= 2 ? { color: C.amber }   : null,
          ]}>
            {combo > 1 ? `×${combo}` : streak >= 5 ? `${streak}⚡` : streak}
          </Text>
          <Text style={s.statLbl}>{combo > 1 ? 'Combo' : 'Streak'}</Text>
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
            {diff === d && <Text style={s.diffSub}>{DIFF[d].pts}pt · {DIFF[d].speedMs}ms</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* VS bar */}
      {(gameActive || sessionDone) && (
        <VsBar playerScore={score} cpuScore={cpuScore} isActive={gameActive} />
      )}

      {/* Arena */}
      <View style={arenaStyle}>
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

        {/* Targets */}
        {targetVisible && (
          <Target
            x={targetPos.x} y={targetPos.y}
            size={DIFF[sessionDiff.current].size}
            color={targetColor}
            shape={targetShape}
            onPress={onTap}
          />
        )}
        {targetDying && (
          <DyingTarget
            x={targetPos.x} y={targetPos.y}
            size={DIFF[sessionDiff.current].size}
            color={targetColor}
            shape={targetShape}
            onDone={() => setTargetDying(false)}
          />
        )}

        {/* Ripples + floats */}
        {ripples.map(r => (
          <Ripple key={r.id} {...r} size={DIFF[sessionDiff.current].size}
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
            <Ionicons name="locate-outline" size={52} color={C.purpleLight} />
            <Text style={s.idleTitle}>Saccade Sniper</Text>
            <Text style={s.idleSub}>
              Tap targets before they vanish.{'\n'}
              <Text style={{ color: C.orange, fontWeight: '800' }}>5+ streak</Text> = RUSH MODE ⚡
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

      {/* Start / replay button */}
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
    borderRadius: 22, backgroundColor: C.arenaBg,
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
