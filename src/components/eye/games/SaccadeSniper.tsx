import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { FONTS, PILLAR_COLORS, RADIUS } from "@/constants/designSystem";
import { useAuth } from "@/context/AuthContext";
import { useGameSounds } from "@/hooks/useGameSounds";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  getFirestore,
} from "@react-native-firebase/firestore";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  DimensionValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { type GameEndStats } from "./GameOverScreen";

const db = getFirestore();

interface Props {
  running: boolean;
  onScore?: (score: number, bestMs: number) => void;
  onGameEnd?: (stats: GameEndStats) => void;
  /** All-time fastest reaction (ms) for this game, from Firestore — shown as
   * the "Personal Best" stat. Falls back to this session's best if unset. */
  personalBestMs?: number | null;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#071216",
  arenaBg: "#06121a",
  card: "rgba(255,255,255,0.045)",
  // Eye-pillar accent (was the old teal-cyan '#22d3ee' — a different color
  // from PILLAR_COLORS.eye used everywhere else in the Eye tab).
  purple: PILLAR_COLORS.eye,
  purpleLight: "#5eead4",
  green: "#6ee7b7",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.6)",
  dim: "rgba(255,255,255,0.38)",
  amber: "#f59e0b",
  red: "#e24b4a",
  gold: "#ffd700",
  orange: "#f97316",
};

const TARGET_COLORS = [
  "#06b6d4",
  "#22d3ee",
  "#6ee7b7",
  "#f59e0b",
  "#f472b6",
  "#38bdf8",
];

const EYE_TIPS = [
  "Blinking resets tear film — blink between targets.",
  "Performance score only — not an eye-health measure.",
  "After this session, look 20 feet away for 20 seconds.",
  "Pause if you notice blur, pain, dizziness, or double vision.",
  "Regular screen breaks matter more than a high game score.",
  "Accuracy matters more than speed — take the extra beat.",
  "Relax your shoulders and jaw during training.",
];

// ─── Difficulty ───────────────────────────────────────────────────────────────
type Difficulty = "easy" | "sharp" | "elite";
const DIFF: Record<
  Difficulty,
  {
    dotColor: string;
    size: number;
    speedMs: number;
    pts: number;
    label: string;
  }
> = {
  easy: {
    dotColor: "#6ee7b7",
    size: 80,
    speedMs: 1000,
    pts: 1,
    label: "Casual",
  },
  sharp: {
    dotColor: "#f59e0b",
    size: 60,
    speedMs: 600,
    pts: 2,
    label: "Sharp",
  },
  elite: {
    dotColor: "#e24b4a",
    size: 48,
    speedMs: 380,
    pts: 3,
    label: "Elite",
  },
};

const SESSION_SECS = 60;
const ARENA_H = 420;
const TOPBAR_H = 5;
const { width: SW } = Dimensions.get("window");
const ARENA_W = SW - 32;

// Speed ramps from the start to increase game difficulty.
function getTimeMult(t: number): number {
  const e = SESSION_SECS - t;
  if (e < 10) return 1.0 - e * 0.018; // 1.0 → 0.82 (fast first 10s)
  if (e < 30) return 0.82 - (e - 10) * 0.03; // 0.82 → 0.22 (intense ramp 10–30s)
  return Math.max(0.18, 0.22 - (e - 30) * 0.003); // 0.22 → 0.18 (peak)
}

function getMotivation(s: number): string {
  if (s >= 80) return "Incredible game score! Now take a distant-view break.";
  if (s >= 50) return "Excellent game coordination.";
  if (s >= 25) return "Sharp reflexes and a strong game score.";
  if (s >= 10) return "Good start. Accuracy matters more than speed.";
  return "Keep it comfortable, and stop if your eyes feel strained.";
}

// ─── Particle types ───────────────────────────────────────────────────────────
type ParticleId = string;
interface RippleData {
  id: ParticleId;
  x: number;
  y: number;
  color: string;
}
interface FloatData {
  id: ParticleId;
  x: number;
  y: number;
  text: string;
  isHit: boolean;
}

// ─── Ripple ───────────────────────────────────────────────────────────────────
function Ripple({
  x,
  y,
  color,
  size,
  onDone,
}: RippleData & { size: number; onDone: () => void }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withTiming(3.0, { duration: 480 });
    opacity.value = withTiming(0, { duration: 480 }, (f) => {
      if (f) runOnJS(onDone)();
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          left: x - size / 2,
          top: y - size / 2,
        },
        style,
      ]}
    />
  );
}

