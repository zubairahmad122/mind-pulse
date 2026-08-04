import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Accessibility, ChevronRight, Clock3, Flame, Gauge, Info, Target } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useEyeGameAccessibility } from '@/hooks/useEyeGameAccessibility';
import { useGameFeedbackPrefs } from '@/hooks/useGameFeedbackPrefs';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import {
  EMPTY_NEON_CIPHER_METRICS,
  NEON_CIPHER_DIFFICULTY_PRESETS,
  PHASE_A_DIFFICULTIES,
  applyCorrectTap,
  applyWrongTap,
  classifyTap,
  completeRound,
  computeAccuracy,
  computeAvgSearchMs,
  generateRound,
  type NeonCipherDifficulty,
  type NeonCipherMode,
  type NeonCipherSessionMetrics,
  type RoundConfig,
} from '@/utils/neonCipherEngine';
import { createSeededRandom, type SeededRandom } from '@/utils/seededRandom';
import { createSessionResultId } from '@/utils/sessionResultId';
import { NeonCipherGrid } from './NeonCipherGrid';
import { NeonCipherSymbolGlyph } from './NeonCipherSymbol';
import { NeonCipherTutorial } from './NeonCipherTutorial';
import { PauseOverlay } from './shared/PauseOverlay';
import { type GameEndStats } from './GameOverScreen';

const EYE = PILLAR_COLORS.eye;
const TUTORIAL_SEEN_KEY = '@mindpulse/neon-cipher-tutorial-seen';
const FEEDBACK_MS = 450;

const DIFFICULTY_LABEL: Record<NeonCipherDifficulty, string> = {
  gentle: 'Gentle',
  casual: 'Casual',
  sharp: 'Sharp',
  elite: 'Elite',
};

const CALM_HUNT_DURATIONS = [120, 180] as const;
const TIME_ATTACK_DURATIONS = [60, 90] as const;

/** One countdown beat — remounted per digit (keyed by value) so each number
 *  gets a fresh spring-in-and-settle instead of a static swap. */
function CountdownDigit({ value }: { value: 3 | 2 | 1 }) {
  const scale = useSharedValue(1.6);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 160 });
    ringScale.value = withTiming(1.7, { duration: 650, easing: Easing.out(Easing.cubic) });
    ringOpacity.value = withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per mount (remounted via key={value})
  }, []);

  const digitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={styles.countdownWrap}>
      <Animated.View style={[styles.countdownRing, ringStyle]} />
      <Animated.Text style={[styles.countdownText, digitStyle]}>{value}</Animated.Text>
    </View>
  );
}

/** A slow, continuous breathing glow behind the preview target — the one
 *  place motion should never fully disappear even in reduced-motion mode
 *  (it's ambient, not essential information), so it just gets calmer. */
function BreathingGlow({ children, reducedMotion }: { children: React.ReactNode; reducedMotion: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: reducedMotion ? 2400 : 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: reducedMotion ? 2400 : 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [reducedMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.25, reducedMotion ? 0.4 : 0.65]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, reducedMotion ? 1.02 : 1.08]) }],
  }));

  return (
    <View style={styles.breathingWrap}>
      <Animated.View pointerEvents="none" style={[styles.breathingGlow, glowStyle]} />
      {children}
    </View>
  );
}

type SessionPhase = 'setup' | 'tutorial' | 'countdown' | 'active';
type RoundPhase = 'preview' | 'field' | 'feedback';

export interface NeonCipherProps {
  running: boolean;
  onGameEnd: (stats: GameEndStats) => void;
  /** Raw numeric score, reported once at completion for personal-best tracking (Time Attack only). */
  onSession?: (score: number) => void;
  pauseRequest?: number;
  onRoundActiveChange?: (active: boolean) => void;
  /** Mirrors `onRoundActiveChange`'s "report state up" pattern — lets the
   *  host render the setup screen's Start CTA as its own sticky bottom bar
   *  instead of scrolling away with the rest of the setup form. Called with
   *  `null` whenever the setup screen isn't showing. */
  onSetupActionChange?: (action: { label: string; onPress: () => void } | null) => void;
}

