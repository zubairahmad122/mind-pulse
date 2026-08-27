import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { AlertTriangle, Clock3, Crosshair, Eye, Flame, Gauge, Info, LogOut, Pause, Play, RotateCcw, Settings2, Target, Vibrate, Volume2, VolumeX, Zap } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, DimensionValue, type LayoutChangeEvent, Modal, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { FOCUS_SWITCH_DEFAULT_RACE_CPU } from '@/constants/eyeRelax';
import { useGameFeedbackPrefs } from '@/hooks/useGameFeedbackPrefs';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { useWellnessStore } from '@/stores/useWellnessStore';
import { FocusSwitchDepthPreview } from './FocusSwitchDepthPreview';
import { type GameEndStats } from './GameOverScreen';

const AnimatedCircle  = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface Props {
  running: boolean;
  onSession?: (score: number) => void;
  onGameEnd?: (stats: GameEndStats) => void;
  /**
   * Seeds the difficulty picker. The parent remounts this component on replay
   * (via `replayKey`), which would otherwise re-initialise the picker and
   * silently drop the player back to Casual after an Elite round.
   */
  initialDifficulty?: FocusSwitchDifficulty;
  /** Reports picker changes so the parent can preserve them across a replay. */
  onDifficultyChange?: (difficulty: FocusSwitchDifficulty) => void;
  /**
   * Reports whether the player's finger is currently down on the moving
   * target, so the host screen can freeze page scrolling for just that
   * instant — not for the whole round — so a scroll gesture can't steal a
   * tap out from under the player without locking the rest of the page.
   */
  onActiveChange?: (active: boolean) => void;
  /** Seeds the CPU-race toggle — same replay-preservation reason as
   * `initialDifficulty`. Defaults to on, matching the original behavior
   * where every round raced the CPU unconditionally. */
  initialRaceCpu?: boolean;
  /** Reports toggle changes so the parent can preserve them across a replay. */
  onRaceCpuChange?: (raceCpu: boolean) => void;
  /**
   * Monotonic request counter from the host screen's header pause button: a
   * fresh value pauses a live round (the pause overlay is that round's
   * settings/controls surface).
   */
  pauseRequest?: number;
  /** Reports whether a round is live, so the host can swap its header to
   * the compact gameplay chrome (back + title + pause, no subtitle/PB). */
  onRoundActiveChange?: (active: boolean) => void;
}

type Difficulty = 'gentle' | 'easy' | 'sharp' | 'elite';

/** Public alias so screens can hold the selected mode without importing internals. */
export type FocusSwitchDifficulty = Difficulty;
type OrbState   = 'sharp' | 'blurring' | 'blurry' | 'sharpening';

interface DiffConfig {
  label: string; dotColor: string; size: number; pts: number;
  sharpWindowMs: number; blurInMs: number; blurHoldMs: number; blurOutMs: number;
  baseMoveMs: number; minMoveMs: number;
  /** Floor for the streak-driven speedup multiplier — lower means the game can
   * ramp up faster as the streak builds. Gentle caps this closer to 1 so a
   * good streak never accelerates it past a comfortable pace. */
  streakSpeedFloor: number;
}

// ─── Difficulty table ─────────────────────────────────────────────────────────
const DIFF: Record<Difficulty, DiffConfig> = {
  gentle: { label: 'Gentle', dotColor: '#5eead4', size: 92, pts: 1, sharpWindowMs: 2200, blurInMs: 700, blurHoldMs: 620, blurOutMs: 700, baseMoveMs: 1800, minMoveMs: 700, streakSpeedFloor: 0.85 },
  easy:   { label: 'Casual', dotColor: '#6ee7b7', size: 80, pts: 1, sharpWindowMs: 1600, blurInMs: 520, blurHoldMs: 460, blurOutMs: 520, baseMoveMs: 1400, minMoveMs: 500, streakSpeedFloor: 0.60 },
  sharp:  { label: 'Sharp',  dotColor: '#f59e0b', size: 60, pts: 2, sharpWindowMs: 1050, blurInMs: 380, blurHoldMs: 340, blurOutMs: 380, baseMoveMs: 950,  minMoveMs: 360, streakSpeedFloor: 0.60 },
  elite:  { label: 'Elite',  dotColor: '#e24b4a', size: 44, pts: 3, sharpWindowMs: 780,  blurInMs: 290, blurHoldMs: 260, blurOutMs: 290, baseMoveMs: 700,  minMoveMs: 280, streakSpeedFloor: 0.60 },
};

/** Selected accent for the segmented difficulty picker — one cyan language
 * across all four modes, matching the Eye tab's navy/cyan palette. Visual
 * only, gameplay untouched. */
const SELECTED_CYAN = {
  borderColor: 'rgba(0,224,255,0.55)',
  bg: 'rgba(0,224,255,0.1)',
  text: '#67e8f9',
};

// ─── CPU random scoring intervals ────────────────────────────────────────────
const CPU_INTERVAL: Record<Difficulty, { minMs: number; maxMs: number }> = {
  gentle: { minMs: 3400, maxMs: 6000 },
  easy:   { minMs: 2600, maxMs: 4800 },
  sharp:  { minMs: 1700, maxMs: 3200 },
  elite:  { minMs: 1000, maxMs: 2100 },
};

const SESSION_SECS = 60;
const PAD          = 40;
const VW           = 64;
const VH           = 85;
const TOPBAR_H     = 5;

// y kept tighter than x (0.16–0.84 vs 0.08–0.92) — the arena runs much
// taller than it is wide while active, so the old 0.08/0.92 y-extremes read
// as the target pinning itself to the very top/bottom corners, with a dead
// gap between it and the (width-relative) depth rings the rest of the time.
const WAYPOINTS: { x: number; y: number }[] = [
  { x: 0.08, y: 0.16 }, { x: 0.92, y: 0.16 }, { x: 0.08, y: 0.84 },
  { x: 0.92, y: 0.84 }, { x: 0.50, y: 0.50 }, { x: 0.50, y: 0.16 },
  { x: 0.92, y: 0.50 }, { x: 0.50, y: 0.84 }, { x: 0.08, y: 0.50 },
];
const MOVE_ORDER = [0, 3, 1, 2, 4, 5, 7, 8, 6, 4, 1, 2, 3, 0, 6, 8];

const C = {
  card:        'rgba(255,255,255,0.045)',
  // Eye-pillar accent (was the old teal-cyan '#22d3ee' — a different color
  // from PILLAR_COLORS.eye used everywhere else in the Eye tab).
  purple:      PILLAR_COLORS.eye,
  purpleLight: '#5eead4',
  green:       '#6ee7b7',
  red:         '#e24b4a',
  gold:        '#ffd700',
  orange:      '#f97316',
  amber:       '#f59e0b',
  muted:       'rgba(255,255,255,0.6)',
  dim:         'rgba(255,255,255,0.38)',
  // Higher-contrast than `dim` — for secondary text that still needs to be
  // read (mode subtitle, status mode), not purely decorative accents.
  textSecondary: 'rgba(255,255,255,0.68)',
  arenaBg:     '#06121a',
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
  if (pct > 80) return 'Excellent game timing. Now give your eyes a distant-view break.';
  if (pct >= 60) return 'Good timing. Keep the focus changes comfortable.';
  if (pct >= 40) return 'Getting there. Accuracy matters more than speed.';
  return 'Tough one. Slow down or stop if your eyes feel uncomfortable.';
}

// ─── Particle types ───────────────────────────────────────────────────────────
type ParticleId = string;
interface FloatData  { id: ParticleId; x: number; y: number; text: string }
interface BlastData  { id: ParticleId; x: number; y: number; text: string; color: string; size: number }

// ─── Spark burst — 9 small sparks flying outward from the rocket on a hit,
// one shared progress value driving all of them (no per-frame JS, no
// persistent pool — a one-shot particle that removes itself, exactly like
// HitBlast/FloatText below). ────────────────────────────────────────────────
type SparkData = { id: ParticleId; x: number; y: number; color: string };
const SPARK_ANGLES = [-90, -50, -10, 34, 78, 122, 166, 210, 254] as const;

function Spark({ angleDeg, progress, color }: { angleDeg: number; progress: SharedValue<number>; color: string }) {
  const rad = (angleDeg * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const dist = interpolate(progress.value, [0, 1], [0, 40]);
    return {
      transform: [
        { translateX: Math.cos(rad) * dist },
        { translateY: Math.sin(rad) * dist },
        { scale: interpolate(progress.value, [0, 1], [1, 0.2]) },
      ],
      opacity: interpolate(progress.value, [0, 0.15, 1], [0, 1, 0]),
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', width: 6, height: 6, borderRadius: 3,
        left: -3, top: -3, backgroundColor: color,
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 5, shadowOpacity: 0.9,
      }, style]}
    />
  );
}

function SparkBurst({ x, y, color, onDone }: SparkData & { onDone: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }, (f) => { if (f) runOnJS(onDone)(); });
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y }}>
      {SPARK_ANGLES.map(deg => (
        <Spark key={deg} angleDeg={deg} progress={progress} color={color} />
      ))}
    </View>
  );
}