// ─── Float text ───────────────────────────────────────────────────────────────
function FloatText({
  x,
  y,
  text,
  isHit,
  onDone,
}: FloatData & { onDone: () => void }) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    ty.value = withTiming(-60, { duration: 800 });
    opacity.value = withTiming(0, { duration: 800 }, (f) => {
      if (f) runOnJS(onDone)();
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x - 48,
          top: y - 22,
          width: 96,
          textAlign: "center",
          fontSize: 17,
          fontWeight: "900",
          color: isHit ? C.green : C.red,
          textShadowColor: isHit
            ? "rgba(110,231,183,0.8)"
            : "rgba(226,75,74,0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        },
        style,
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ─── Target shapes ───────────────────────────────────────────────────────────
const TARGET_SHAPES = ["star", "circle", "diamond", "triangle"] as const;
type TargetShape = (typeof TARGET_SHAPES)[number];

function getShapePath(shape: TargetShape, size: number): string {
  switch (shape) {
    case "star":
      // 5-point star
      return "M25 2 L29 21 L48 25 L29 29 L25 48 L21 29 L2 25 L21 21 Z";
    case "circle":
      return "M9,25 A16,16 0 1,1 41,25 A16,16 0 1,1 9,25 Z";
    case "diamond":
      return "M25 2 L48 25 L25 48 L2 25 Z";
    case "triangle":
      return "M25 4 L47 43 L3 43 Z";
  }
} // ─── Target ───────────────────────────────────────────────────────────────────
function Target({
  x,
  y,
  size,
  color,
  shape,
  onPress,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: TargetShape;
  onPress: () => void;
}) {
  // Quick scale+fade in (100ms) — subtle "alive" feel without adding
  // perceptible delay before it's tappable; hit area is live from frame 1
  // regardless of the animation (opacity/scale are purely visual).
  const slop = Math.max(22, Math.round(40 - size * 0.35));

  return (
    <Animated.View
      entering={ZoomIn.duration(100)}
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: x - size / 2,
        top: y - size / 2,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 14,
        shadowOpacity: 0.9,
        elevation: 10,
      }}
    >
      <TouchableOpacity
        onPressIn={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 50 50">
          <Path d={getShapePath(shape, size)} fill={color} />
        </Svg>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Dying target ─────────────────────────────────────────────────────────────
function DyingTarget({
  x,
  y,
  size,
  color,
  shape,
  onDone,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: TargetShape;
  onDone: () => void;
}) {
  const opacity = useSharedValue(0.5);
  const scale = useSharedValue(1);
  useEffect(() => {
    // Shorter + smaller — was a 240ms 1.6x bloom which read as a "shake"
    // when elite cycles overlap with new spawns.
    opacity.value = withTiming(0, { duration: 160 }, (f) => {
      if (f) runOnJS(onDone)();
    });
    scale.value = withTiming(1.25, { duration: 160 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          left: x - size / 2,
          top: y - size / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 50 50">
        <Path
          d={getShapePath(shape, size)}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Arena corners ────────────────────────────────────────────────────────────
function ArenaCorners({ color }: { color: string }) {
  const L = 14;
  const corners = [
    { top: 12, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
    { top: 12, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5 },
    { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
    { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  ] as const;
  return (
    <>
      {corners.map((c, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            { position: "absolute", width: L, height: L, borderColor: color },
            c,
          ]}
        />
      ))}
    </>
  );
}

// ─── Idle ambient glow ────────────────────────────────────────────────────────
// Keeps the canvas feeling alive before the session starts — a slow breathing
// glow, nothing distracting. Mirrors the same calm pulse pattern used for the
// Eye Reset hero elsewhere in the app.
function IdleAmbientGlow() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600 }),
        withTiming(0, { duration: 2600 }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.08 + pulse.value * 0.1,
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 220,
          height: 220,
          marginTop: -110,
          marginLeft: -110,
          borderRadius: 110,
          backgroundColor: C.purple,
        },
        style,
      ]}
    />
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
          style={[
            dot.base,
            i < Math.min(streak, 5) && {
              backgroundColor: activeColor,
              borderColor: activeColor,
              shadowColor: activeColor,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 6,
              shadowOpacity: 0.85,
            },
          ]}
        />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  base: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "#2e2660",
  },
});

// ─── Performance bar ──────────────────────────────────────────────────────────
// Wellness framing, not a competitive scoreboard: real accuracy + combo state
// + how far through the session you are. No CPU, no win/lose.
function PerformanceBar({
  accuracy,
  combo,
  bestCombo,
  sessionPct,
  personalBestMs,
  dimmed,
}: {
  accuracy: number | null;
  combo: number;
  bestCombo: number;
  sessionPct: number;
  personalBestMs?: number | null;
  dimmed?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      style={[{ alignSelf: "stretch" }, dimmed ? { opacity: 0.7 } : null]}
    >
      <GlassCard simple noPadding style={perf.card}>
        {personalBestMs != null && (
          <View style={perf.pbRow}>
            <Ionicons name="trophy" size={11} color={C.gold} />
            <Text style={perf.pbText}>PB {personalBestMs}ms</Text>
          </View>
        )}
        <View style={perf.row}>
          <View style={perf.stat}>
            <Animated.Text
              key={`acc-${accuracy}`}
              entering={FadeIn.duration(220)}
              style={perf.val}
            >
              {accuracy === null ? "—" : `${accuracy}%`}
            </Animated.Text>
            <Text style={perf.lbl}>Accuracy</Text>
          </View>
          <View style={perf.divider} />
          <View style={perf.stat}>
            <Animated.Text
              key={`combo-${combo}`}
              entering={FadeIn.duration(220)}
              style={perf.val}
            >
              {combo > 1 ? `×${combo}` : "—"}
            </Animated.Text>
            <Text style={perf.lbl}>Combo</Text>
          </View>
          <View style={perf.divider} />
          <View style={perf.stat}>
            <Animated.Text
              key={`best-${bestCombo}`}
              entering={FadeIn.duration(220)}
              style={perf.val}
            >
              {bestCombo > 1 ? `×${bestCombo}` : "—"}
            </Animated.Text>
            <Text style={perf.lbl}>Best Combo</Text>
          </View>
        </View>
        <View style={perf.track}>
          <Animated.View
            layout={LinearTransition.duration(300)}
            style={[
              perf.fill,
              { width: `${Math.round(sessionPct)}%` as DimensionValue },
            ]}
          />
        </View>
        <Text style={perf.progressLabel}>Session Progress</Text>
      </GlassCard>
    </Animated.View>
  );
}
const perf = StyleSheet.create({
  pbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "center",
    marginBottom: 4,
  },
  pbText: { fontSize: 10.5, fontWeight: "800", color: C.gold },
  card: {
    alignSelf: "stretch",
    minHeight: 70,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 7,
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  divider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.06)" },
  val: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "800",
    color: C.purpleLight,
  },
  lbl: { fontSize: 10, color: C.muted, fontWeight: "600", letterSpacing: 0.5 },
  track: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  fill: { height: 3, backgroundColor: C.purple, borderRadius: 1.5 },
  progressLabel: {
    fontSize: 9.5,
    color: C.dim,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
export function SaccadeSniper({
  running,
  onScore,
  onGameEnd,
  personalBestMs,
}: Props) {
  const { user } = useAuth();
  const { playHit, playWrong, playLevelUp } = useGameSounds();

  const [diff, setDiff] = useState<Difficulty>("easy");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [combo, setCombo] = useState(1);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(SESSION_SECS);
  const [tipIdx, setTipIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [rushMode, setRushMode] = useState(false);
  const [missFlash, setMissFlash] = useState(false);
  const [streakGlow, setStreakGlow] = useState(false);

  // Target state
  const [targetVisible, setTargetVisible] = useState(false);
  const [targetDying, setTargetDying] = useState(false);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [targetColor, setTargetColor] = useState(TARGET_COLORS[0]);
  const [targetShape, setTargetShape] = useState<TargetShape>("star");

  // Particles
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [floats, setFloats] = useState<FloatData[]>([]);

  // Combo popup
  const comboPopScale = useSharedValue(0);
  const comboPopOpacity = useSharedValue(0);
  const [comboLabel, setComboLabel] = useState("");

  // Timer bar
  const timerBarAnim = useSharedValue(1);

  // Countdown pulse
  const countdownScale = useSharedValue(1);

  // Pause card: scale 0.94 → 1 on open
  const pauseCardScale = useSharedValue(0.94);
  useEffect(() => {
    if (paused) {
      pauseCardScale.value = 0.94;
      pauseCardScale.value = withTiming(1, { duration: 220 });
    } else {
      pauseCardScale.value = 0.94;
    }
  }, [paused, pauseCardScale]);

  // Refs
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const comboRef = useRef(1);
  const bestComboRef = useRef(1);
  const scoreRef = useRef(0);
  const rushModeRef = useRef(false);
  const targetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetSpawnMs = useRef(0); // Date.now() when the current target appeared
  const bestReactionMs = useRef(Infinity); // fastest genuine tap-to-hit time this session
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const respawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetExpiredRef = useRef(false); // grace flag — target lifetime ended but still tappable
  const targetClaimedRef = useRef(false); // prevents the same target counting twice
  const timerLeft = useRef(SESSION_SECS);
  const sessionDiff = useRef<Difficulty>("easy");
  const particleId = useRef(0);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);

  function uid() {
    return String(particleId.current++);
  }
  function clearTargetTimer() {
    if (targetTimer.current) {
      clearTimeout(targetTimer.current);
      targetTimer.current = null;
    }
  }
  function clearGraceTimer() {
    if (graceTimer.current) {
      clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
    targetExpiredRef.current = false;
  }
  function clearRespawnTimer() {
    if (respawnTimer.current) {
      clearTimeout(respawnTimer.current);
      respawnTimer.current = null;
    }
  }
  function clearAllGameTimers() {
    clearTargetTimer();
    clearGraceTimer();
    clearRespawnTimer();
  }

  function getComboForStreak(s: number): number {
    if (s >= 9) return 4;
    if (s >= 6) return 3;
    if (s >= 3) return 2;
    return 1;
  }

  function showComboPopup(c: number) {
    if (c < 2) return;
    const labels = ["", "", "⚡ x2 Combo!", "🔥 x3 Combo!", "💥 x4 ULTRA!"];
    setComboLabel(labels[Math.min(c, 4)] ?? `x${c}`);
    // Pure timing — no spring → no oscillation when combos chain quickly.
    comboPopScale.value = 1;
    comboPopOpacity.value = withTiming(1, { duration: 120 }, () => {
      comboPopOpacity.value = withTiming(0, { duration: 480 });
    });
  }

  // ─── Target spawning ──────────────────────────────────────────────────────
  function spawnTarget() {
    if (endedRef.current || pausedRef.current) return;
    const cfg = DIFF[sessionDiff.current];
    const half = cfg.size / 2;
    const pad = 14;
    const x = half + pad + Math.random() * (ARENA_W - half * 2 - pad * 2);
    const y =
      TOPBAR_H +
      half +
      pad +
      Math.random() * (ARENA_H - TOPBAR_H - half * 2 - pad * 2);
    const color =
      TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];
    const shape =
      TARGET_SHAPES[Math.floor(Math.random() * TARGET_SHAPES.length)];

    // Cancel any pending miss/respawn from a previous target — this spawn supersedes.
    clearTargetTimer();
    clearGraceTimer();
    clearRespawnTimer();
    targetClaimedRef.current = false; // new target → fresh claim slot

    setTargetPos({ x, y });
    setTargetColor(color);
    setTargetShape(shape);
    setTargetDying(false);
    setTargetVisible(true);
    targetSpawnMs.current = Date.now();

    // Effective speed: time ramp × rush boost
    // Floor raised to 380 ms — 200 ms was below human reaction time +
    // finger-travel time, so end-game elite was unplayable. 380 ms is fast
    // but actually beatable.
    const timeMult = getTimeMult(timerLeft.current);
    const rushMult = rushModeRef.current ? 0.62 : 1.0;
    const effectiveMs = Math.max(
      380,
      Math.round(cfg.speedMs * timeMult * rushMult),
    );

    targetTimer.current = setTimeout(() => {
      // Lifetime ended — open a grace window where the target stays tappable
      // so taps already in flight (finger-on-screen at high speed) still count.
      targetExpiredRef.current = true;
      graceTimer.current = setTimeout(() => {
        // Grace expired with no tap → confirmed miss
        if (!targetExpiredRef.current) return;
        targetExpiredRef.current = false;

        missesRef.current = missesRef.current + 1;
        setMisses(missesRef.current);

        const hadStreak = streakRef.current > 0;
        // Miss feedback only when a real streak breaks. No per-cycle haptics
        // or screen flashes during elite — those WERE the "vibrating again
        // and again" feeling.
        if (hadStreak) {
          setFloats((f) => [
            ...f,
            { id: uid(), x, y, text: "✗ MISS", isHit: false },
          ]);
          playWrong();
        }
        setTargetDying(true);
        setTargetVisible(false);

        // Reset streak + combo
        streakRef.current = 0;
        comboRef.current = 1;
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
          spawnTarget(); // guarded internally
        }, 140);
      }, 280); // 280ms grace window absorbs finger-down lag at high speed
    }, effectiveMs);
  }

  // ─── Tap handler ─────────────────────────────────────────────────────────
  const onTap = useCallback(() => {
    if (endedRef.current || pausedRef.current) return;
    if (targetClaimedRef.current) return; // this target already scored
    targetClaimedRef.current = true;
    clearTargetTimer();
    clearGraceTimer(); // claim any in-flight grace tap → count as hit

    const reactionMs = Date.now() - targetSpawnMs.current;
    if (reactionMs > 0 && reactionMs < bestReactionMs.current)
      bestReactionMs.current = reactionMs;

    const cfg = DIFF[sessionDiff.current];
    const prevCombo = comboRef.current;
    const newStreak = streakRef.current + 1;
    const newCombo = getComboForStreak(newStreak);
    const earned = cfg.pts * newCombo;
    const newScore = scoreRef.current + earned;
    const newBest = Math.max(bestStreakRef.current, newStreak);

    hitsRef.current = hitsRef.current + 1;
    streakRef.current = newStreak;
    comboRef.current = newCombo;
    scoreRef.current = newScore;
    bestStreakRef.current = newBest;
    if (newCombo > bestComboRef.current) bestComboRef.current = newCombo;

    playHit();
    // Tiered haptic only on a combo step-up — not per tap — so Elite's fast
    // cadence doesn't feel like constant buzzing (that was tried before and
    // reverted).
    if (newCombo > prevCombo) {
      if (newCombo >= 4) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        playLevelUp();
      } else if (newCombo === 3)
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (newCombo === 2)
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setHits(hitsRef.current);
    setStreak(newStreak);
    setCombo(newCombo);
    setScore(newScore);
    setBestStreak(newBest);
    setStreakGlow(newStreak >= 3);

    // Activate rush mode at streak 3 — one Medium pulse, not per-tap
    if (newStreak >= 3 && !rushModeRef.current) {
      rushModeRef.current = true;
      setRushMode(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Particles
    const { x, y } = targetPos;
    setRipples((r) => [...r, { id: uid(), x, y, color: targetColor }]);

    const label =
      newCombo >= 4
        ? `💥 ×4  +${earned}`
        : newCombo >= 3
          ? `🔥 ×3  +${earned}`
          : newCombo >= 2
            ? `⚡ ×2  +${earned}`
            : `+${earned}`;
    setFloats((f) => [...f, { id: uid(), x, y, text: label, isHit: true }]);

    showComboPopup(newCombo);

    onScore?.(
      newScore,
      bestReactionMs.current === Infinity ? 0 : bestReactionMs.current,
    );
    // No 75ms gap — spawn the next target in the same handler so there's
    // never a dead window where taps land on empty arena. spawnTarget
    // resets targetClaimedRef and overwrites pos/color in one React batch.
    spawnTarget();
  }, [gameActive, targetPos, targetColor, onScore]);

  // ─── Countdown ─────────────────────────────────────────────────────────────
  function beginCountdown() {
    if (gameActive || countdown !== null) return;
    const step = (n: number) => {
      if (n < 0) {
        setCountdown(null);
        startSession();
        return;
      }
      setCountdown(n); // 3, 2, 1, 0 (renders as "GO")
      countdownScale.value = 1.4;
      countdownScale.value = withTiming(1, { duration: 220 });
      void Haptics.impactAsync(
        n > 0
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Heavy,
      );
      countdownTimer.current = setTimeout(() => step(n - 1), n > 0 ? 600 : 450);
    };
    step(3);
  }

  // ─── Session lifecycle ────────────────────────────────────────────────────
  function startSession() {
    if (gameActive) return;
    hitsRef.current = 0;
    missesRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    comboRef.current = 1;
    bestComboRef.current = 1;
    scoreRef.current = 0;
    timerLeft.current = SESSION_SECS;
    sessionDiff.current = diff;
    pausedRef.current = false;
    endedRef.current = false;
    rushModeRef.current = false;
    targetClaimedRef.current = false;
    targetExpiredRef.current = false;
    bestReactionMs.current = Infinity;

    setHits(0);
    setMisses(0);
    setStreak(0);
    setBestStreak(0);
    setCombo(1);
    setScore(0);
    setTimer(SESSION_SECS);
    setSessionDone(false);
    setPaused(false);
    setRushMode(false);
    setMissFlash(false);
    setStreakGlow(false);
    setTargetDying(false);
    setRipples([]);
    setFloats([]);
    setTipIdx((t) => (t + 1) % EYE_TIPS.length);

    timerBarAnim.value = 1;
    timerBarAnim.value = withTiming(0, { duration: SESSION_SECS * 1000 });

    setGameActive(true);

    sessionTimer.current = setInterval(() => {
      timerLeft.current -= 1;
      setTimer(timerLeft.current);
      if (timerLeft.current <= 0) endSession();
    }, 1000);

    setTimeout(() => {
      if (!endedRef.current) spawnTarget();
    }, 300);
  }

  function pauseSession() {
    if (!gameActive || pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    clearAllGameTimers();
    if (sessionTimer.current) {
      clearInterval(sessionTimer.current);
      sessionTimer.current = null;
    }
    // Freeze the frame instead of hiding it — the last visible target stays
    // on screen (motionless; its timers are cleared, so it can't expire or
    // respawn), same as pressing pause in any real game.
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
  }

  // "Restart Exercise" from the pause menu — a full fresh session, not just
  // an unpause. startSession() no-ops while gameActive is still true, so we
  // clear it and let the next tick pick up the reset.
  function restartSession() {
    void Haptics.selectionAsync();
    pausedRef.current = false;
    clearAllGameTimers();
    if (sessionTimer.current) {
      clearInterval(sessionTimer.current);
      sessionTimer.current = null;
    }
    setPaused(false);
    setGameActive(false);
    setTargetVisible(false);
    setTimeout(() => startSession(), 50);
  }

  function endSession() {
    if (endedRef.current) return;
    endedRef.current = true;
    pausedRef.current = false;

    setPaused(false);
    setGameActive(false);
    setRushMode(false);
    setStreakGlow(false);
    clearAllGameTimers();
    if (sessionTimer.current) {
      clearInterval(sessionTimer.current);
      sessionTimer.current = null;
    }
    setTargetVisible(false);
    setTargetDying(false);
    setSessionDone(true);
    cancelAnimation(timerBarAnim);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveToFirestore();

    const fastestTap =
      bestReactionMs.current === Infinity
        ? "—"
        : `${Math.round(bestReactionMs.current)}ms`;
    const personalBest =
      personalBestMs != null ? `${personalBestMs}ms` : fastestTap;
    const totalSeen = hitsRef.current + missesRef.current;
    const accuracyPct =
      totalSeen > 0 ? Math.round((hitsRef.current / totalSeen) * 100) : null;

    onGameEnd?.({
      headline: `${scoreRef.current} Points`,
      subline: getMotivation(scoreRef.current),
      rating: scoreRef.current >= 50 ? 3 : scoreRef.current >= 20 ? 2 : 1,
      stats: [
        { label: "Your Score", value: `${scoreRef.current}` },
        {
          label: "Accuracy",
          value: accuracyPct === null ? "—" : `${accuracyPct}%`,
        },
        { label: "Targets Hit", value: `${hitsRef.current}` },
        {
          label: "Best Combo",
          value: bestComboRef.current > 1 ? `×${bestComboRef.current}` : "—",
        },
        { label: "Fastest Tap", value: fastestTap },
        { label: "Personal Best", value: personalBest },
      ],
      survived: true,
    });
  }

  function saveToFirestore() {
    try {
      void addDoc(collection(db, "eyeGameScores"), {
        userId: user?.uid ?? "guest",
        game: "saccade_sniper",
        score: scoreRef.current,
        difficulty: sessionDiff.current,
        hitsCount: hitsRef.current,
        bestStreak: bestStreakRef.current,
        timestamp: new Date(),
      });
    } catch {
      /* silent offline */
    }
  }

  useEffect(() => {
    if (!running && gameActive) endSession();
  }, [running]);
  useEffect(() => {
    return () => {
      clearAllGameTimers();
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
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
    opacity: comboPopOpacity.value,
  }));
  const countdownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));
  const pauseCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pauseCardScale.value }],
  }));

  const liveTotal = hits + misses;
  const liveAccuracy =
    liveTotal > 0 ? Math.round((hits / liveTotal) * 100) : null;
  const sessionPct = ((SESSION_SECS - timer) / SESSION_SECS) * 100;

  const lowTime = gameActive && timer <= 15;
  const cornerColor = rushMode
    ? C.orange
    : streakGlow
      ? C.gold
      : "rgba(6,182,212,0.25)";
  const arenaStyle = [
    s.arena,
    { width: ARENA_W, height: ARENA_H } as const,
    paused && s.arenaPaused,
    !paused && missFlash && s.arenaFlash,
    !paused && rushMode && !missFlash && s.arenaRush,
    !paused && !rushMode && streakGlow && !missFlash && s.arenaGold,
    !paused && lowTime && !rushMode && !missFlash && !streakGlow && s.arenaLow,
  ];

  return (
    <View style={s.wrap}>
      {/* Eye tip */}
      <GlassCard simple noPadding style={s.tipBar}>
        <Ionicons name="eye-outline" size={13} color={C.muted} />
        <Text style={s.tipText} numberOfLines={1}>
          {EYE_TIPS[tipIdx]}
        </Text>
      </GlassCard>

      {/* Difficulty — segmented control, uniform cyan glow on the active
          segment. */}
      <View style={s.diffRow}>
        {(["easy", "sharp", "elite"] as Difficulty[]).map((d) => {
          const active = diff === d;
          return (
            <TouchableOpacity
              key={d}
              disabled={gameActive || countdown !== null}
              onPress={() => setDiff(d)}
              activeOpacity={0.7}
              style={[
                s.diffBtn,
                active && s.diffBtnActive,
                (gameActive || countdown !== null) && s.diffBtnDisabled,
              ]}
            >
              <Text style={[s.diffBtnText, active && s.diffBtnTextActive]}>
                {DIFF[d].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Performance — real accuracy, combo, and session progress (PB lives
          here now, not floating on its own). No CPU, no win/lose framing:
          this is a wellness exercise, not a scoreboard. */}
      {(gameActive || sessionDone) && (
        <PerformanceBar
          accuracy={liveAccuracy}
          combo={combo}
          bestCombo={bestComboRef.current}
          sessionPct={sessionDone ? 100 : sessionPct}
          personalBestMs={personalBestMs}
          dimmed={paused}
        />
      )}

      {/* Arena */}
      <View style={s.arenaShadowWrap}>
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
              x={targetPos.x}
              y={targetPos.y}
              size={DIFF[sessionDiff.current].size}
              color={targetColor}
              shape={targetShape}
              onPress={onTap}
            />
          )}
          {targetDying && (
            <DyingTarget
              x={targetPos.x}
              y={targetPos.y}
              size={DIFF[sessionDiff.current].size}
              color={targetColor}
              shape={targetShape}
              onDone={() => setTargetDying(false)}
            />
          )}

          {/* Ripples + floats */}
          {ripples.map((r) => (
            <Ripple
              key={r.id}
              {...r}
              size={DIFF[sessionDiff.current].size}
              onDone={() => setRipples((p) => p.filter((x) => x.id !== r.id))}
            />
          ))}
          {floats.map((f) => (
            <FloatText
              key={f.id}
              {...f}
              onDone={() => setFloats((p) => p.filter((x) => x.id !== f.id))}
            />
          ))}

          {/* Combo popup */}
          <Animated.View
            style={[s.comboPill, comboPopStyle]}
            pointerEvents="none"
          >
            <Text style={s.comboText}>{comboLabel}</Text>
          </Animated.View>

          {/* Idle overlay */}
          {!gameActive && !sessionDone && countdown === null && (
            <View style={s.idleOverlay}>
              <IdleAmbientGlow />
              <View style={s.idleIconRing}>
                <Ionicons
                  name="locate-outline"
                  size={40}
                  color={C.purpleLight}
                />
              </View>
              <Text style={s.idleTitle}>Saccade Sniper</Text>
              <Text style={s.idleSub}>Tap targets before they vanish.</Text>
              <View style={s.rushChip}>
                <Text style={s.rushChipText}>⚡ 5+ streak = Rush Mode</Text>
              </View>
              <View style={s.idlePillRow}>
                <View style={s.idlePill}>
                  <Text style={s.idlePillLabel}>Session</Text>
                  <Text style={s.idlePillVal}>60 sec</Text>
                </View>
                <View style={s.idlePill}>
                  <Text style={s.idlePillLabel}>Goal</Text>
                  <Text style={s.idlePillVal}>Moving Targets</Text>
                </View>
                <View style={s.idlePill}>
                  <Text style={s.idlePillLabel}>Eye Skill</Text>
                  <Text style={s.idlePillVal}>Saccades</Text>
                </View>
              </View>
            </View>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <View style={s.countdownOverlay} pointerEvents="none">
              <Animated.Text style={[s.countdownText, countdownStyle]}>
                {countdown > 0 ? countdown : "GO"}
              </Animated.Text>
            </View>
          )}

          {/* Pause button */}
          {gameActive && !paused && (
            <TouchableOpacity
              style={s.pauseBtn}
              onPress={pauseSession}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Ionicons name="pause" size={16} color={C.purpleLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pause overlay — covers the whole component (not just the canvas),
          with the frozen gameplay dimmed + blurred underneath, and a
          floating glass card centered on top. */}
      {paused && (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(180)}
          style={s.pauseOverlay}
          pointerEvents="box-none"
        >
          <BlurView
            intensity={35}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={s.pauseScrim} pointerEvents="none" />

          <Animated.View style={[s.pauseCard, pauseCardStyle]}>
            <View style={s.pauseIconRing}>
              <Ionicons name="pause" size={26} color={C.purpleLight} />
            </View>
            <Text style={s.pauseTitle}>Game Paused</Text>
            <Text style={s.pauseSub}>Resume whenever you're ready.</Text>

            <GradientCTA
              label="Resume"
              onPress={resumeSession}
              textColor="#03212C"
              style={s.pauseResumeCta}
            />
            <TouchableOpacity
              style={s.pauseRestartBtn}
              onPress={restartSession}
              activeOpacity={0.75}
            >
              <Text style={s.pauseRestartText}>Restart Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.pauseEndBtn}
              onPress={endSession}
              activeOpacity={0.6}
              hitSlop={8}
            >
              <Text style={s.pauseEndText}>End Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Streak dots */}
      <StreakDots streak={streak} rush={rushMode} />

      {/* Start / replay button */}
      <GradientCTA
        label={
          gameActive
            ? "Playing"
            : countdown !== null
              ? "Get ready…"
              : sessionDone
                ? "Beat Your Best"
                : "Start Exercise"
        }
        sublabel={
          gameActive
            ? `${timer} sec left`
            : countdown !== null
              ? ""
              : sessionDone
                ? "Try again"
                : "60 sec • Ready"
        }
        icon={
          !gameActive && countdown === null ? (
            <Ionicons name="play" size={19} color="#03212C" />
          ) : undefined
        }
        compact
        height={62}
        glowColor="rgba(0,224,255,0.6)"
        onPress={beginCountdown}
        disabled={gameActive || countdown !== null}
        keepBright={gameActive || countdown !== null}
        textColor="#03212C"
        letterSpacing={1}
        style={s.startCta}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: 18, width: "100%", position: "relative" },

  tipBar: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tipText: { fontSize: 11, color: C.muted, fontWeight: "500", flex: 1 },

  // Difficulty — segmented control (single container, no per-segment borders)
  diffRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    height: 48,
    padding: 4,
    gap: 4,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  diffBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  diffBtnActive: {
    backgroundColor: "rgba(0,224,255,0.18)",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
  },
  diffBtnDisabled: { opacity: 0.4 },
  diffBtnText: { fontSize: 13, fontWeight: "700", color: C.muted },
  diffBtnTextActive: { color: C.purpleLight },

  // Shadow lives on the wrapper (below), not here — this view needs
  // overflow:'hidden' to clip targets/particles, which would suppress a
  // shadow applied to the same node.
  arenaShadowWrap: {
    alignSelf: "stretch",
    borderRadius: 22,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  arena: {
    borderRadius: 22,
    backgroundColor: C.arenaBg,
    borderWidth: 1.2,
    borderColor: "rgba(0,224,255,0.19)",
    overflow: "hidden",
    position: "relative",
  },
  // Border dims to ~40% while paused — a quiet cue the game has stopped.
  arenaPaused: { borderColor: "rgba(0,224,255,0.08)" },
  arenaFlash: { borderColor: C.red, borderWidth: 2.5 },
  arenaRush: {
    borderColor: C.orange,
    borderWidth: 2,
    shadowColor: C.orange,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  arenaGold: {
    borderColor: C.gold,
    borderWidth: 2,
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  arenaLow: {
    borderColor: C.red,
    borderWidth: 1.5,
    shadowColor: C.red,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  timerTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOPBAR_H,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  timerFill: { height: TOPBAR_H, borderRadius: 0 },

  rushBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 5,
    backgroundColor: "rgba(249,115,22,0.18)",
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rushBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: C.orange,
    letterSpacing: 1,
  },

  comboPill: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 8,
    backgroundColor: "rgba(83,74,183,0.9)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.5)",
  },
  comboText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },

  idleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  idleIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: C.purple + "55",
    backgroundColor: "rgba(0,224,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  idleTitle: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    fontWeight: "900",
    color: C.text,
    letterSpacing: 0.3,
  },
  idleSub: { fontSize: 15, color: C.muted, textAlign: "center" },
  rushChip: {
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "rgba(249,115,22,0.14)",
    borderWidth: 1,
    borderColor: C.orange + "55",
  },
  rushChipText: { fontSize: 11.5, fontWeight: "700", color: C.orange },
  idlePillRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  idlePill: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  idlePillLabel: {
    fontSize: 8.5,
    color: C.dim,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  idlePillVal: { fontSize: 11, color: C.text, fontWeight: "700" },

  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,18,26,0.55)",
    zIndex: 12,
  },
  countdownText: {
    fontFamily: FONTS.heading,
    fontSize: 64,
    fontWeight: "900",
    color: C.purpleLight,
    letterSpacing: 1,
    textShadowColor: C.purple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  pauseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,224,255,0.16)",
    borderWidth: 1,
    borderColor: C.purple + "55",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // Pause overlay — covers the whole component (arena + HUD + button), not
  // just the canvas. Gameplay stays visible underneath, dimmed + blurred.
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  pauseScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3,8,11,0.65)",
  },
  pauseCard: {
    width: "86%",
    maxWidth: 340,
    backgroundColor: "rgba(22,22,32,0.92)",
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.4,
    shadowRadius: 36,
    elevation: 20,
  },
  pauseIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,224,255,0.12)",
    borderWidth: 1.5,
    borderColor: C.purple + "55",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pauseTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  pauseSub: {
    fontSize: 13.5,
    color: C.muted,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },
  pauseResumeCta: { alignSelf: "stretch", marginTop: 20 },
  pauseRestartBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  pauseRestartText: { fontSize: 13.5, fontWeight: "700", color: C.muted },
  pauseEndBtn: { marginTop: 14, paddingVertical: 4 },
  pauseEndText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.red,
    opacity: 0.85,
  },

  startCta: { alignSelf: "stretch" },
});