export function NeonCipher({ running, onGameEnd, onSession, pauseRequest, onRoundActiveChange, onSetupActionChange }: NeonCipherProps) {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('setup');
  const [mode, setMode] = useState<NeonCipherMode>('time-attack');
  const [difficulty, setDifficulty] = useState<NeonCipherDifficulty>('gentle');
  const [durationSeconds, setDurationSeconds] = useState<number>(TIME_ATTACK_DURATIONS[0]);
  const [paused, setPaused] = useState(false);
  const [countdownValue, setCountdownValue] = useState<3 | 2 | 1>(3);

  const [round, setRound] = useState<RoundConfig | null>(null);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('preview');
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const [metrics, setMetrics] = useState<NeonCipherSessionMetrics>(EMPTY_NEON_CIPHER_METRICS);
  const [lastTapState, setLastTapState] = useState<'correct' | 'wrong' | null>(null);
  const [lastTappedIndex, setLastTappedIndex] = useState<number | null>(null);

  const rngRef = useRef<SeededRandom>(createSeededRandom(Date.now()));
  const roundIndexRef = useRef(0);
  const roundStartAtRef = useRef(0);
  const completedRef = useRef(false);
  const lastPauseRequestRef = useRef(pauseRequest ?? 0);

  // The host screen's shared wrapper (`gameAreaScroll` in eye-game/[id].tsx,
  // used by every game) has no `flex: 1`, so it shrinks to content instead
  // of filling the screen — relying on flex-fill from it left the arena
  // collapsed to a tiny box hugging the grid, with a dead empty stretch
  // below it. FocusSprint sidesteps this the same way: measure the window
  // directly instead of trusting an ambiguous flex chain from a shared,
  // not-mine-to-change host wrapper.
  const { height: winH } = useWindowDimensions();
  const arenaH = Math.max(360, Math.min(620, Math.round(winH * 0.5)));

  const {
    largeTarget,
    highContrast,
    reducedMotion: manualReducedMotion,
    setLargeTarget,
    setHighContrast,
    setReducedMotion,
  } = useEyeGameAccessibility();
  const osReducedMotion = useReducedMotion();
  const effectiveReducedMotion = manualReducedMotion || osReducedMotion;

  const { soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled } = useGameFeedbackPrefs();
  const { playHit, playWrong, playCountdownPulse } = useGameSounds();

  const { isBackgrounded } = useSessionLifecycle({
    onPause: () => setPaused(true),
    // Never auto-resume — the pause overlay stays up until the user taps
    // Resume themselves.
  });
  const frozen = paused || isBackgrounded || !running;

  useEffect(() => {
    onRoundActiveChange?.(sessionPhase === 'active' || sessionPhase === 'countdown');
  }, [sessionPhase, onRoundActiveChange]);

  // Re-synced on every relevant setup change (not just phase/mode) — a stale
  // closure here would carry an old difficulty/duration into `armSession`
  // once the host actually calls it.
  useEffect(() => {
    if (sessionPhase !== 'setup') {
      onSetupActionChange?.(null);
      return;
    }
    onSetupActionChange?.({
      label: mode === 'time-attack' ? 'Start Time Attack' : 'Start Calm Hunt',
      onPress: beginTutorialOrStart,
    });
    return () => onSetupActionChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- beginTutorialOrStart is redefined every render; deliberately omitted to avoid an infinite effect loop, deps below cover everything its closure reads
  }, [sessionPhase, mode, difficulty, durationSeconds, onSetupActionChange]);

  // Same ref-held-handler pattern FocusSprint uses for its own pauseRequest
  // prop — keeps the actual setState call out of the effect body itself.
  const handlePauseRequestRef = useRef(() => {});
  useEffect(() => {
    handlePauseRequestRef.current = () => {
      if (sessionPhase === 'active' || sessionPhase === 'countdown') setPaused(true);
    };
  });
  useEffect(() => {
    if (pauseRequest === undefined) return;
    if (pauseRequest !== lastPauseRequestRef.current) {
      lastPauseRequestRef.current = pauseRequest;
      handlePauseRequestRef.current();
    }
  }, [pauseRequest]);

  // ─── Session-level countdown — reused as-is, not reinvented ──────────────
  const sessionClock = useSessionClock({
    totalSeconds: durationSeconds,
    running: sessionPhase === 'active',
    paused: frozen,
    onComplete: () => finishSession(),
  });

  function finishSession() {
    if (completedRef.current) return;
    completedRef.current = true;

    const sessionResultId = createSessionResultId();
    const accuracy = computeAccuracy(metrics);
    const avgSearch = computeAvgSearchMs(metrics);
    const totalAttempts = metrics.correctTaps + metrics.wrongTaps;

    const stats: GameEndStats =
      mode === 'time-attack'
        ? {
            headline: 'Cipher Cracked',
            subline: `You scored ${metrics.score} points`,
            rating: accuracy >= 0.85 ? 3 : accuracy >= 0.6 ? 2 : 1,
            stats: [
              { label: 'Score', value: `${metrics.score}` },
              { label: 'Accuracy', value: totalAttempts > 0 ? `${Math.round(accuracy * 100)}%` : '—' },
              { label: 'Avg Search Time', value: metrics.searchTimesMs.length > 0 ? `${Math.round(avgSearch)}ms` : '—' },
              { label: 'Best Combo', value: `${metrics.bestCombo}x` },
              { label: 'Rounds Completed', value: `${metrics.roundsCompleted}` },
              { label: 'Difficulty', value: DIFFICULTY_LABEL[difficulty] },
            ],
            survived: true,
          }
        : {
            headline: 'Session Complete',
            subline: `You found ${metrics.correctTaps} of ${totalAttempts} symbols`,
            rating: accuracy >= 0.85 ? 3 : accuracy >= 0.6 ? 2 : 1,
            stats: [
              { label: 'Accuracy', value: totalAttempts > 0 ? `${Math.round(accuracy * 100)}%` : '—' },
              { label: 'Rounds Completed', value: `${metrics.roundsCompleted}` },
              { label: 'Difficulty', value: DIFFICULTY_LABEL[difficulty] },
            ],
            survived: true,
          };

    // sessionResultId isn't threaded further yet — the host's own
    // onGameEnd/submit path doesn't take one today (see gameRecords.ts).
    // Generating and discarding it here still documents the contract this
    // completion path is built against, ready for the host to adopt.
    void sessionResultId;

    onGameEnd(stats);
    if (mode === 'time-attack') onSession?.(metrics.score);
  }

  // ─── Round preview beat ───────────────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase !== 'active' || roundPhase !== 'preview' || frozen || !round) return;
    const preset = NEON_CIPHER_DIFFICULTY_PRESETS[difficulty];
    // A pause during preview restarts the preview beat on resume rather than
    // resuming mid-countdown — never a penalty (a slightly longer preview,
    // never a shorter one), and far simpler than tracking a second
    // pause-aware clock for a sub-2-second beat.
    const t = setTimeout(() => {
      setRoundPhase('field');
      roundStartAtRef.current = Date.now();
    }, preset.previewMs);
    return () => clearTimeout(t);
  }, [sessionPhase, roundPhase, frozen, round, difficulty]);

  // ─── Feedback beat → next round (or next sequence target) ────────────────
  useEffect(() => {
    if (roundPhase !== 'feedback' || frozen) return;
    const t = setTimeout(() => {
      setLastTapState(null);
      setLastTappedIndex(null);
      if (round && sequenceProgress > 0 && sequenceProgress < round.sequence.length) {
        setRoundPhase('field');
        roundStartAtRef.current = Date.now();
      } else {
        advanceToNextRound();
      }
    }, FEEDBACK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advanceToNextRound reads current refs/state intentionally, not a dep
  }, [roundPhase, frozen, round, sequenceProgress]);

  function advanceToNextRound() {
    roundIndexRef.current += 1;
    setRound(generateRound(rngRef.current, difficulty, roundIndexRef.current));
    setSequenceProgress(0);
    setRoundPhase('preview');
  }

  function handleTapCell(index: number) {
    if (sessionPhase !== 'active' || roundPhase !== 'field' || frozen || !round) return;
    const preset = NEON_CIPHER_DIFFICULTY_PRESETS[difficulty];
    const classification = classifyTap(round, index, sequenceProgress);
    const searchMs = Date.now() - roundStartAtRef.current;

    if (classification === 'correct') {
      if (soundEnabled) playHit();
      if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLastTapState('correct');
      setLastTappedIndex(index);
      const nextProgress = sequenceProgress + 1;
      setMetrics(m => applyCorrectTap(m, mode, difficulty, searchMs, preset.searchBudgetMs));
      if (nextProgress >= round.sequence.length) {
        setMetrics(m => completeRound(m));
      }
      setSequenceProgress(nextProgress);
      setRoundPhase('feedback');
    } else {
      if (soundEnabled) playWrong();
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLastTapState('wrong');
      setLastTappedIndex(index);
      setMetrics(m => completeRound(applyWrongTap(m, mode, difficulty)));
      setSequenceProgress(0);
      setRoundPhase('feedback');
    }
  }

  // ─── Countdown (3-2-1) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase !== 'countdown' || frozen) return;
    if (soundEnabled) playCountdownPulse(countdownValue);
    const t = setTimeout(() => {
      if (countdownValue === 1) {
        setSessionPhase('active');
      } else {
        setCountdownValue(prev => (prev - 1) as 2 | 1);
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playCountdownPulse identity churns every render; deliberately omitted
  }, [sessionPhase, countdownValue, frozen]);

  function beginTutorialOrStart() {
    AsyncStorage.getItem(TUTORIAL_SEEN_KEY)
      .then(seen => {
        setSessionPhase(seen ? 'countdown' : 'tutorial');
        if (!seen) return;
        armSession();
      })
      .catch(() => armSession());
  }

  function armSession() {
    completedRef.current = false;
    rngRef.current = createSeededRandom(Date.now());
    roundIndexRef.current = 0;
    setMetrics(EMPTY_NEON_CIPHER_METRICS);
    setRound(generateRound(rngRef.current, difficulty, 0));
    setSequenceProgress(0);
    setRoundPhase('preview');
    setCountdownValue(3);
    setSessionPhase('countdown');
  }

  function handleTutorialDone() {
    void AsyncStorage.setItem(TUTORIAL_SEEN_KEY, '1').catch(() => {});
    armSession();
  }

  function handleRestart() {
    setPaused(false);
    armSession();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (sessionPhase === 'setup') {
    return (
      <SetupScreen
        mode={mode}
        onModeChange={setMode}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        durationSeconds={durationSeconds}
        onDurationChange={setDurationSeconds}
        largeTarget={largeTarget}
        onToggleLargeTarget={setLargeTarget}
        highContrast={highContrast}
        onToggleHighContrast={setHighContrast}
        reducedMotion={manualReducedMotion}
        onToggleReducedMotion={setReducedMotion}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={setHapticsEnabled}
      />
    );
  }

  if (sessionPhase === 'tutorial') {
    return <NeonCipherTutorial onComplete={handleTutorialDone} onSkip={handleTutorialDone} />;
  }

  if (sessionPhase === 'countdown') {
    return <CountdownDigit key={countdownValue} value={countdownValue} />;
  }

  // 'active'
  const preset = NEON_CIPHER_DIFFICULTY_PRESETS[difficulty];

  return (
    <View style={styles.activeWrap}>
      <View style={styles.hud}>
        <View style={styles.hudPill}>
          <Clock3 size={14} color={colors.text.secondary} />
          <Text style={styles.hudText}>{sessionClock.secondsLeft}s</Text>
        </View>
        {mode === 'time-attack' && (
          <>
            <View style={styles.hudPill}>
              <Target size={14} color={colors.text.secondary} />
              <Text style={styles.hudText}>{metrics.score}</Text>
            </View>
            <View style={[styles.hudPill, metrics.combo > 0 && styles.hudPillActive]}>
              <Flame size={14} color={metrics.combo > 0 ? EYE : colors.text.secondary} />
              <Text style={[styles.hudText, metrics.combo > 0 && styles.hudTextActive]}>{metrics.combo}x</Text>
            </View>
          </>
        )}
        <View style={styles.hudPill}>
          <Gauge size={14} color={colors.text.secondary} />
          <Text style={styles.hudText}>{DIFFICULTY_LABEL[difficulty]}</Text>
        </View>
        {round && round.sequence.length > 1 && (
          <Text style={styles.hudSequence}>
            {sequenceProgress + 1} of {round.sequence.length}
          </Text>
        )}
      </View>

      <View style={[styles.canvas, { height: arenaH }]}>
        {round && roundPhase === 'preview' && (
          <View style={styles.previewWrap}>
            <Text style={styles.previewLabel}>Find this</Text>
            <View style={styles.previewRow}>
              {round.sequence.map((s, i) => (
                <BreathingGlow key={i} reducedMotion={effectiveReducedMotion}>
                  <NeonCipherSymbolGlyph spec={s} size={largeTarget ? 110 : 90} state="correct" highContrast={highContrast} />
                </BreathingGlow>
              ))}
            </View>
          </View>
        )}

        {round && (roundPhase === 'field' || roundPhase === 'feedback') && (
          <NeonCipherGrid
            cells={round.grid}
            gridSize={preset.gridSize}
            disabled={roundPhase !== 'field'}
            largeTarget={largeTarget}
            highContrast={highContrast}
            reducedMotion={effectiveReducedMotion}
            cellStates={
              roundPhase === 'feedback' && lastTapState && lastTappedIndex !== null
                ? { [lastTappedIndex]: lastTapState }
                : undefined
            }
            onTapCell={handleTapCell}
          />
        )}
      </View>

      <PauseOverlay
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={handleRestart}
        onExit={() => {
          setPaused(false);
          finishSession();
        }}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={setHapticsEnabled}
        largeTarget={largeTarget}
        onToggleLargeTarget={setLargeTarget}
        highContrast={highContrast}
        onToggleHighContrast={setHighContrast}
        reducedMotion={manualReducedMotion}
        onToggleReducedMotion={setReducedMotion}
      />
    </View>
  );
}

// ─── Setup screen ────────────────────────────────────────────────────────────

interface SetupProps {
  mode: NeonCipherMode;
  onModeChange: (m: NeonCipherMode) => void;
  difficulty: NeonCipherDifficulty;
  onDifficultyChange: (d: NeonCipherDifficulty) => void;
  durationSeconds: number;
  onDurationChange: (s: number) => void;
  largeTarget: boolean;
  onToggleLargeTarget: (v: boolean) => void;
  highContrast: boolean;
  onToggleHighContrast: (v: boolean) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (v: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: (v: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (v: boolean) => void;
}

const MODE_OPTIONS: { value: NeonCipherMode; label: string }[] = [
  { value: 'calm-hunt', label: 'Calm Hunt' },
  { value: 'time-attack', label: 'Time Attack' },
];

const DIFFICULTY_OPTIONS: { value: NeonCipherDifficulty; label: string }[] = PHASE_A_DIFFICULTIES.map(d => ({
  value: d,
  label: DIFFICULTY_LABEL[d],
}));

function durationLabel(mode: NeonCipherMode, seconds: number): string {
  return mode === 'time-attack' ? `${seconds} sec` : `${Math.round(seconds / 60)} min`;
}

function SetupScreen({
  mode,
  onModeChange,
  difficulty,
  onDifficultyChange,
  durationSeconds,
  onDurationChange,
  largeTarget,
  onToggleLargeTarget,
  highContrast,
  onToggleHighContrast,
  reducedMotion,
  onToggleReducedMotion,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
}: SetupProps) {
  const [a11ySheetOpen, setA11ySheetOpen] = useState(false);
  const durationOptions = (mode === 'time-attack' ? TIME_ATTACK_DURATIONS : CALM_HUNT_DURATIONS).map(s => ({
    value: s,
    label: durationLabel(mode, s),
  }));

  function handleModeChange(next: NeonCipherMode) {
    if (next === mode) return;
    onModeChange(next);
    onDurationChange(next === 'time-attack' ? TIME_ATTACK_DURATIONS[0] : CALM_HUNT_DURATIONS[0]);
  }

  const a11yParts: string[] = [];
  if (largeTarget) a11yParts.push('Large symbols');
  if (highContrast) a11yParts.push('High contrast');
  if (reducedMotion) a11yParts.push('Reduced motion');
  if (!soundEnabled) a11yParts.push('Sound off');
  if (!hapticsEnabled) a11yParts.push('Haptics off');
  const a11ySummary = a11yParts.length > 0 ? a11yParts.join(' · ') : 'Default settings';

  const modeLabel = mode === 'calm-hunt' ? 'Calm Hunt' : 'Time Attack';
  const sessionSummary = `${modeLabel} · ${DIFFICULTY_LABEL[difficulty]} · ${durationLabel(mode, durationSeconds)}`;

  return (
    <View style={styles.setupWrap}>
      <View style={styles.howToRow}>
        <Info size={16} color={EYE} strokeWidth={2.2} />
        <Text style={styles.howToText}>Preview the symbol, then find its match.</Text>
      </View>

      <Text style={styles.compactLabel}>Mode</Text>
      <SegmentedControl value={mode} onChange={handleModeChange} options={MODE_OPTIONS} accessibilityLabelSuffix="mode" />

      <Text style={styles.compactLabel}>Difficulty</Text>
      <SegmentedControl
        value={difficulty}
        onChange={onDifficultyChange}
        options={DIFFICULTY_OPTIONS}
        accessibilityLabelSuffix="difficulty"
      />

      <Text style={styles.compactLabel}>Duration</Text>
      <SegmentedControl
        value={durationSeconds}
        onChange={onDurationChange}
        options={durationOptions}
        accessibilityLabelSuffix="duration"
      />

      <View style={styles.summaryPill}>
        <Text style={styles.summaryText}>{sessionSummary}</Text>
      </View>

      <TouchableOpacity
        style={styles.a11ySummaryRow}
        onPress={() => setA11ySheetOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Accessibility settings. ${a11ySummary}`}
      >
        <View style={styles.a11yIconBadge}>
          <Accessibility size={16} color={EYE} strokeWidth={2.2} />
        </View>
        <View style={styles.a11yTextWrap}>
          <Text style={styles.a11yTitle}>Accessibility</Text>
          <Text style={styles.a11ySummaryText} numberOfLines={1}>{a11ySummary}</Text>
        </View>
        <ChevronRight size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      <AccessibilitySheet
        visible={a11ySheetOpen}
        onClose={() => setA11ySheetOpen(false)}
        largeTarget={largeTarget}
        onToggleLargeTarget={onToggleLargeTarget}
        highContrast={highContrast}
        onToggleHighContrast={onToggleHighContrast}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={onToggleReducedMotion}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={onToggleHaptics}
      />
    </View>
  );
}

/** Compact segmented control — single rounded track, `flex: 1` segments,
 *  minimum 48dp touch targets. Generic over the option value so it drives
 *  string (mode/difficulty) and numeric (duration) choices alike. */
function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  accessibilityLabelSuffix,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  accessibilityLabelSuffix: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label} ${accessibilityLabelSuffix}`}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AccessibilityRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.a11yRow}>
      <Text style={styles.a11yLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.14)', true: EYE + 'B0' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="rgba(255,255,255,0.14)"
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Bottom sheet holding every accessibility/feedback toggle — kept off the
 *  paywall entirely (spec: never gate accessibility) and out of the main
 *  setup form so the compact summary row above is the only always-visible
 *  trace of it. */
function AccessibilitySheet({
  visible,
  onClose,
  largeTarget,
  onToggleLargeTarget,
  highContrast,
  onToggleHighContrast,
  reducedMotion,
  onToggleReducedMotion,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
}: {
  visible: boolean;
  onClose: () => void;
  largeTarget: boolean;
  onToggleLargeTarget: (v: boolean) => void;
  highContrast: boolean;
  onToggleHighContrast: (v: boolean) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (v: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: (v: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (v: boolean) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Accessibility</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.sheetClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <AccessibilityRow label="Large symbols" value={largeTarget} onValueChange={onToggleLargeTarget} />
          <AccessibilityRow label="High contrast" value={highContrast} onValueChange={onToggleHighContrast} />
          <AccessibilityRow label="Reduced motion" value={reducedMotion} onValueChange={onToggleReducedMotion} />
          <AccessibilityRow label="Sound" value={soundEnabled} onValueChange={onToggleSound} />
          <AccessibilityRow label="Haptics" value={hapticsEnabled} onValueChange={onToggleHaptics} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  setupWrap: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  howToRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: spacing.md,
  },
  howToText: { flex: 1, fontFamily: FONTS.body, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  compactLabel: {
    fontFamily: FONTS.bodySemi, fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.text.secondary,
    marginTop: spacing.md, marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row', gap: 3,
    padding: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  segmentBtn: {
    flex: 1, minHeight: 48,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1, borderColor: 'transparent',
  },
  segmentBtnActive: { backgroundColor: EYE + '1E', borderColor: EYE + '55' },
  segmentText: { fontFamily: FONTS.bodySemi, fontSize: 13, color: colors.text.secondary },
  segmentTextActive: { color: EYE },
  summaryPill: {
    alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: EYE + '14',
    borderWidth: 1, borderColor: EYE + '30',
    marginTop: spacing.sm, marginBottom: spacing.md,
  },
  summaryText: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: EYE },
  a11ySummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 56,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  a11yIconBadge: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: EYE + '16',
    alignItems: 'center', justifyContent: 'center',
  },
  a11yTextWrap: { flex: 1 },
  a11yTitle: { fontFamily: FONTS.bodySemi, fontSize: 14, color: '#FFFFFF' },
  a11ySummaryText: { fontFamily: FONTS.body, fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  a11yRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, minHeight: 48 },
  a11yLabel: { fontFamily: FONTS.body, fontSize: 14, color: '#FFFFFF' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: '#11162a',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg, paddingTop: 10,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontFamily: FONTS.headingSemi, fontSize: 17, color: '#FFFFFF' },
  sheetClose: { fontFamily: FONTS.bodySemi, fontSize: 14, color: EYE, paddingVertical: 4, paddingHorizontal: 4 },
  countdownWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  countdownRing: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 2, borderColor: EYE,
  },
  countdownText: {
    fontFamily: FONTS.heading, fontSize: 72, color: EYE,
    textShadowColor: EYE, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  breathingWrap: { alignItems: 'center', justifyContent: 'center' },
  breathingGlow: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: EYE,
    // Soft radial-ish falloff via a heavy blur substitute — RN has no
    // native radial gradient primitive here, so a low-opacity solid disc
    // behind the symbol reads as a glow without pulling in Skia for one
    // effect.
    opacity: 0.3,
  },
  activeWrap: { flex: 1, paddingHorizontal: spacing.md },
  hud: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  hudPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, minHeight: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  hudPillActive: { backgroundColor: EYE + '16', borderColor: EYE + '40' },
  hudText: { fontFamily: FONTS.bodySemi, fontSize: 13, color: '#FFFFFF' },
  hudTextActive: { color: EYE },
  hudSequence: { fontFamily: FONTS.bodySemi, fontSize: 12, color: colors.text.secondary, marginLeft: 'auto' },
  canvas: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderRadius: 28,
    backgroundColor: '#06121a',
    borderWidth: 1, borderColor: EYE + '52',
    overflow: 'hidden',
    shadowColor: EYE, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowOpacity: 0.28,
  },
  previewWrap: { alignItems: 'center', gap: spacing.md },
  previewLabel: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#FFFFFF' },
  previewRow: { flexDirection: 'row', gap: spacing.md },
});
