import * as Haptics from 'expo-haptics';
import { Clock3, Flame, Radio, Target, Zap } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { useEyeGameAccessibility } from '@/hooks/useEyeGameAccessibility';
import { useGameFeedbackPrefs } from '@/hooks/useGameFeedbackPrefs';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { classifyTap, generateRound, type RoundConfig } from '@/utils/neonCipherEngine';
import {
  classifyPathLockTap,
  generatePathLockRound,
  pointsForPathLockTap,
  type PathLockRound,
} from '@/utils/pathLockEngine';
import {
  PERIPHERAL_EXPIRY_MS,
  classifyPeripheralTap,
  generatePeripheralRound,
  pointsForPeripheralTap,
  type PeripheralRound,
} from '@/utils/peripheralAlertEngine';
import {
  classifyPulseTap,
  generatePulseRound,
  isPulseInputExpired,
  pointsForPulseTap,
  type PulseRound,
} from '@/utils/pulseSwitchEngine';
import {
  BOSS_WAVE_POINT_MULTIPLIER,
  CIPHER_SCAN_BASE_POINTS,
  CIPHER_SCAN_PREVIEW_MS,
  EMPTY_MISSION_METRICS,
  INTRO_DURATION_SECONDS,
  MISSION_DURATION_SECONDS,
  MVP_STAGE_SEQUENCE,
  STAGE_DURATION_SECONDS,
  applyMissionCorrect,
  applyMissionWrong,
  computeMissionAccuracy,
  computeMissionRating,
  generateBossWaveRound,
  type BossWavePhase,
  type BossWaveRound,
  type MissionMetrics,
  type SignalOpsStage,
} from '@/utils/signalOpsEngine';
import { createSeededRandom, type SeededRandom } from '@/utils/seededRandom';
import { createSessionResultId } from '@/utils/sessionResultId';
import { NeonCipherGrid } from './NeonCipherGrid';
import { NeonCipherSymbolGlyph } from './NeonCipherSymbol';
import { PathLockTarget } from './PathLockTarget';
import { PeripheralAlertField } from './PeripheralAlertField';
import { PulseSwitchNodes } from './PulseSwitchNodes';
import { PauseOverlay } from './shared/PauseOverlay';
import { type GameEndStats } from './GameOverScreen';

const EYE = PILLAR_COLORS.eye;
const FEEDBACK_MS = 420;
const STAGE_BANNER_MS = 900;

/** The full mission timeline — 'intro' is a non-scoring lock-on beat, not a
 *  SignalOpsStage (it produces no metrics). */
type LiveStage = 'intro' | SignalOpsStage;
const LIVE_STAGE_SEQUENCE: LiveStage[] = ['intro', ...MVP_STAGE_SEQUENCE];

const STAGE_LABEL: Record<LiveStage, string> = {
  intro: 'Signal Lock',
  'cipher-scan': 'Cipher Scan',
  'pulse-switch': 'Pulse Switch',
  'peripheral-alert': 'Peripheral Alert',
  'path-lock': 'Path Lock',
  'boss-wave': 'Boss Wave',
};

function stageDurationSeconds(stage: LiveStage): number {
  return stage === 'intro' ? INTRO_DURATION_SECONDS : STAGE_DURATION_SECONDS[stage];
}

type SessionPhase = 'setup' | 'countdown' | 'live';
type RoundPhase = 'preview' | 'active' | 'feedback';

export interface SignalOpsProps {
  running: boolean;
  onGameEnd: (stats: GameEndStats) => void;
  onSession?: (score: number) => void;
  pauseRequest?: number;
  onRoundActiveChange?: (active: boolean) => void;
}