// ─── Hit blast — replaces the old tap-point ring: a shockwave sized to the
// actual rocket (not a fixed ring that could land anywhere near the finger)
// plus a score label that pops instead of just floating up. Centered on the
// rocket's own position, not the raw touch point, so it never reads as a
// stray circle disconnected from the target. ───────────────────────────────
function HitBlast({ x, y, text, color, size, onDone }: BlastData & { onDone: () => void }) {
  const wave      = useSharedValue(0);
  const flash     = useSharedValue(0);
  const labelPop  = useSharedValue(0);
  const labelFade = useSharedValue(0);

  useEffect(() => {
    wave.value  = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }, (f) => { if (f) runOnJS(onDone)(); });
    flash.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    labelPop.value = withSequence(
      withSpring(1.18, { damping: 9, stiffness: 300 }),
      withSpring(1, { damping: 14 }),
    );
    labelFade.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(180, withTiming(0, { duration: 230 })),
    );
  }, []);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave.value, [0, 1], [0.5, 1.9]) }],
    opacity: interpolate(wave.value, [0, 0.2, 1], [0, 0.8, 0]),
  }));
  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(flash.value, [0, 1], [0.3, 1.05]) }],
    opacity: interpolate(flash.value, [0, 0.4, 1], [0.9, 0.6, 0]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: labelPop.value },
      { translateY: interpolate(labelPop.value, [0, 1], [4, -8]) },
    ],
    opacity: labelFade.value,
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y }}>
      {/* Outer shockwave ring, sized off the rocket's real footprint */}
      <Animated.View
        style={[{
          position: 'absolute',
          width: size * 1.15, height: size * 1.15, borderRadius: size,
          left: -size * 0.575, top: -size * 0.575,
          borderWidth: 2.5, borderColor: color,
        }, waveStyle]}
      />
      {/* Quick bright flash at the core */}
      <Animated.View
        style={[{
          position: 'absolute',
          width: size * 0.7, height: size * 0.7, borderRadius: size,
          left: -size * 0.35, top: -size * 0.35,
          backgroundColor: '#ffffff',
        }, flashStyle]}
      />
      <Animated.Text
        style={[{
          position: 'absolute',
          left: -60, top: -size * 0.5 - 26, width: 120, textAlign: 'center',
          fontSize: 19, fontWeight: '900', color: '#ffffff',
          textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
        }, labelStyle]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

// ─── Float text — misses only now; hits use HitBlast above. Shown at the
// actual finger position (not the target's), since a miss is exactly about
// that gap: where you tapped vs. where the target was. ─────────────────────
function FloatText({ x, y, text, onDone }: FloatData & { onDone: () => void }) {
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
        color: C.red,
        textShadowColor: 'rgba(226,75,74,0.8)',
        textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
      }, style]}
    >
      {text}
    </Animated.Text>
  );
}

// ─── Miss ring — a subtle red outline at the tap point on a miss. Replaces
// the old full-arena border flash (which read as a harsh full-screen alert);
// the ✗ MISS float text already carries the message. One-shot, removes
// itself, same cost class as HitBlast/FloatText. ────────────────────────────
function MissRing({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }, (f) => { if (f) runOnJS(onDone)(); });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(p.value, [0, 1], [0.4, 1.4]) }],
    opacity: interpolate(p.value, [0, 0.3, 1], [0.7, 0.4, 0]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', left: x - 20, top: y - 20,
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 2, borderColor: C.red,
      }, style]}
    />
  );
}

// ─── VS bar ─────────────────────────────────────────────────────────────────
function VsBar({ playerScore, cpuScore, isActive }: { playerScore: number; cpuScore: number; isActive: boolean }) {
  const total  = playerScore + cpuScore;
  const pct    = total > 0 ? Math.max(6, Math.min(94, Math.round((playerScore / total) * 100))) : 50;
  const isWin  = playerScore > cpuScore;
  const isLose = playerScore < cpuScore;

  return (
    <GlassCard simple noPadding style={vs.card}>
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
    </GlassCard>
  );
}
// Compact secondary row — CPU data is an optional add-on, so it stays
// visually lighter than the primary HUD above the arena, not a second
// large card.
const vs = StyleSheet.create({
  card:    { alignSelf: 'stretch', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, gap: 3 },
  row:     { flexDirection: 'row', alignItems: 'center' },
  side:    { flex: 1 },
  mid:     { flex: 1, alignItems: 'center', gap: 1 },
  roleYou: { fontSize: 10, fontWeight: '800', color: C.purpleLight, letterSpacing: 1 },
  roleCpu: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1 },
  num:     { fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900', color: C.muted, fontVariant: ['tabular-nums'] },
  vsLabel: { fontSize: 10, fontWeight: '800', color: C.textSecondary, letterSpacing: 1.5 },
  status:  { fontSize: 9.5, fontWeight: '800', color: C.muted, letterSpacing: 0.4 },
  track:   { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', position: 'relative' },
  fill:    { height: 3, backgroundColor: C.purple, borderRadius: 2 },
  midLine: { position: 'absolute', left: '50%', top: 0, width: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
});

// ─── Streak dots ────────────────────────────────────────────────────────────
function StreakDots({ streak, rush }: { streak: number; rush: boolean }) {
  const activeColor = rush ? C.amber : C.purpleLight;
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
  row:  { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  base: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: '#2e2660' },
});

// ─── Rocket orb — the target ───────────────────────────────────────────────
// `size` drives the hitbox (TouchableOpacity in the parent) — never touched
// here. Everything in this component is purely decorative: fill colors,
// glow, and a halo behind the rocket. `isSharp` doubles as the existing
// near/far cue — sharp (tappable) reads as "near" (bigger, brighter,
// sharp-edged cyan halo), not-sharp reads as "far" (smaller, softer,
// blurred-looking halo) — the same language the pre-game preview uses, with
// zero new gameplay state. `flashSV` is a one-shot 0→1→0 pulse the parent
// fires on a successful tap — here it both flashes the cockpit window and
// flares the thruster flame, so a hit reads as "ignition", not just a blink.
function RocketOrb({
  size, isSharp, sharpnessSV, spawnScaleSV, flashSV,
}: {
  size: number; isSharp: boolean;
  sharpnessSV: SharedValue<number>;
  spawnScaleSV: SharedValue<number>;
  flashSV: SharedValue<number>;
}) {
  const flamePulse = useSharedValue(0.3);
  const haloPulse  = useSharedValue(0.6);
  // Expanding "TAP now" pulse ring — only runs while the target is sharp
  // (tappable). Purely decorative, loops on the UI thread.
  const tapPulse = useSharedValue(0);

  useEffect(() => {
    flamePulse.value = 0.3;
    flamePulse.value = withRepeat(
      withTiming(1.0, { duration: 550, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    haloPulse.value = withRepeat(
      withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    return () => { cancelAnimation(flamePulse); cancelAnimation(haloPulse); };
  }, []);

  useEffect(() => {
    if (!isSharp) { cancelAnimation(tapPulse); return; }
    tapPulse.value = 0;
    tapPulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
      -1, false,
    );
    return () => cancelAnimation(tapPulse);
  }, [isSharp, tapPulse]);

  const tapRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(tapPulse.value, [0, 1], [1, 1.5]) }],
    opacity: interpolate(tapPulse.value, [0, 0.5, 1], [0.55, 0.3, 0]),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spawnScaleSV.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: Math.min(1, interpolate(sharpnessSV.value, [0, 1], [0, 0.75]) + flashSV.value * 0.5),
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + haloPulse.value * (isSharp ? 0.3 : 0.12) + flashSV.value * 0.3,
  }));

  // Cockpit window flash on a hit — same wiring the old "belly core" used,
  // just repositioned to the window.
  const windowFlashProps = useAnimatedProps(() => ({ opacity: 0.55 + flashSV.value * 0.45 }));
  // Thruster flame: idles on a steady flicker (flamePulse), then flares
  // taller and brighter for an instant on every successful tap (flashSV) —
  // the "ignition" read the tap sound effect is timed against.
  const flameOuterProps = useAnimatedProps(() => ({
    opacity: 0.55 + flamePulse.value * 0.3 + flashSV.value * 0.3,
    ry: 7 + flamePulse.value * 4 + flashSV.value * 9,
  }));
  const flameInnerProps = useAnimatedProps(() => ({
    opacity: 0.7 + flamePulse.value * 0.25 + flashSV.value * 0.3,
    ry: 4.5 + flamePulse.value * 3 + flashSV.value * 6.5,
  }));

  // Cyan/teal hull, ties the target's color language to the arena border,
  // HUD accents, and the pre-game preview's NEAR dot, so gameplay reads as
  // the same product as the preview. Flame stays warm (orange/gold) for
  // contrast — the one place this target isn't cyan.
  const HULL       = '#6EECD8';
  const HULL_MID   = '#38D7F0';
  const WINDOW     = '#06121a';
  const FLAME_OUT  = '#F97316';
  const FLAME_IN   = '#FFD87A';
  const HALO_NEAR  = 'rgba(0,224,255,0.6)';
  const HALO_FAR   = 'rgba(129,140,248,0.35)';
  const TAP_RING   = 'rgba(0,224,255,0.85)';
  const SVG_W      = 64;
  const SVG_H      = 85;
  // Just inside the halo so the pulse reads as "tap now", not a second ring.
  const tapRingSize = size * 1.18;
  const svgLeft    = (size - SVG_W) / 2;
  const svgTop     = (size - SVG_H) / 2;
  // Near (sharp) reads bigger + sharper-edged; far reads smaller + softer —
  // the halo carries the near/far read, never the hitbox (`size` above).
  const haloSize   = size * (isSharp ? 1.55 : 1.12);
  const haloBlur   = isSharp ? 7 : 16;
  // Visual-only scale knob: the rocket + halo render relative to the hitbox
  // (`size`) they sit inside. Bumped 0.75 → 0.95 (~27% bigger on screen)
  // so the target reads clearly inside the taller arena — the fixed hitbox
  // and all movement/scoring math are untouched, so gameplay is unchanged.
  const ORB_VISUAL_SCALE = 0.95;

  // FAR reads dimmer than NEAR, but 0.32 washed the rocket out almost
  // completely on brighter screens — bumped so it's still clearly visible
  // and readable as a real target, not just a smudge, while staying well
  // below NEAR's full brightness.
  return (
    <Animated.View style={[{ width: size, height: size, opacity: isSharp ? 1 : 0.6 }, containerStyle]}>
      {/* The whole visual target — halo + rocket — scales as one unit about
          the hitbox center (this wrapper is exactly `size`×`size`, so its
          transform origin matches the container's). Purely decorative:
          hit-testing stays on the un-scaled container above. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: 0, top: 0, width: size, height: size,
          transform: [{ scale: ORB_VISUAL_SCALE }],
        }}
      >
      {/* Near/far halo — decorative only, sized off the container, never the hitbox. */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.rocketHalo,
          {
            width: haloSize, height: haloSize, borderRadius: haloSize / 2,
            left: (size - haloSize) / 2, top: (size - haloSize) / 2,
            borderColor: isSharp ? HALO_NEAR : HALO_FAR,
            borderWidth: isSharp ? 2 : 1,
            shadowColor: isSharp ? HALO_NEAR : HALO_FAR,
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: haloBlur,
          },
          haloStyle,
        ]}
      />
      {/* TAP pulse ring — a larger expanding ring while the target is sharp,
          on top of the halo but behind the rocket hull. Decorative only. */}
      {isSharp && (
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: tapRingSize, height: tapRingSize, borderRadius: tapRingSize / 2,
            left: (size - tapRingSize) / 2, top: (size - tapRingSize) / 2,
            borderWidth: 2, borderColor: TAP_RING,
          }, tapRingStyle]}
        />
      )}
      <Animated.View
        pointerEvents="none"
        style={[{
          position: 'absolute', left: svgLeft, top: svgTop,
          width: SVG_W, height: SVG_H,
          shadowColor: '#00E0FF', shadowOffset: { width: 0, height: 0 },
          shadowRadius: 16, elevation: 8,
        }, glowStyle]}
      >
        <Svg width={SVG_W} height={SVG_H} viewBox="0 0 60 80">
          {/* Thruster flame — sits behind the hull so it reads as coming
              from the engine nozzle, not floating below it. */}
          <AnimatedEllipse cx={30} cy={61} rx={5.2} ry={7} fill={FLAME_OUT} animatedProps={flameOuterProps} />
          <AnimatedEllipse cx={30} cy={59} rx={2.8} ry={4.5} fill={FLAME_IN} animatedProps={flameInnerProps} />
          {/* Fins */}
          <Path d="M 18.5 46 L 8 60 L 18.5 55 Z" fill={HULL_MID} />
          <Path d="M 41.5 46 L 52 60 L 41.5 55 Z" fill={HULL_MID} />
          {/* Nose cone */}
          <Path d="M 30 4 C 24.5 10 20 18 18.5 27 L 41.5 27 C 40 18 35.5 10 30 4 Z" fill={HULL_MID} />
          {/* Body */}
          <Path d="M 18.5 27 L 41.5 27 L 41.5 52 C 41.5 57 37 60 30 60 C 23 60 18.5 57 18.5 52 Z" fill={HULL} />
          {/* Body seam — a cheap detail line, no extra shapes */}
          <Path d="M 21 41 L 39 41" stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
          {/* Cockpit window — flashes brighter on every successful tap */}
          <Circle cx={30} cy={37} r={6.5} fill={WINDOW} />
          <AnimatedCircle cx={30} cy={37} r={6.5} fill="none" stroke="#ffffff" strokeWidth={1.4} animatedProps={windowFlashProps} />
          <Circle cx={27.5} cy={34.5} r={1.5} fill="#ffffff" opacity={0.85} />
        </Svg>
      </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Rush badge — compact amber pill with a slow decorative pulse. Rush is a
// temporary state, so only this badge carries the amber accent; the arena
// itself stays cyan (see arenaStyle). ─────────────────────────────────────────
function RushBadge() {
  const pulse = useSharedValue(0.75);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 620, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={s.rushBadge} pointerEvents="none">
      <Animated.View style={[s.rushBadgeDot, pulseStyle]} />
      <Text style={s.rushBadgeText}>RUSH</Text>
    </View>
  );
}

// ─── Arena corner markers — shrunk and thinned to a "very minimal" accent,
// not a bordered-card frame. ──────────────────────────────────────────────────
function ArenaCorners({ color }: { color: string }) {
  const L = 10;
  const corners = [
    { top: 10, left: 10,     borderTopWidth: 1, borderLeftWidth: 1   },
    { top: 10, right: 10,    borderTopWidth: 1, borderRightWidth: 1  },
    { bottom: 10, left: 10,  borderBottomWidth: 1, borderLeftWidth: 1 },
    { bottom: 10, right: 10, borderBottomWidth: 1, borderRightWidth: 1 },
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

// ─── Arena atmosphere — the "infinite depth space" background. A slow
// drifting haze gradient + a small fixed pool of twinkling dust dots, both
// event-free (no per-frame JS, no spawn/despawn) — same cost class as the
// existing depth rings. Purely decorative, mounted once per arena. ──────────
// Cut from 7 to 3 dots — the atmosphere should hint at depth, not compete
// with the target for attention during a round.
const DUST_DOTS = [
  { left: '16%' as DimensionValue, top: '20%' as DimensionValue, size: 1.5, delay: 0 },
  { left: '80%' as DimensionValue, top: '74%' as DimensionValue, size: 1.5, delay: 900 },
  { left: '40%' as DimensionValue, top: '8%'  as DimensionValue, size: 1.5, delay: 1800 },
];

function Dust({ left, top, size, delay }: { left: DimensionValue; top: DimensionValue; size: number; delay: number }) {
  const opacity = useSharedValue(0.08);
  // Small drift loop, not just an opacity twinkle — gives the background a
  // sense of slow underwater/space motion instead of static fixed dots.
  const drift = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.08, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      ),
    );
    drift.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 5200 + delay, easing: Easing.inOut(Easing.sin) }),
        -1, true,
      ),
    );
    return () => { cancelAnimation(opacity); cancelAnimation(drift); };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-6, 6]) },
      { translateY: interpolate(drift.value, [0, 1], [5, -5]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', left, top,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#BFEFFF',
      }, style]}
    />
  );
}