export function SignalOps({ running, onGameEnd, onSession, pauseRequest, onRoundActiveChange }: SignalOpsProps) {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('setup');
  const [countdownValue, setCountdownValue] = useState<3 | 2 | 1>(3);
  const [paused, setPaused] = useState(false);

  const [liveStageIdx, setLiveStageIdx] = useState(0);
  const liveStage = LIVE_STAGE_SEQUENCE[liveStageIdx];
  const [roundIdx, setRoundIdx] = useState(0);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('preview');
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const [showStageBanner, setShowStageBanner] = useState(true);

  const [cipherRound, setCipherRound] = useState<RoundConfig | null>(null);
  const [pulseRound, setPulseRound] = useState<PulseRound | null>(null);
  const [pulsePlaybackStep, setPulsePlaybackStep] = useState(0);
  const [pulsePlaybackIndex, setPulsePlaybackIndex] = useState<number | null>(null);
  const [peripheralRound, setPeripheralRound] = useState<PeripheralRound | null>(null);
  const [pathLockRound, setPathLockRound] = useState<PathLockRound | null>(null);
  const [bossRound, setBossRound] = useState<BossWaveRound | null>(null);
  const [bossPhase, setBossPhase] = useState<BossWavePhase>('pulse');

  const [lastTapState, setLastTapState] = useState<'correct' | 'wrong' | null>(null);
  const [lastTappedIndex, setLastTappedIndex] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<MissionMetrics>(EMPTY_MISSION_METRICS);

  const rngRef = useRef<SeededRandom>(createSeededRandom(0));
  const roundStartAtRef = useRef(0);
  const pathLockStageStartRef = useRef(0);
  const completedRef = useRef(false);
  const lastPauseRequestRef = useRef(pauseRequest ?? 0);

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

  const { isBackgrounded } = useSessionLifecycle({ onPause: () => setPaused(true) });
  const frozen = paused || isBackgrounded || !running;

  const { height: winH } = useWindowDimensions();
  const arenaH = Math.max(360, Math.min(620, Math.round(winH * 0.5)));

  useEffect(() => {
    onRoundActiveChange?.(sessionPhase === 'live' || sessionPhase === 'countdown');
  }, [sessionPhase, onRoundActiveChange]);

  const handlePauseRequestRef = useRef(() => {});
  useEffect(() => {
    handlePauseRequestRef.current = () => {
      if (sessionPhase === 'live' || sessionPhase === 'countdown') setPaused(true);
    };
  });
  useEffect(() => {
    if (pauseRequest === undefined) return;
    if (pauseRequest !== lastPauseRequestRef.current) {
      lastPauseRequestRef.current = pauseRequest;
      handlePauseRequestRef.current();
    }
  }, [pauseRequest]);

  // ─── Mission-level clock — absolute fallback in case stage clocks overrun ──
  const missionClock = useSessionClock({
    totalSeconds: MISSION_DURATION_SECONDS,
    running: sessionPhase === 'live',
    paused: frozen,
    onComplete: () => finishMission(),
  });

  // ─── Stage-level clock — drives stage advancement. One instance, reset via
  // resetKey whenever the stage changes. This is what makes Path Lock's
  // continuous mechanic work with the same architecture as the discrete-round
  // stages: its "round" just keeps running until this clock ends it. ───────
  const stageClock = useSessionClock({
    totalSeconds: stageDurationSeconds(liveStage),
    running: sessionPhase === 'live',
    paused: frozen,
    resetKey: liveStageIdx,
    onComplete: () => advanceLiveStage(),
  });

  function finishMission() {
    if (completedRef.current) return;
    completedRef.current = true;
    void createSessionResultId();

    const accuracy = computeMissionAccuracy(metrics);
    const rating = computeMissionRating(metrics);
    const totalAttempts = metrics.correctTaps + metrics.wrongTaps;

    const stats: GameEndStats = {
      headline: 'Mission Complete',
      subline: `You scored ${metrics.score} points`,
      rating,
      stats: [
        { label: 'Score', value: `${metrics.score}` },
        { label: 'Accuracy', value: totalAttempts > 0 ? `${Math.round(accuracy * 100)}%` : '—' },
        { label: 'Best Combo', value: `${metrics.bestCombo}x` },
        { label: 'Energy Remaining', value: `${metrics.energy}%` },
        { label: 'Stars', value: `${rating} / 3` },
        { label: 'Cipher Scan', value: `${metrics.stageResults['cipher-scan'].correct} hits` },
        { label: 'Pulse Switch', value: `${metrics.stageResults['pulse-switch'].correct} hits` },
        { label: 'Peripheral Alert', value: `${metrics.stageResults['peripheral-alert'].correct} hits` },
        { label: 'Path Lock', value: `${metrics.stageResults['path-lock'].correct} hits` },
        { label: 'Boss Wave', value: `${metrics.stageResults['boss-wave'].correct} hits` },
      ],
      survived: true,
    };

    onGameEnd(stats);
    onSession?.(metrics.score);
  }

  // ─── Stage setup ────────────────────────────────────────────────────────────
  function startStageRound(stage: LiveStage, nextRoundIdx: number) {
    setRoundIdx(nextRoundIdx);
    setSequenceProgress(0);
    setLastTapState(null);
    setLastTappedIndex(null);

    if (stage === 'intro') {
      setRoundPhase('preview');
      return;
    }
    if (stage === 'cipher-scan') {
      setCipherRound(generateRound(rngRef.current, 'gentle', nextRoundIdx));
      setRoundPhase('preview');
    } else if (stage === 'pulse-switch') {
      setPulseRound(generatePulseRound(rngRef.current, nextRoundIdx));
      setPulsePlaybackStep(0);
      setPulsePlaybackIndex(null);
      setRoundPhase('preview');
    } else if (stage === 'peripheral-alert') {
      setPeripheralRound(generatePeripheralRound(rngRef.current, nextRoundIdx));
      roundStartAtRef.current = Date.now();
      setRoundPhase('active');
    } else if (stage === 'path-lock') {
      setPathLockRound(generatePathLockRound(rngRef.current, 0));
      pathLockStageStartRef.current = Date.now();
      setRoundPhase('active');
    } else if (stage === 'boss-wave') {
      setBossRound(generateBossWaveRound(rngRef.current, nextRoundIdx));
      setBossPhase('pulse');
      setPulsePlaybackStep(0);
      setPulsePlaybackIndex(null);
      setRoundPhase('preview');
    }
  }

  function armMission() {
    completedRef.current = false;
    rngRef.current = createSeededRandom(Date.now());
    setMetrics(EMPTY_MISSION_METRICS);
    setLiveStageIdx(0);
    setShowStageBanner(true);
    startStageRound('intro', 0);
    setCountdownValue(3);
    setSessionPhase('countdown');
  }

  function advanceLiveStage() {
    const nextIdx = liveStageIdx + 1;
    if (nextIdx >= LIVE_STAGE_SEQUENCE.length) {
      finishMission();
      return;
    }
    setLiveStageIdx(nextIdx);
    setShowStageBanner(true);
    startStageRound(LIVE_STAGE_SEQUENCE[nextIdx], 0);
  }

  function advanceRoundWithinStage() {
    startStageRound(liveStage, roundIdx + 1);
  }

  // ─── Intro beat — auto-advances, tap anywhere to skip ──────────────────────
  useEffect(() => {
    if (sessionPhase !== 'live' || liveStage !== 'intro' || frozen) return;
    const t = setTimeout(() => advanceLiveStage(), (INTRO_DURATION_SECONDS - 1) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advanceLiveStage reads current state intentionally
  }, [sessionPhase, liveStage, frozen]);

  // ─── Cipher Scan / Boss-Wave-pulse-phase preview beat (fixed timing) ──────
  useEffect(() => {
    if (sessionPhase !== 'live' || roundPhase !== 'preview' || frozen) return;
    if (liveStage === 'pulse-switch' || (liveStage === 'boss-wave' && bossPhase === 'pulse')) return; // playback-step driven below
    if (liveStage !== 'cipher-scan') return;
    const t = setTimeout(() => {
      setRoundPhase('active');
      roundStartAtRef.current = Date.now();
    }, CIPHER_SCAN_PREVIEW_MS);
    return () => clearTimeout(t);
  }, [sessionPhase, roundPhase, frozen, liveStage, bossPhase]);

  // ─── Pulse Switch (and Boss Wave's pulse phase) sequence playback ─────────
  const lightUpStepRef = useRef(() => {});
  useEffect(() => {
    lightUpStepRef.current = () => {
      if (!pulseRound || pulsePlaybackStep >= pulseRound.sequence.length) return;
      setPulsePlaybackIndex(pulseRound.sequence[pulsePlaybackStep]);
    };
  });
  useEffect(() => {
    const inPulsePhase = liveStage === 'pulse-switch' || (liveStage === 'boss-wave' && bossPhase === 'pulse');
    if (sessionPhase !== 'live' || !inPulsePhase || roundPhase !== 'preview' || frozen || !pulseRound) return;
    if (pulsePlaybackStep >= pulseRound.sequence.length) return;
    lightUpStepRef.current();
    const t = setTimeout(() => {
      const nextStep = pulsePlaybackStep + 1;
      if (nextStep >= pulseRound.sequence.length) {
        setPulsePlaybackIndex(null);
        setRoundPhase('active');
        roundStartAtRef.current = Date.now();
      } else {
        setPulsePlaybackStep(nextStep);
      }
    }, 460);
    return () => clearTimeout(t);
  }, [sessionPhase, liveStage, bossPhase, roundPhase, frozen, pulseRound, pulsePlaybackStep]);

  // ─── Pulse Switch input-budget expiry (timing pressure) ───────────────────
  useEffect(() => {
    const inPulsePhase = liveStage === 'pulse-switch' || (liveStage === 'boss-wave' && bossPhase === 'pulse');
    if (sessionPhase !== 'live' || !inPulsePhase || roundPhase !== 'active' || frozen || !pulseRound) return;
    const t = setTimeout(() => {
      registerWrong(-1);
    }, Math.max(0, pulseRound.inputBudgetMs - (Date.now() - roundStartAtRef.current)));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registerWrong reads current state intentionally
  }, [sessionPhase, liveStage, bossPhase, roundPhase, frozen, pulseRound]);

  // ─── Peripheral Alert (and Boss Wave's peripheral phase) expiry ───────────
  useEffect(() => {
    const inPeripheralPhase = liveStage === 'peripheral-alert' || (liveStage === 'boss-wave' && bossPhase === 'peripheral');
    if (sessionPhase !== 'live' || !inPeripheralPhase || roundPhase !== 'active' || frozen || !peripheralRound) return;
    const t = setTimeout(() => {
      registerWrong(-1);
    }, Math.max(0, peripheralRound.expiryMs - (Date.now() - roundStartAtRef.current)));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registerWrong reads current state intentionally
  }, [sessionPhase, liveStage, bossPhase, roundPhase, frozen, peripheralRound]);

  // ─── Path Lock (and Boss Wave's lock phase) — one lock-window timeout ─────
  useEffect(() => {
    const inLockPhase = liveStage === 'path-lock' || (liveStage === 'boss-wave' && bossPhase === 'lock');
    if (sessionPhase !== 'live' || !inLockPhase || roundPhase !== 'active' || frozen) return;
    if (liveStage === 'path-lock') return; // continuous — no single-shot timeout, runs for the whole stage
    if (!bossRound) return;
    const elapsedInPhase = Date.now() - roundStartAtRef.current;
    const remaining = bossRound.pathLock.cycleMs - elapsedInPhase;
    const t = setTimeout(() => registerWrong(-1), Math.max(0, remaining));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registerWrong reads current state intentionally
  }, [sessionPhase, liveStage, bossPhase, roundPhase, frozen, bossRound]);

  // ─── Stage banner auto-hide ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showStageBanner || frozen) return;
    const t = setTimeout(() => setShowStageBanner(false), STAGE_BANNER_MS);
    return () => clearTimeout(t);
  }, [showStageBanner, frozen, liveStageIdx]);

  // ─── Feedback beat → next tap-in-sequence, next boss phase, or next round ──
  useEffect(() => {
    if (roundPhase !== 'feedback' || frozen) return;
    const t = setTimeout(() => {
      setLastTapState(null);
      setLastTappedIndex(null);

      if (liveStage === 'boss-wave') {
        advanceBossPhaseOrRound();
        return;
      }
      if (liveStage === 'cipher-scan' || liveStage === 'peripheral-alert') {
        advanceRoundWithinStage();
        return;
      }
      if (liveStage === 'pulse-switch') {
        if (sequenceProgress > 0 && pulseRound && sequenceProgress < pulseRound.sequence.length) {
          setRoundPhase('active');
          roundStartAtRef.current = Date.now();
        } else {
          advanceRoundWithinStage();
        }
      }
    }, FEEDBACK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads current stage/round state intentionally
  }, [roundPhase, frozen]);

  function advanceBossPhaseOrRound() {
    if (bossPhase === 'pulse') {
      setBossPhase('peripheral');
      setSequenceProgress(0);
      roundStartAtRef.current = Date.now();
      setRoundPhase('active');
    } else if (bossPhase === 'peripheral') {
      setBossPhase('lock');
      roundStartAtRef.current = Date.now();
      setRoundPhase('active');
    } else {
      advanceRoundWithinStage();
    }
  }

  // ─── Tap handlers ────────────────────────────────────────────────────────
  function registerCorrect(points: number, index: number, complete: boolean) {
    if (soundEnabled) playHit();
    if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const stage = (liveStage === 'intro' ? 'cipher-scan' : liveStage) as SignalOpsStage;
    const scaled = liveStage === 'boss-wave' ? Math.round(points * BOSS_WAVE_POINT_MULTIPLIER) : points;
    setMetrics(m => applyMissionCorrect(m, stage, scaled));
    setLastTapState('correct');
    setLastTappedIndex(index);
    if (!complete) {
      setSequenceProgress(p => p + 1);
      setRoundPhase('feedback');
      return;
    }
    setSequenceProgress(p => p + 1);
    setRoundPhase('feedback');
  }

  function registerWrong(index: number) {
    if (soundEnabled) playWrong();
    if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const stage = (liveStage === 'intro' ? 'cipher-scan' : liveStage) as SignalOpsStage;
    setMetrics(m => applyMissionWrong(m, stage));
    setLastTapState('wrong');
    setLastTappedIndex(index);
    setSequenceProgress(0);
    setRoundPhase('feedback');
  }

  function handleCipherTap(index: number) {
    if (roundPhase !== 'active' || frozen || !cipherRound) return;
    const classification = classifyTap(cipherRound, index, 0);
    if (classification === 'correct') registerCorrect(CIPHER_SCAN_BASE_POINTS, index, true);
    else registerWrong(index);
  }

  function handlePulseTap(nodeIndex: number) {
    if (roundPhase !== 'active' || frozen || !pulseRound) return;
    if (isPulseInputExpired(pulseRound, Date.now() - roundStartAtRef.current)) return;
    const classification = classifyPulseTap(pulseRound, nodeIndex, sequenceProgress);
    if (classification === 'correct') {
      const reactionMs = Date.now() - roundStartAtRef.current;
      const points = pointsForPulseTap(reactionMs, metrics.combo);
      const complete = sequenceProgress + 1 >= pulseRound.sequence.length;
      registerCorrect(points, nodeIndex, complete);
    } else {
      registerWrong(nodeIndex);
    }
  }

  function handlePeripheralTap(position: number) {
    if (roundPhase !== 'active' || frozen || !peripheralRound) return;
    const classification = classifyPeripheralTap(peripheralRound, position);
    if (classification === 'correct') {
      const reactionMs = Date.now() - roundStartAtRef.current;
      registerCorrect(pointsForPeripheralTap(reactionMs), position, true);
    } else {
      registerWrong(position);
    }
  }

  function handlePathLockTap(round: PathLockRound, stageStartRef: number) {
    if (roundPhase !== 'active' || frozen) return;
    const elapsed = Date.now() - stageStartRef;
    const classification = classifyPathLockTap(round, elapsed);
    if (classification === 'correct') {
      registerCorrect(pointsForPathLockTap(elapsed % round.cycleMs, round), 0, true);
    } else {
      registerWrong(0);
    }
  }

  // ─── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase !== 'countdown' || frozen) return;
    if (soundEnabled) playCountdownPulse(countdownValue);
    const t = setTimeout(() => {
      if (countdownValue === 1) setSessionPhase('live');
      else setCountdownValue(prev => (prev - 1) as 2 | 1);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playCountdownPulse identity churns every render
  }, [sessionPhase, countdownValue, frozen]);

  function handleRestart() {
    setPaused(false);
    armMission();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (sessionPhase === 'setup') {
    return <SetupScreen onStart={armMission} />;
  }

  if (sessionPhase === 'countdown') {
    return (
      <View style={styles.countdownWrap}>
        <Text style={styles.countdownText}>{countdownValue}</Text>
      </View>
    );
  }

  const activeStageForHud: SignalOpsStage = liveStage === 'intro' ? 'cipher-scan' : liveStage;

  return (
    <View style={styles.activeWrap}>
      <View style={styles.hud}>
        <View style={styles.hudPill}>
          <Clock3 size={14} color={colors.text.secondary} />
          <Text style={styles.hudText}>{missionClock.secondsLeft}s</Text>
        </View>
        <View style={styles.hudPill}>
          <Target size={14} color={colors.text.secondary} />
          <Text style={styles.hudText}>{metrics.score}</Text>
        </View>
        <View style={[styles.hudPill, metrics.combo > 0 && styles.hudPillActive]}>
          <Flame size={14} color={metrics.combo > 0 ? EYE : colors.text.secondary} />
          <Text style={[styles.hudText, metrics.combo > 0 && styles.hudTextActive]}>{metrics.combo}x</Text>
        </View>
        <Text style={styles.hudStage}>{STAGE_LABEL[liveStage]} · {stageClock.secondsLeft}s</Text>
      </View>

      <EnergyBar energy={metrics.energy} />

      <View style={[styles.canvas, { height: arenaH }]}>
        {showStageBanner && (
          <View style={styles.stageBanner} pointerEvents="none">
            <Radio size={16} color={EYE} />
            <Text style={styles.stageBannerText}>{STAGE_LABEL[liveStage].toUpperCase()}</Text>
          </View>
        )}

        {liveStage === 'intro' && <IntroBeat />}

        {liveStage === 'cipher-scan' && cipherRound && (
          <CipherStage
            round={cipherRound}
            phase={roundPhase}
            largeTarget={largeTarget}
            highContrast={highContrast}
            reducedMotion={effectiveReducedMotion}
            lastTapState={lastTapState}
            lastTappedIndex={lastTappedIndex}
            onTap={handleCipherTap}
          />
        )}

        {(liveStage === 'pulse-switch' || (liveStage === 'boss-wave' && bossPhase === 'pulse')) && (
          <PulseStageView
            round={liveStage === 'boss-wave' ? bossRound?.pulse ?? null : pulseRound}
            phase={roundPhase}
            playbackIndex={pulsePlaybackIndex}
            lastTapState={lastTapState}
            lastTappedIndex={lastTappedIndex}
            sequenceProgress={sequenceProgress}
            onTap={handlePulseTap}
            reducedMotion={effectiveReducedMotion}
            highContrast={highContrast}
          />
        )}

        {(liveStage === 'peripheral-alert' || (liveStage === 'boss-wave' && bossPhase === 'peripheral')) &&
          (liveStage === 'boss-wave' ? bossRound?.peripheral : peripheralRound) && (
            <PeripheralAlertField
              threatPosition={(liveStage === 'boss-wave' ? bossRound!.peripheral : peripheralRound!).threatPosition}
              falseAlertPositions={(liveStage === 'boss-wave' ? bossRound!.peripheral : peripheralRound!).falseAlertPositions}
              disabled={roundPhase !== 'active'}
              onTapPosition={handlePeripheralTap}
              highContrast={highContrast}
              nodeStates={
                roundPhase === 'feedback' && lastTapState && lastTappedIndex !== null && lastTappedIndex >= 0
                  ? { [lastTappedIndex]: lastTapState }
                  : undefined
              }
            />
          )}

        {liveStage === 'path-lock' && pathLockRound && (
          <PathLockTarget
            shape={pathLockRound.shape}
            cycleMs={pathLockRound.cycleMs}
            lockWindowMs={pathLockRound.lockWindowMs}
            disabled={roundPhase !== 'active'}
            reducedMotion={effectiveReducedMotion}
            onTapField={() => handlePathLockTap(pathLockRound, pathLockStageStartRef.current)}
          />
        )}

        {liveStage === 'boss-wave' && bossPhase === 'lock' && bossRound && (
          <PathLockTarget
            shape={bossRound.pathLock.shape}
            cycleMs={bossRound.pathLock.cycleMs}
            lockWindowMs={bossRound.pathLock.lockWindowMs}
            disabled={roundPhase !== 'active'}
            reducedMotion={effectiveReducedMotion}
            onTapField={() => handlePathLockTap(bossRound.pathLock, roundStartAtRef.current)}
          />
        )}
      </View>

      <PauseOverlay
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={handleRestart}
        onExit={() => {
          setPaused(false);
          finishMission();
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

  // Silence unused-var concerns for stage used only in HUD label mapping today.
  void activeStageForHud;
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function IntroBeat() {
  return (
    <View style={styles.introWrap}>
      <View style={styles.introCore} />
      <Text style={styles.introLabel}>SIGNAL LOCK ENGAGED</Text>
      <Text style={styles.introHint}>Mission starting…</Text>
    </View>
  );
}

interface CipherStageProps {
  round: RoundConfig;
  phase: RoundPhase;
  largeTarget: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  lastTapState: 'correct' | 'wrong' | null;
  lastTappedIndex: number | null;
  onTap: (index: number) => void;
}

function CipherStage({ round, phase, largeTarget, highContrast, reducedMotion, lastTapState, lastTappedIndex, onTap }: CipherStageProps) {
  if (phase === 'preview') {
    return (
      <View style={styles.previewWrap}>
        <Text style={styles.previewLabel}>Find this</Text>
        <View style={styles.previewRow}>
          {round.sequence.map((s, i) => (
            <NeonCipherSymbolGlyph key={i} spec={s} size={largeTarget ? 100 : 84} state="correct" highContrast={highContrast} />
          ))}
        </View>
      </View>
    );
  }
  return (
    <NeonCipherGrid
      cells={round.grid}
      gridSize={3}
      disabled={phase !== 'active'}
      largeTarget={largeTarget}
      highContrast={highContrast}
      reducedMotion={reducedMotion}
      cellStates={
        phase === 'feedback' && lastTapState && lastTappedIndex !== null ? { [lastTappedIndex]: lastTapState } : undefined
      }
      onTapCell={onTap}
    />
  );
}

interface PulseStageViewProps {
  round: PulseRound | null;
  phase: RoundPhase;
  playbackIndex: number | null;
  lastTapState: 'correct' | 'wrong' | null;
  lastTappedIndex: number | null;
  sequenceProgress: number;
  onTap: (index: number) => void;
  reducedMotion: boolean;
  highContrast: boolean;
}

function PulseStageView({ round, phase, playbackIndex, lastTapState, lastTappedIndex, sequenceProgress, onTap, reducedMotion, highContrast }: PulseStageViewProps) {
  if (!round) return null;
  return (
    <View style={styles.pulseStage}>
      <Text style={styles.pulseHint}>{phase === 'preview' ? 'Watch the sequence' : 'Repeat it back'}</Text>
      <PulseSwitchNodes
        playbackIndex={phase === 'preview' ? playbackIndex : null}
        nodeStates={
          phase === 'feedback' && lastTapState && lastTappedIndex !== null && lastTappedIndex >= 0
            ? { [lastTappedIndex]: lastTapState }
            : undefined
        }
        onTapNode={onTap}
        disabled={phase !== 'active'}
        reducedMotion={reducedMotion}
        highContrast={highContrast}
      />
      {round.sequence.length > 1 && (
        <Text style={styles.pulseProgress}>{Math.min(sequenceProgress + 1, round.sequence.length)} / {round.sequence.length}</Text>
      )}
    </View>
  );
}

function EnergyBar({ energy }: { energy: number }) {
  return (
    <View style={styles.energyTrack}>
      <View style={[styles.energyFill, { width: `${energy}%`, backgroundColor: energy > 40 ? EYE : '#FF5F72' }]} />
    </View>
  );
}

function SetupScreen({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.setupWrap}>
      <View style={styles.heroWrap}>
        <View style={styles.heroBadge}>
          <Zap size={30} color={EYE} />
        </View>
        <Text style={styles.heroTitle}>Signal Ops</Text>
        <Text style={styles.setupPurpose}>
          A 3-minute mission across five stages — a brief scan, fast sequence-switching, peripheral reaction,
          continuous tracking, and a boss wave combining all three primary mechanics.
        </Text>
      </View>

      <SectionLabel>MISSION BRIEF</SectionLabel>
      <GlassCard simple noPadding style={styles.briefCard}>
        <View style={styles.briefInner}>
          {LIVE_STAGE_SEQUENCE.map((s, i) => (
            <View key={s} style={styles.briefRow}>
              <Text style={styles.briefIndex}>{i}</Text>
              <Text style={styles.briefLabel}>{STAGE_LABEL[s]}</Text>
              <Text style={styles.briefTime}>{stageDurationSeconds(s)}s</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <View style={styles.startBtnWrap}>
        <GradientCTA label="Start Mission" onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  setupWrap: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  heroWrap: { alignItems: 'center', marginBottom: spacing.lg },
  heroBadge: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: EYE + '16', borderWidth: 1, borderColor: EYE + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
    shadowColor: EYE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16,
  },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 22, color: '#FFFFFF', marginBottom: 6 },
  setupPurpose: { fontFamily: FONTS.body, fontSize: 14, color: colors.text.secondary, lineHeight: 20, textAlign: 'center', paddingHorizontal: spacing.sm },
  briefCard: { marginTop: spacing.sm, marginBottom: spacing.lg },
  briefInner: { padding: spacing.md, gap: 2 },
  briefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  briefIndex: { fontFamily: FONTS.heading, fontSize: 12, color: EYE, width: 16 },
  briefLabel: { fontFamily: FONTS.bodySemi, fontSize: 14, color: '#FFFFFF', flex: 1 },
  briefTime: { fontFamily: FONTS.bodySemi, fontSize: 12, color: colors.text.secondary },
  startBtnWrap: { marginTop: 'auto', marginBottom: spacing.lg },

  countdownWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  countdownText: {
    fontFamily: FONTS.heading, fontSize: 72, color: EYE,
    textShadowColor: EYE, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },

  activeWrap: { flex: 1, paddingHorizontal: spacing.md },
  hud: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  hudPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, minHeight: 32,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  hudPillActive: { backgroundColor: EYE + '16', borderColor: EYE + '40' },
  hudText: { fontFamily: FONTS.bodySemi, fontSize: 15, color: '#FFFFFF' },
  hudTextActive: { color: EYE },
  hudStage: { marginLeft: 'auto', fontFamily: FONTS.bodySemi, fontSize: 12, color: colors.text.secondary },

  energyTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: spacing.sm },
  energyFill: { height: '100%', borderRadius: 3 },

  canvas: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, borderRadius: 28,
    backgroundColor: '#06121a', borderWidth: 1, borderColor: EYE + '52',
    overflow: 'hidden',
    shadowColor: EYE, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowOpacity: 0.28,
  },
  stageBanner: {
    position: 'absolute', top: 16, alignSelf: 'center', zIndex: 3,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(6,18,26,0.85)', borderWidth: 1, borderColor: EYE + '40',
  },
  stageBannerText: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1, color: EYE },

  introWrap: { alignItems: 'center', gap: spacing.sm },
  introCore: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: EYE,
    shadowColor: EYE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16,
  },
  introLabel: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#FFFFFF', letterSpacing: 1 },
  introHint: { fontFamily: FONTS.body, fontSize: 13, color: colors.text.secondary },

  previewWrap: { alignItems: 'center', gap: spacing.md },
  previewLabel: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#FFFFFF' },
  previewRow: { flexDirection: 'row', gap: spacing.md },

  pulseStage: { alignItems: 'center', gap: spacing.lg },
  pulseHint: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#FFFFFF' },
  pulseProgress: { fontFamily: FONTS.bodySemi, fontSize: 12, color: colors.text.secondary },
});