function ArenaAtmosphere() {
  const haze = useSharedValue(0);
  const bloomPulse = useSharedValue(0);

  useEffect(() => {
    haze.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    bloomPulse.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    return () => { cancelAnimation(haze); cancelAnimation(bloomPulse); };
  }, []);

  const hazeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(haze.value, [0, 1], [-22, 22]) },
      { translateY: interpolate(haze.value, [0, 1], [-14, 14]) },
    ],
  }));

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bloomPulse.value, [0, 1], [0.7, 1]),
    transform: [{ scale: interpolate(bloomPulse.value, [0, 1], [0.94, 1.04]) }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Deep base fill — a shade darker than the arena background itself,
          so the corners and edges recede into it (the "infinite" read). */}
      <View style={s.atmosphereBase} />
      {/* Slow-drifting cyan/violet haze — oversized so the drift never
          reveals a hard edge. */}
      <Animated.View style={[s.atmosphereHaze, hazeStyle]}>
        <LinearGradient
          colors={['rgba(0,224,255,0.09)', 'rgba(3,8,11,0)', 'rgba(139,127,255,0.08)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Soft central bloom, now a slow breathing pulse instead of a
          static flat glow — and pulled in tighter (see atmosphereBloom)
          so it reads as a focused halo, not one giant dark circle. */}
      <Animated.View style={[s.atmosphereBloom, bloomStyle]} />
      {DUST_DOTS.map((d, i) => <Dust key={i} {...d} />)}
      {/* Vignette — four corner darkenings stand in for a radial vignette
          (RN has no native radial gradient). */}
      <LinearGradient pointerEvents="none" colors={['rgba(2,4,6,0.55)', 'rgba(2,4,6,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={['rgba(2,4,6,0.55)', 'rgba(2,4,6,0)']} start={{ x: 1, y: 1 }} end={{ x: 0.5, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// ─── Depth rings — a slow rotation + a gentle breathing scale, so the
// concentric near/far cue reads as alive background motion instead of a
// static painted decal. Purely decorative, never touches hit-testing. ──────
function DepthRings() {
  const rotation = useSharedValue(0);
  const breathe  = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(1, { duration: 46000, easing: Easing.linear }), -1, false);
    breathe.value  = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { cancelAnimation(rotation); cancelAnimation(breathe); };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` },
      { scale: interpolate(breathe.value, [0, 1], [0.97, 1.03]) },
    ],
  }));

  return (
    <Animated.View style={[s.depthRings, style]} pointerEvents="none">
      <View style={[s.depthRing, s.depthRingOuter]} />
      <View style={[s.depthRing, s.depthRingMid]} />
      <View style={[s.depthRing, s.depthRingInner]} />
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FocusSprint({
  running,
  onSession,
  onGameEnd,
  initialDifficulty,
  onDifficultyChange,
  onActiveChange,
  initialRaceCpu,
  onRaceCpuChange,
  pauseRequest,
  onRoundActiveChange,
}: Props) {
  const recordRushModeIfApplicable = useWellnessStore(s => s.recordRushModeIfApplicable);
  const { playHit, playWrong, playLaunchWhoosh } = useGameSounds();
  const { soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled } = useGameFeedbackPrefs();
  const [diff, setDiff]              = useState<Difficulty>(initialDifficulty ?? 'easy');
  const [raceCpu, setRaceCpu]        = useState<boolean>(initialRaceCpu ?? FOCUS_SWITCH_DEFAULT_RACE_CPU);
  const [gameActive, setGameActive]  = useState(false);
  const [paused, setPaused]          = useState(false);
  const [orbState, setOrbState]      = useState<OrbState>('sharp');
  const [score, setScore]            = useState(0);
  const [cpuScore, setCpuScore]      = useState(0);
  const [streak, setStreak]          = useState(0);
  const [bestStreak, setBestStreak]  = useState(0);
  const [hits, setHits]              = useState(0);
  const [timer, setTimer]            = useState(SESSION_SECS);
  const [sessionDone, setSessionDone] = useState(false);
  const [missRings, setMissRings]    = useState<{ id: string; x: number; y: number }[]>([]);
  const [rushMode, setRushMode]      = useState(false);
  const [, setStreakGlow] = useState(false);

  // Particles
  const [blasts, setBlasts] = useState<BlastData[]>([]);
  const [floats, setFloats] = useState<FloatData[]>([]);
  const [sparks, setSparks] = useState<SparkData[]>([]);

  // Comfort chip — local UI state only, dismissible, pre-game only.
  const [tipDismissed, setTipDismissed] = useState(false);
  // Pre-game settings sheet (header Settings2 while idle) + the comfort
  // detail modal (Info icon on the comfort row).
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [comfortOpen, setComfortOpen] = useState(false);
  // Confirm step before "End Session" — swaps the pause card's content
  // in place rather than stacking another modal.
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  // Combo popup
  const comboPopScale   = useSharedValue(0);
  const comboPopOpacity = useSharedValue(0);
  const [comboLabel, setComboLabel] = useState('');

  const { height: winH } = useWindowDimensions();
  // A proportional slice of the screen, not "whatever's left" — the old
  // `winH - 300` formula let the arena swallow nearly the whole screen on
  // tall phones, leaving a huge empty box around a small drifting target.
  // Movement is normalised to the *measured* box (see `onArenaLayout`), so
  // this clamp is a pure visual-fit knob, safe to retune independent of
  // gameplay.
  const arenaH = gameActive
    // Active gameplay claims ~66% of the screen so the canvas is the
    // dominant element (the old 44% left the lower half empty). Clamped so
    // tiny and very tall screens both stay sane.
    ? Math.max(360, Math.min(620, Math.round(winH * 0.66)))
    // Idle (pre-session) arena is the preview "card" — pulled in ~20% so the
    // page fits small Android screens; the preview target scales with it.
    : Math.max(230, Math.min(300, winH * 0.30));

  // Shared values
  const timerBarAnim = useSharedValue(1);
  const sharpness    = useSharedValue(1);
  const orbNormX     = useSharedValue(0.5);
  const orbNormY     = useSharedValue(0.5);
  const spawnScaleSV = useSharedValue(1);
  const rushSV       = useSharedValue(0);
  const arenaWSV     = useSharedValue(ARENA_W);
  const arenaHSV     = useSharedValue(arenaH);
  const tapScale     = useSharedValue(1);
  // One-shot 0→1→0 pulse on a successful tap — the target's "flashes
  // brighter, then returns" cue. Decorative only, read by RocketOrb.
  const flashSV      = useSharedValue(0);

  // Refs
  const gameActiveRef  = useRef(false);
  const pausedRef      = useRef(false);
  const endedRef       = useRef(false);
  const rushModeRef    = useRef(false);
  const orbStateRef    = useRef<OrbState>('sharp');
  const sessionDiffRef = useRef<Difficulty>('easy');
  const raceCpuRef     = useRef(raceCpu);
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
    const streakMult = Math.max(d.streakSpeedFloor, 1 - streakRef.current * 0.022);
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
    if (!gameActiveRef.current || pausedRef.current || !raceCpuRef.current) return;
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
        recordRushModeIfApplicable();
      }

      // Tap scale pulse on the rocket — the "launch kick"
      tapScale.value = withSequence(
        withSpring(combo >= 2 ? 1.28 : 1.18, { damping: 8, stiffness: 260 }),
        withSpring(1.0, { damping: 14 }),
      );
      // Brightness flash — flares the cockpit window and thruster flame,
      // then returns smoothly. Purely visual, no effect on scoring above.
      flashSV.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 320 }),
      );

      // Blast sound — a bigger "launch" whoosh on higher combos so the
      // audio escalates the same way the visuals and score do.
      if (soundEnabled) {
        playHit();
        if (combo >= 3) playLaunchWhoosh();
      }

      // Blast + spark burst centered on the rocket's own position, not the
      // raw finger coordinates — a fast tap near the hitbox's padded edge
      // used to spawn the old ring well off the rocket, reading as a random
      // disconnected circle. Anchoring to the target itself fixes that.
      // Cyan for a plain hit (the game's own identity color), gold/orange
      // for combo/rush tiers — same escalation language as the sound.
      const blastColor = rushMode ? C.orange : combo >= 2 ? C.gold : C.purple;
      const maxX = Math.max(0, arenaWSV.value - PAD * 2 - VW);
      const maxY = Math.max(0, arenaHSV.value - PAD * 2 - VH);
      const centerX = PAD + orbNormX.value * maxX + VW / 2;
      const centerY = PAD + orbNormY.value * maxY + VH / 2;

      const label =
        combo >= 4 ? `💥 ×4  +${earned}` :
        combo >= 3 ? `🔥 ×3  +${earned}` :
        combo >= 2 ? `⚡ ×2  +${earned}` :
        `+${earned}`;
      setBlasts(b => [...b, { id: uid(), x: centerX, y: centerY, text: label, color: blastColor, size: d.size }]);
      setSparks(sp => [...sp, { id: uid(), x: centerX, y: centerY, color: blastColor }]);

      showComboPopup(combo);

      if (hapticsEnabled) {
        if      (combo >= 3) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        else if (combo >= 2) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else                 void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      startBlurringPhase();
    } else {
      streakRef.current = 0;
      setStreak(0);
      setStreakGlow(false);
      if (rushModeRef.current) { rushModeRef.current = false; setRushMode(false); }
      setFloats(f => [...f, { id: uid(), x: tapX, y: tapY, text: '✗ MISS' }]);
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (soundEnabled) playWrong();
      // Subtle red ring at the tap point — replaces the old full-arena border
      // flash, which read as a harsh full-screen alert.
      setMissRings(r => [...r, { id: uid(), x: tapX, y: tapY }]);
    }
  }

  function beginRound() {
    scoreRef.current = 0; cpuScoreRef.current = 0; streakRef.current = 0;
    bestStreakRef.current = 0; hitsRef.current = 0; totalTapsRef.current = 0;
    timerLeft.current = SESSION_SECS; focusTimesRef.current = [];
    sessionDiffRef.current = diff; raceCpuRef.current = raceCpu; pausedRef.current = false;
    endedRef.current = false; rushModeRef.current = false;
    gameActiveRef.current = true; patternStepRef.current = 0;

    orbNormX.value = 0.5; orbNormY.value = 0.5;
    sharpness.value = 1; rushSV.value = 0; spawnScaleSV.value = 1;

    setScore(0); setCpuScore(0); setStreak(0); setBestStreak(0); setHits(0);
    setTimer(SESSION_SECS); setSessionDone(false);
    setPaused(false); setRushMode(false); setStreakGlow(false);
    setBlasts([]); setFloats([]); setSparks([]); setMissRings([]);
    setGameActive(true);
    onRoundActiveChange?.(true);

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

  function startSession() {
    if (gameActive) return;
    beginRound();
  }

  /** Discards the current in-progress round (no stats submitted, same as
   * never having played it) and immediately begins a fresh one — the pause
   * overlay's "Restart" action. */
  function restartSession() {
    clearOrbTimer(); clearCpuTimer();
    if (sessionTimer.current) { clearInterval(sessionTimer.current); sessionTimer.current = null; }
    cancelAnimation(timerBarAnim); cancelAnimation(sharpness);
    cancelAnimation(orbNormX); cancelAnimation(orbNormY); cancelAnimation(rushSV);
    setConfirmExitOpen(false);
    beginRound();
  }

  function pauseSession() {
    if (!gameActiveRef.current || pausedRef.current) return;
    pausedRef.current = true; setPaused(true);
    setConfirmExitOpen(false);
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
    onRoundActiveChange?.(false);
    cancelAnimation(timerBarAnim); cancelAnimation(sharpness);
    cancelAnimation(orbNormX); cancelAnimation(orbNormY); cancelAnimation(rushSV);

    const h          = hitsRef.current;
    const accuracy   = totalTapsRef.current > 0 ? Math.round((h / totalTapsRef.current) * 100) : 0;
    const racedCpu   = raceCpuRef.current;
    const youWon     = racedCpu && scoreRef.current > cpuScoreRef.current;
    const tied       = racedCpu && scoreRef.current === cpuScoreRef.current;
    const gap        = Math.abs(scoreRef.current - cpuScoreRef.current);

    // Display-only summaries derived from data already collected above — no
    // existing value is recomputed or altered.
    const focusLog = focusTimesRef.current;
    const avgResponseMs = focusLog.length > 0
      ? Math.round(focusLog.reduce((sum, ms) => sum + ms, 0) / focusLog.length)
      : 0;

    if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSession?.(scoreRef.current);
    onGameEnd?.({
      headline: youWon ? `${scoreRef.current} PTS 🏆` : `${scoreRef.current} PTS`,
      subline: !racedCpu
        ? getAccuracyMsg(accuracy)
        : youWon
        ? `Beat CPU by ${gap} pts — ${getAccuracyMsg(accuracy)}`
        : tied
        ? `Tied with CPU! — ${getAccuracyMsg(accuracy)}`
        : `CPU won by ${gap} pts — ${getAccuracyMsg(accuracy)}`,
      rating:  accuracy > 80 ? 3 : accuracy >= 50 ? 2 : 1,
      stats: [
        { label: 'Your Score',  value: `${scoreRef.current}` },
        ...(racedCpu ? [{ label: 'CPU Score', value: `${cpuScoreRef.current}` }] : []),
        { label: 'Hits',        value: `${hitsRef.current}` },
        { label: 'Accuracy',    value: `${accuracy}%` },
        { label: 'Avg Response', value: avgResponseMs > 0 ? `${avgResponseMs}ms` : '—' },
        { label: 'Best Streak', value: `${bestStreakRef.current}` },
        { label: 'Difficulty',  value: DIFF[sessionDiffRef.current].label },
      ],
      survived: true,
    });
  }

  // Background/lock handling ONLY — no timer, scoring, combo, difficulty, or
  // game-mechanic changes. Backgrounding a live round reuses the existing
  // pause flow (timers frozen), and the existing paused overlay is the
  // resume state shown when the user returns.
  useSessionLifecycle({
    onPause: () => {
      if (gameActiveRef.current && !pausedRef.current) pauseSession();
    },
    onResume: () => undefined,
  });

  useEffect(() => { if (!running && gameActiveRef.current) endSession(); }, [running]);
  // Header pause button — a monotonic request counter from the host screen.
  // Handled through a latest-ref (effect deps stay just the counter) and
  // gated on a *change*, so a replay remount with a stale non-zero counter
  // can't auto-pause right after "Play Again".
  const handlePauseRequest = useRef<() => void>(() => undefined);
  handlePauseRequest.current = () => {
    if (gameActiveRef.current && !pausedRef.current) pauseSession();
  };
  const lastPauseRequest = useRef(pauseRequest ?? 0);
  useEffect(() => {
    const req = pauseRequest ?? 0;
    if (req === lastPauseRequest.current) return;
    lastPauseRequest.current = req;
    handlePauseRequest.current();
  }, [pauseRequest]);
  // Scroll-lock safety net: only ever *releases* the lock here, the moment a
  // round ends. Engaging the lock is owned by the target's onPressIn/onPressOut
  // below — locking scroll for a whole 60s round (the old behavior) froze the
  // entire page, including content the player might want to scroll back to
  // (e.g. the header) between taps. Locking only for the instant a touch is
  // down on the target still protects the tap from being stolen by a scroll
  // gesture, without freezing the rest of the page for the whole round.
  useEffect(() => { if (!gameActive) onActiveChange?.(false); }, [gameActive, onActiveChange]);
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
  // Rush is a temporary state, not the arena's identity — its corner accent
  // is a restrained amber, not the old full orange recolor (see arenaStyle).
  const cornerColor = rushMode ? C.amber : hiStreak ? C.gold : 'rgba(6,182,212,0.25)';

  // NOTE: no `padding` and no `borderWidth` change may be added to the arena.
  // Absolutely-positioned children (the target) are laid out from the padding
  // edge, while `onArenaLayout` reports the full border box — padding here
  // would silently shift the playfield origin and break hit positioning.
  //
  // The arena border stays cyan by default and during Rush (a brighter cyan
  // glow, not a full orange recolor) — Rush is signalled by the badge alone,
  // so the arena always reads as "Focus Switch", not a different game.
  const arenaStyle = [
    s.arena, { height: arenaH } as const,
    rushMode   && s.arenaRushGlow,
    !rushMode  && hiStreak && s.arenaGold,
    lowTime    && !rushMode && !hiStreak && s.arenaLow,
  ];

  const modeLabel = DIFF[gameActive ? sessionDiffRef.current : diff].label;
  // NEAR = tappable (sharp or on its way back to sharp); FAR = blurred/hold.
  const isNearTarget = orbState === 'sharp' || orbState === 'sharpening';

  return (
    <View style={s.wrap}>

      {/* Comfort chip, mode selector, and Challenge Mode chip all collapse
          while a round is live — they're inert during play anyway, and
          hiding them means nothing above the arena needs to scroll away
          mid-round. They return the moment the round ends (including for
          "Play Again", so the picker stays reachable before a replay). */}
      {!gameActive && !tipDismissed && (
        <View style={s.comfortRow}>
          <TouchableOpacity
            style={s.comfortMain}
            activeOpacity={0.7}
            onPress={() => setTipDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss comfort note"
          >
            <Eye size={14} color={C.purpleLight} strokeWidth={2.2} />
            <Text style={s.comfortText}>Keep it comfortable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.comfortInfoBtn}
            activeOpacity={0.7}
            hitSlop={6}
            onPress={() => setComfortOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Comfort details"
            accessibilityHint="Opens the full comfort message"
          >
            <Info size={14} color={C.muted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Compact live HUD — one 48dp stats strip: time · score · streak ·
          difficulty, each an icon + value pair with a subtle separator.
          Pause lives in the host header during a round, so this strip holds
          only the numbers. Hidden before the first play (an all-zero row is
          pure noise on first look). */}
      {(gameActive || sessionDone) && (
        <View style={s.hudRow}>
          <View style={s.hudStat}>
            <Clock3 size={13} color={lowTime ? C.red : C.muted} strokeWidth={2.2} />
            <Text style={[s.hudStatValue, lowTime && { color: C.red }]}>
              {Math.max(0, timer)}s
            </Text>
          </View>
          <View style={s.hudSep} />
          <View style={s.hudStat}>
            <Target size={13} color={C.purpleLight} strokeWidth={2.2} />
            <Text style={[s.hudStatValue, { color: C.purpleLight }]}>{score}</Text>
          </View>
          <View style={s.hudSep} />
          <View style={s.hudStat}>
            <Flame size={13} color={streak >= 3 ? C.amber : C.dim} strokeWidth={2.2} />
            <Text style={[s.hudStatValue, streak >= 3 ? { color: C.amber } : { color: C.dim }]}>
              ×{streak}
            </Text>
          </View>
          <View style={s.hudSep} />
          <View style={s.hudStat}>
            <Gauge size={13} color={C.muted} strokeWidth={2.2} />
            <Text style={s.hudModeText} numberOfLines={1}>{modeLabel}</Text>
          </View>
        </View>
      )}

      {!gameActive && (
        <>
          {/* Mode selector — compact single-row segmented control (labels
              only, no dots, no subtitle) replacing the old 2-row card grid. */}
          <View style={s.modeRow}>
            {(['gentle', 'easy', 'sharp', 'elite'] as Difficulty[]).map(d => {
              const selected = diff === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => { setDiff(d); onDifficultyChange?.(d); }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[s.modeBtn, selected && s.modeBtnSelected]}
                >
                  <Text
                    style={[s.modeBtnText, selected && s.modeBtnTextSelected]}
                    numberOfLines={1}
                  >
                    {DIFF[d].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Challenge Mode — a compact settings row (Zap + label + switch),
              visually secondary: an optional add-on to a calm focus exercise,
              not the point of it. Same behaviour as the old one-tap chip: the
              icon+label half toggles too, so the whole row is a reachable
              target (the Switch stays a sibling — no nested-touch double
              fire). */}
          <View style={[s.challengeRow, raceCpu && s.challengeRowActive]}>
            <TouchableOpacity
              style={s.challengeRowTap}
              activeOpacity={0.7}
              onPress={() => { const v = !raceCpu; setRaceCpu(v); onRaceCpuChange?.(v); }}
              accessibilityRole="button"
              accessibilityState={{ selected: raceCpu }}
              accessibilityLabel="Challenge mode — race against CPU"
            >
              <Zap size={16} color={raceCpu ? C.amber : C.dim} strokeWidth={2.2} />
              <Text style={[s.challengeRowText, raceCpu && s.challengeRowTextActive]}>
                Challenge mode
              </Text>
            </TouchableOpacity>
            <Switch
              value={raceCpu}
              onValueChange={v => { setRaceCpu(v); onRaceCpuChange?.(v); }}
              trackColor={{ false: 'rgba(255,255,255,0.14)', true: 'rgba(245,158,11,0.75)' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="rgba(255,255,255,0.14)"
              accessibilityLabel="Challenge mode — race against CPU"
            />
          </View>
        </>
      )}

      {/* VS bar — only meaningful when the player opted into racing the CPU */}
      {raceCpu && (gameActive || sessionDone) && (
        <VsBar playerScore={score} cpuScore={cpuScore} isActive={gameActive} />
      )}

      {/* ── Arena ──────────────────────────────────────────────────────────
          Layering contract: the pre-game intro and the moving target live in
          mutually exclusive branches (`!gameActive` vs `gameActive`), so they
          can never be mounted at the same time — the target physically cannot
          overlap the title or the instructions. Inside the intro, the three
          zones are flex siblings, which cannot overlap by definition. */}
      <View style={arenaStyle} onLayout={onArenaLayout}>
        <ArenaCorners color={cornerColor} />

        {/* Immersive depth atmosphere — decorative only, never touches the game */}
        <ArenaAtmosphere />

        {/* Slowly rotating, breathing concentric depth rings — non-interactive,
            always present so the near/far identity persists during play too. */}
        <DepthRings />

        {/* Timer bar (top strip) */}
        <View style={s.timerTrack}>
          <Animated.View style={[s.timerFill, timerBarStyle]} />
        </View>

        {/* NEAR/FAR state badge — one active label instead of the tiny
            two-dot legend. Cyan when near (tappable), muted when far; the
            text always carries the state, never color alone. */}
        {gameActive && (
          <View
            pointerEvents="none"
            style={[
              s.nearFarBadge,
              isNearTarget ? s.nearFarBadgeNear : s.nearFarBadgeFar,
            ]}
          >
            <Target size={12} color={isNearTarget ? '#67e8f9' : 'rgba(255,255,255,0.4)'} strokeWidth={2.2} />
            <Text style={[s.nearFarText, isNearTarget ? s.nearFarTextNear : s.nearFarTextFar]}>
              {isNearTarget ? 'NEAR TARGET' : 'FAR TARGET'}
            </Text>
          </View>
        )}

        {/* ── PRE-GAME: two non-overlapping flex zones (visual + copy) ── */}
        {!gameActive && !sessionDone && (
          <View style={s.introRoot} pointerEvents="none">
            {/* Zone A — decorative depth demo, clipped so glow can't reach
                text. The old "FOCUS SWITCH" eyebrow is gone: the screen
                header already titles the game, and dropping it frees ~22px
                of height for the target. */}
            <View style={s.zoneVisual}>
              <FocusSwitchDepthPreview />
            </View>

            {/* Zone B — one concise instruction */}
            <View style={s.zoneCopy}>
              <View style={s.introInstructionRow}>
                <Crosshair size={15} color={C.green} strokeWidth={2.2} />
                <Text style={s.introLine}>
                  Follow the target. Tap when it{' '}
                  <Text style={s.introHighlight}>glows</Text>.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Rush badge — the only place Rush shows amber; the arena border
            itself stays cyan (see arenaStyle). */}
        {rushMode && gameActive && <RushBadge />}

        {/* ── ACTIVE: the target. Must stay a direct child of the onLayout
            view above, so `onPressIn`'s coordinate space stays valid. ── */}
        {gameActive && (
          <Animated.View style={orbMoveStyle} pointerEvents="box-none">
            <Text style={[s.orbLabel, { color: isOrbSharp ? (rushMode ? C.amber : C.green) : C.dim }]}>
              {isOrbSharp ? (rushMode ? '⚡ TAP' : 'TAP') : orbState === 'blurry' ? 'HOLD' : ''}
            </Text>
            <TouchableOpacity
              onPressIn={e => {
                // Locks page scroll only for the instant this touch is down,
                // so a finger drifting slightly mid-tap can't have the touch
                // stolen by the page's ScrollView — see the effect above.
                onActiveChange?.(true);
                const { locationX, locationY } = e.nativeEvent;
                const maxX = Math.max(0, arenaWSV.value - PAD * 2 - VW);
                const maxY = Math.max(0, arenaHSV.value - PAD * 2 - VH);
                handleOrbTap(
                  PAD + orbNormX.value * maxX + locationX,
                  PAD + orbNormY.value * maxY + locationY,
                );
              }}
              onPressOut={() => onActiveChange?.(false)}
              activeOpacity={1}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={s.orbTouch}
            >
              <Animated.View style={orbTapScaleStyle}>
                <RocketOrb
                  size={DIFF[sessionDiffRef.current].size}
                  isSharp={isOrbSharp}
                  sharpnessSV={sharpness}
                  spawnScaleSV={spawnScaleSV}
                  flashSV={flashSV}
                />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Hit blasts + sparks (on a hit) + float text (misses only) */}
        {blasts.map(b => (
          <HitBlast key={b.id} {...b}
            onDone={() => setBlasts(p => p.filter(x => x.id !== b.id))}
          />
        ))}
        {sparks.map(sp => (
          <SparkBurst key={sp.id} {...sp}
            onDone={() => setSparks(p => p.filter(x => x.id !== sp.id))}
          />
        ))}
        {floats.map(f => (
          <FloatText key={f.id} {...f}
            onDone={() => setFloats(p => p.filter(x => x.id !== f.id))}
          />
        ))}
        {missRings.map(m => (
          <MissRing key={m.id} x={m.x} y={m.y}
            onDone={() => setMissRings(p => p.filter(x => x.id !== m.id))}
          />
        ))}

        {/* Combo popup — gated so a stale pill can never sit over the intro */}
        {gameActive && (
          <View style={s.comboWrap} pointerEvents="none">
            <Animated.View style={[s.comboPill, comboPopStyle]}>
              <Text style={s.comboText}>{comboLabel}</Text>
            </Animated.View>
          </View>
        )}

        {/* Pause overlay — blurred arena behind a centered modal. */}
        {paused && (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            style={s.pauseOverlay}
            pointerEvents="box-none"
          >
            <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={s.pauseScrim} pointerEvents="none" />
            {confirmExitOpen ? (
              <View style={s.pauseCard}>
                <View style={[s.pauseIconWrap, s.pauseIconWrapWarn]}>
                  <AlertTriangle size={20} color={C.red} strokeWidth={2.4} />
                </View>
                <Text style={s.pauseTitle}>End session?</Text>
                <Text style={s.pauseSub}>
                  Your progress on this round won&apos;t be saved.
                </Text>
                <View style={s.pauseActions}>
                  <GradientCTA
                    label="Keep Playing"
                    onPress={() => setConfirmExitOpen(false)}
                    textColor="#03212C"
                    letterSpacing={0.5}
                    height={50}
                    style={s.pauseResumeBtn}
                  />
                  <TouchableOpacity style={s.endGameBtn} onPress={endSession} activeOpacity={0.8}>
                    <LogOut size={15} color={C.red} strokeWidth={2.2} />
                    <Text style={s.endGameBtnText}>End Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={s.pauseCard}>
                <View style={s.pauseIconWrap}>
                  <Pause size={20} color={C.purpleLight} strokeWidth={2.4} />
                </View>
                <Text style={s.pauseTitle}>Paused</Text>
                {/* `pauseSession()` clears the CPU timer too, so this calm
                    copy isn't hiding anything — nothing keeps running. */}
                <Text style={s.pauseSub}>
                  Take a short breath and continue when ready.
                </Text>
                <View style={s.pauseActions}>
                  <GradientCTA
                    label="Resume"
                    onPress={resumeSession}
                    textColor="#03212C"
                    letterSpacing={0.5}
                    height={50}
                    style={s.pauseResumeBtn}
                  />
                  <TouchableOpacity style={s.restartBtn} onPress={restartSession} activeOpacity={0.8}>
                    <RotateCcw size={15} color={C.muted} strokeWidth={2.2} />
                    <Text style={s.restartBtnText}>Restart</Text>
                  </TouchableOpacity>

                  <View style={s.pauseToggleRow}>
                    <View style={s.pauseToggleLabel}>
                      {soundEnabled ? (
                        <Volume2 size={15} color={C.muted} strokeWidth={2.2} />
                      ) : (
                        <VolumeX size={15} color={C.dim} strokeWidth={2.2} />
                      )}
                      <Text style={s.pauseToggleText}>Sound</Text>
                    </View>
                    <Switch
                      value={soundEnabled}
                      onValueChange={setSoundEnabled}
                      trackColor={{ false: 'rgba(255,255,255,0.14)', true: 'rgba(0,224,255,0.55)' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="rgba(255,255,255,0.14)"
                      accessibilityLabel="Sound effects"
                    />
                  </View>
                  <View style={s.pauseToggleRow}>
                    <View style={s.pauseToggleLabel}>
                      <Vibrate size={15} color={hapticsEnabled ? C.muted : C.dim} strokeWidth={2.2} />
                      <Text style={s.pauseToggleText}>Haptics</Text>
                    </View>
                    <Switch
                      value={hapticsEnabled}
                      onValueChange={setHapticsEnabled}
                      trackColor={{ false: 'rgba(255,255,255,0.14)', true: 'rgba(0,224,255,0.55)' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="rgba(255,255,255,0.14)"
                      accessibilityLabel="Haptic feedback"
                    />
                  </View>

                  <TouchableOpacity style={s.endGameBtn} onPress={() => setConfirmExitOpen(true)} activeOpacity={0.8}>
                    <LogOut size={15} color={C.red} strokeWidth={2.2} />
                    <Text style={s.endGameBtnText}>End Session</Text>
                  </TouchableOpacity>
                  {/* Settings live only inside the pause overlay — no gear on
                      the game screen itself. Opens the same sheet as the idle
                      flow; changes apply to the *next* session. */}
                  <TouchableOpacity
                    style={s.pauseSettingsBtn}
                    onPress={() => setSettingsOpen(true)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                  >
                    <Settings2 size={15} color={C.muted} strokeWidth={2.2} />
                    <Text style={s.pauseSettingsText}>Settings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        )}

      </View>

      {/* Streak dots — pre/post-round only. During a live round the streak
          already lives in the HUD strip, so this row is hidden to keep the
          lower half of the screen clean. */}
      {!gameActive && <StreakDots streak={streak} rush={rushMode} />}

      {/* Start / replay CTA — idle only. While a round is active, "Playing ·
          mode · time" is already covered by the HUD above the arena (and by
          the pause overlay when actually paused), so this bottom card is
          gone during play rather than duplicating that same information —
          the space goes to the arena instead (see arenaH above). */}
      {!gameActive && (
        // The duration is rendered as its own line rather than GradientCTA's
        // `sublabel`, whose frozen style is 9.5px at letterSpacing 1.2 — too
        // small and too spaced out to read comfortably here. The CTA rides
        // GradientCTA's default 56px (the canonical button height).
        <View style={s.startBlock}>
          <GradientCTA
            label={sessionDone ? 'Play Again' : 'Start Session'}
            icon={<Play size={18} color="#03212C" fill="#03212C" strokeWidth={2.4} />}
            onPress={startSession}
            textColor="#03212C"
            letterSpacing={0.4}
          />
          <View style={s.startMetaRow}>
            <Clock3 size={12} color={C.dim} strokeWidth={2.2} />
            <Text style={s.startMeta}>
              {SESSION_SECS} sec · {modeLabel}
            </Text>
          </View>
        </View>
      )}

      {/* Comfort detail modal — opened by the Info icon on the comfort row.
          The full safety message lives here so the pre-game row stays one
          compact line instead of a full-width banner. */}
      <Modal
        visible={comfortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setComfortOpen(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setComfortOpen(false)}
          />
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Eye size={20} color={C.purpleLight} strokeWidth={2.2} />
            </View>
            <Text style={s.modalTitle}>Keep it comfortable</Text>
            <Text style={s.modalBody}>
              Keep the activity comfortable. Stop if you feel discomfort.
            </Text>
            <GradientCTA
              label="Got it"
              onPress={() => setComfortOpen(false)}
              textColor="#03212C"
              letterSpacing={0.5}
              style={s.modalCta}
            />
          </View>
        </View>
      </Modal>

      {/* Pre-game settings sheet — header Settings2 while idle. Reuses the
          exact same state and handlers as the inline pickers, so the two
          surfaces can never disagree and no gameplay logic is duplicated. */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={s.sheetOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSettingsOpen(false)}
          />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Game settings</Text>

            <Text style={s.sheetLabel}>DIFFICULTY</Text>
            <View style={s.modeRow}>
              {(['gentle', 'easy', 'sharp', 'elite'] as Difficulty[]).map(d => {
                const selected = diff === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => { setDiff(d); onDifficultyChange?.(d); }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[s.modeBtn, selected && s.modeBtnSelected]}
                  >
                    <Text
                      style={[s.modeBtnText, selected && s.modeBtnTextSelected]}
                      numberOfLines={1}
                    >
                      {DIFF[d].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sheetLabel}>CHALLENGE</Text>
            <View style={[s.challengeRow, raceCpu && s.challengeRowActive]}>
              <TouchableOpacity
                style={s.challengeRowTap}
                activeOpacity={0.7}
                onPress={() => { const v = !raceCpu; setRaceCpu(v); onRaceCpuChange?.(v); }}
                accessibilityRole="button"
                accessibilityState={{ selected: raceCpu }}
                accessibilityLabel="Challenge mode — race against CPU"
              >
                <Zap size={16} color={raceCpu ? C.amber : C.dim} strokeWidth={2.2} />
                <Text style={[s.challengeRowText, raceCpu && s.challengeRowTextActive]}>
                  Challenge mode
                </Text>
              </TouchableOpacity>
              <Switch
                value={raceCpu}
                onValueChange={v => { setRaceCpu(v); onRaceCpuChange?.(v); }}
                trackColor={{ false: 'rgba(255,255,255,0.14)', true: 'rgba(245,158,11,0.75)' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(255,255,255,0.14)"
                accessibilityLabel="Challenge mode — race against CPU"
              />
            </View>

            <Text style={s.sheetNote}>
              Settings apply to your next session.
            </Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, width: '100%' },

  // Compact inline comfort notice — Eye icon + short label + Info affordance.
  // One short row (the full safety message lives in the Info modal), so it
  // never reads as a full-width banner. Tapping the label dismisses it.
  comfortRow: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,224,255,0.14)',
    backgroundColor: C.card, overflow: 'hidden',
  },
  comfortMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 40, paddingHorizontal: 12,
  },
  comfortText: { fontSize: 12.5, lineHeight: 16, color: C.muted, fontWeight: '600', flexShrink: 1 },
  comfortInfoBtn: {
    width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)',
  },

  // Compact HUD — one 48dp stats strip: icon + value per stat, subtle
  // separators, no oversized text or pills. The pause button lives in the
  // host header during a round, so this strip is numbers only.
  hudRow: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'stretch', minHeight: 48,
    backgroundColor: C.card, borderRadius: 14,
    paddingVertical: 6, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  hudStat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hudSep:  { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.08)' },
  hudStatValue: {
    fontFamily: FONTS.heading, fontSize: 16, fontWeight: '800',
    color: '#f5f7fb', fontVariant: ['tabular-nums'],
  },
  hudModeText: { fontSize: 12, fontWeight: '700', color: C.muted },

  // Mode selector — one compact segmented row (labels only, no dots). Only
  // ever rendered while idle, so it never competes with the arena for space
  // during a round. Selected reads as a clean cyan border + subtle fill.
  modeRow: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  modeBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 44, paddingHorizontal: 4,
    borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: C.card,
  },
  modeBtnSelected: {
    borderColor: SELECTED_CYAN.borderColor,
    backgroundColor: SELECTED_CYAN.bg,
  },
  modeBtnText: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  modeBtnTextSelected: { color: SELECTED_CYAN.text, fontWeight: '800' },

  // Challenge Mode — compact settings row: Zap icon + label + switch. Subtle
  // by default, same neutral card language as the mode row; a thin amber tint
  // marks "on" (amber is this game's existing challenge/rush accent).
  challengeRow: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 44, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: C.card,
  },
  challengeRowActive: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.08)' },
  challengeRowTap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    alignSelf: 'stretch',
  },
  challengeRowText:       { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.72)' },
  challengeRowTextActive: { color: '#fbbf24', fontWeight: '700' },

  arena: {
    // `alignSelf: 'stretch'` instead of a fixed `ARENA_W` — the old fixed
    // width (SW - 32) was wider than this screen's padded content box
    // (SW - 48), so the arena overflowed ~8px per side.
    alignSelf: 'stretch',
    borderRadius: 30,
    backgroundColor: C.arenaBg,
    // A thin "hairline" border — the luminous read comes from the shadow
    // glow below, not border weight, for the "sci-fi focus chamber" feel
    // instead of a bordered card.
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.32)',
    overflow: 'hidden', position: 'relative',
    shadowColor: 'rgba(0,224,255,0.35)', shadowOffset: { width: 0, height: 0 },
    shadowRadius: 26, shadowOpacity: 1, elevation: 8,
  },
  // Rush stays cyan, just brighter — an intensified version of the default
  // glow rather than a different color, so the arena never reads as orange.
  arenaRushGlow: { borderColor: 'rgba(0,224,255,0.55)', borderWidth: 1.5, shadowColor: C.purple, shadowOpacity: 0.55, shadowRadius: 30, elevation: 10 },
  arenaGold:  { borderColor: C.gold,   borderWidth: 1.5, shadowColor: C.gold,   shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  arenaLow:   { borderColor: C.red,    borderWidth: 1,   shadowColor: C.red,    shadowOpacity: 0.22, shadowRadius: 10 },

  timerTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: TOPBAR_H, backgroundColor: 'rgba(255,255,255,0.04)' },
  timerFill:  { height: TOPBAR_H, borderRadius: 0 },

  // ── Immersive background (ArenaAtmosphere) ──
  atmosphereBase: { ...StyleSheet.absoluteFill, backgroundColor: '#03080c' },
  atmosphereHaze: StyleSheet.absoluteFill,
  // Pulled in from top/bottom 22% + left/right 12% — that footprint read as
  // one giant flat dark circle filling the arena. Tighter now, so it's a
  // halo around the target's usual range, not the arena's whole identity.
  atmosphereBloom: {
    position: 'absolute', top: '24%', left: '14%', right: '14%', bottom: '24%',
    borderRadius: 9999, backgroundColor: 'rgba(0,224,255,0.055)',
    shadowColor: '#00E0FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 55,
  },

  depthRings: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
  },
  // Width-relative so the rings never exceed the arena on small phones. 78%
  // of the widest realistic portrait arena still fits inside the 300px
  // minimum arena height, so nothing clips at either extreme. Barely
  // visible by design — a depth cue, never a competing shape.
  depthRing:      { position: 'absolute', borderWidth: 1, aspectRatio: 1, borderRadius: 9999 },
  // Sized up from 60/42/24% — the arena grew much taller than it is wide
  // (see arenaH), and width-relative rings that small left a visibly dead
  // gap between the rings and the target's now-tightened travel area
  // (see WAYPOINTS). Bigger + a touch brighter closes that gap while still
  // reading as a depth cue, never a competitor to the target's own halo.
  depthRingOuter: { width: '82%', borderColor: 'rgba(0,224,255,0.09)' },
  depthRingMid:   { width: '58%', borderColor: 'rgba(255,255,255,0.055)' },
  depthRingInner: { width: '32%', borderColor: 'rgba(165,180,252,0.075)' },

  // NEAR/FAR state badge — one active label, centered under the timer bar.
  // Cyan when near (tappable), muted when far; text carries the state.
  nearFarBadge: {
    position: 'absolute', top: 14, zIndex: 3,
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1,
  },
  nearFarBadgeNear: {
    borderColor: 'rgba(0,224,255,0.45)',
    backgroundColor: 'rgba(0,224,255,0.14)',
  },
  nearFarBadgeFar: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  nearFarText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  nearFarTextNear: { color: '#67e8f9' },
  nearFarTextFar: { color: 'rgba(255,255,255,0.4)' },

  // ── Pre-game intro: one absolute root, three flex zones ──
  // The inner padding the design calls for lives HERE, never on the arena
  // itself (see the arenaStyle comment).
  introRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    flexDirection: 'column',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
  },
  // The only zone that gives on short screens, so the copy below never
  // compresses; `overflow: hidden` keeps decorative glow out of the text.
  zoneVisual: { flex: 1, minHeight: 0, overflow: 'hidden' },
  zoneCopy:   { flexShrink: 0, alignItems: 'center', paddingTop: 10 },

  introInstructionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  introLine: {
    fontSize: 14.5, lineHeight: 20, fontWeight: '600',
    color: 'rgba(255,255,255,0.72)', textAlign: 'center', flexShrink: 1,
  },
  introHighlight: { color: C.green, fontWeight: '800' },

  rushBadge: {
    position: 'absolute', top: 12, left: 12, zIndex: 5,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderWidth: 1, borderColor: C.amber,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  rushBadgeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.amber },
  rushBadgeText: { fontSize: 11, fontWeight: '900', color: C.amber, letterSpacing: 1 },

  comboWrap: {
    // Below the NEAR/FAR badge so the transient combo pill never sits on
    // top of the persistent state label.
    position: 'absolute', top: 52, left: 0, right: 0, zIndex: 8,
    alignItems: 'center',
  },
  comboPill: {
    backgroundColor: 'rgba(83,74,183,0.9)', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.5)',
  },
  comboText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  // Pulled in from the old -27/-26 offsets — less overhang past the target's
  // own box means less chance of crowding the arena's rounded edge when the
  // target is near a corner waypoint.
  orbLabel: {
    position: 'absolute', top: -22, left: -24, right: -24,
    textAlign: 'center', fontSize: 13, fontWeight: '900', letterSpacing: 1.2,
    textShadowColor: 'rgba(110,231,183,0.55)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  orbTouch: { width: '100%', height: '100%' },
  rocketHalo: { position: 'absolute' },

  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
    paddingHorizontal: 22,
  },
  // Extra darkening under the blur — the blur alone lets a lot of the arena's
  // own glow through, this keeps the modal readable on top of it.
  pauseScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,4,6,0.45)' },
  pauseCard: {
    alignSelf: 'stretch', alignItems: 'center', gap: 8,
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 18,
    backgroundColor: 'rgba(6,18,26,0.92)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.22)',
  },
  pauseIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  pauseIconWrapWarn: { backgroundColor: 'rgba(226,75,74,0.12)', borderColor: 'rgba(226,75,74,0.35)' },
  pauseTitle:     { fontFamily: FONTS.heading, fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  pauseSub:       { fontSize: 12.5, lineHeight: 17, color: C.muted, fontWeight: '500', textAlign: 'center' },
  pauseActions:   { alignSelf: 'stretch', gap: 9, marginTop: 4 },
  pauseResumeBtn: { alignSelf: 'stretch' },
  restartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 100, minHeight: 44,
  },
  restartBtnText: { fontSize: 14, fontWeight: '700', color: C.muted, letterSpacing: 0.3 },
  pauseToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 40, paddingHorizontal: 4,
  },
  pauseToggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pauseToggleText: { fontSize: 13, fontWeight: '600', color: C.muted },
  endGameBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'rgba(226,75,74,0.5)',
    borderRadius: 100, minHeight: 44,
  },
  endGameBtnText: { fontSize: 14, fontWeight: '700', color: C.red, letterSpacing: 0.3 },
  pauseSettingsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 40,
  },
  pauseSettingsText: { fontSize: 13, fontWeight: '600', color: C.muted },

  startBlock: { alignSelf: 'stretch', gap: 7 },
  startMetaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  startMeta: {
    fontSize: 12.5, fontWeight: '600', color: C.muted,
    textAlign: 'center', letterSpacing: 0.2,
  },

  // ── Comfort detail modal ──
  modalOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(2,4,6,0.6)', paddingHorizontal: 28,
  },
  modalCard: {
    alignSelf: 'stretch', alignItems: 'center', gap: 10,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 20,
    backgroundColor: 'rgba(6,18,26,0.96)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.22)',
  },
  modalIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 19, fontWeight: '900', color: '#fff' },
  modalBody:  { fontSize: 13, lineHeight: 19, color: C.muted, fontWeight: '500', textAlign: 'center' },
  modalCta:   { alignSelf: 'stretch', marginTop: 4 },

  // ── Pre-game settings sheet ──
  sheetOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,4,6,0.55)',
  },
  sheet: {
    backgroundColor: '#0b1420',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26,
    borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(0,224,255,0.16)',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginBottom: 14,
  },
  sheetTitle: { fontFamily: FONTS.heading, fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 14 },
  sheetLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.4)', marginBottom: 8,
  },
  sheetNote: {
    fontSize: 11.5, lineHeight: 16, color: C.dim,
    textAlign: 'center', marginTop: 14,
  },
});
