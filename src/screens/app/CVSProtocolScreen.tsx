import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  Grid3x3,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Triangle,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardinalGazesGuide } from '@/components/eye/animations/CardinalGazesGuide';
import { CircularOrbitGuide } from '@/components/eye/animations/CircularOrbitGuide';
import { ConvergenceGuide } from '@/components/eye/animations/ConvergenceGuide';
import { LottieGuide } from '@/components/eye/animations/LottieGuide';
import { NearFarGuide } from '@/components/eye/animations/NearFarGuide';
import { SaccadeGuide } from '@/components/eye/animations/SaccadeGuide';
import { StepCountdownRing } from '@/components/eye/animations/StepCountdownRing';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import { BACKGROUND, FONTS, GLASS_CARD, PILLAR_COLORS, RADIUS, SPACING, STATUS_COLORS } from '@/constants/designSystem';
import type { AudioClipId } from '@/constants/audioGuide';
import { PillarProvider } from '@/context/PillarContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioGuide } from '@/hooks/useAudioGuide';
import { useSessionKeepAwake } from '@/hooks/useSessionKeepAwake';
import { useSessionLifecycle } from '@/hooks/useSessionLifecycle';
import { useSessionClock } from '@/hooks/useSessionClock';
import { useEyeProgress } from '@/hooks/useEyeProgress';
import { useProgressStore } from '@/stores/useProgressStore';
import {
  cvsCancelResumeBeat,
  cvsCanComplete,
  cvsDeferredStepApplies,
  cvsPauseVoiceOnBackground,
  cvsResumeVoiceOnForeground,
  cvsShouldFreezeActive,
  cvsTimingBlocked,
} from '@/utils/cvsLifecycle';
import {
  saveEyeComfortRecord,
  type EyeComfortRating,
} from '@/services/eyeComfortPersistence';
import { getComfortChange } from '@/utils/eyeComfort';
import { EYE_RESET_STEPS_SECONDS } from '@/constants/eyeRelax';

// One accent for the whole Eyes feature — matches the Eye tab (was
// PILLAR_THEME.eyes.accent, a different teal-cyan from the separate
// onboarding theme file; this screen is core app, not onboarding).
const ACCENT = PILLAR_COLORS.eye;

interface VoiceCue { atSec: number; text: string }
interface EyeStep {
  id: string; icon: LucideIcon; accent: string; title: string;
  durationSeconds: number; what: string;
  /** One coaching line shown for ~3s at the start of the exercise, then fades. */
  coach: string;
  intro: string; cues: VoiceCue[]; important?: boolean;
}

// User-friendly names — nobody outside an optometry class knows "saccades",
// and "Pencil Push-Ups" sends people looking for a pencil. Accents are one
// desaturated premium palette (soft cyan / indigo / mint / amber), not
// full-saturation primaries.
// Step lengths come from the single source of truth (EYE_RESET_STEPS_SECONDS
// in @/constants/eyeRelax) so the displayed duration can never drift from
// the real session. Order must match the shared constant.
const STEP_SECONDS = EYE_RESET_STEPS_SECONDS;

const STEPS: EyeStep[] = [
  { id: 'circle', icon: RotateCw, accent: '#7dd3fc', title: 'Circle Tracking', durationSeconds: STEP_SECONDS[0], what: 'Follow the circle.', coach: 'Keep your head still. Follow the glowing dot using only your eyes.', intro: 'Circle. Follow the orbiting dot smoothly with your eyes only. Keep your head still.', cues: [{ atSec: 12, text: 'Stay smooth — no jumping.' }] },
  { id: 'square', icon: Square, accent: '#a5b4fc', title: 'Square Tracking', durationSeconds: STEP_SECONDS[1], what: 'Track the square.', coach: 'Move your eyes comfortably along the square.', intro: 'Square. Trace the square path gently with your eyes. Keep your head relaxed.', cues: [{ atSec: 12, text: 'Follow each corner without forcing the movement.' }] },
  { id: 'triangle', icon: Triangle, accent: '#6ee7b7', title: 'Triangle Tracking', durationSeconds: STEP_SECONDS[2], what: 'Follow the triangle.', coach: 'Let your eyes travel gently between each corner.', intro: 'Triangle. Follow the triangular path at a comfortable pace.', cues: [{ atSec: 12, text: 'Keep the diagonal movement gentle.' }] },
  { id: 'cardinal', icon: Grid3x3, accent: '#fcd34d', title: 'Nine Point Focus', durationSeconds: STEP_SECONDS[3], what: 'Pause on every point.', coach: 'Pause briefly on each glowing point.', intro: 'Nine Point Focus. Visit each glowing position without straining or forcing your gaze.', cues: [{ atSec: 14, text: 'Stay relaxed as the position changes.' }, { atSec: 24, text: 'Almost through all nine — keep it comfortable.' }] },
  { id: 'saccade', icon: Zap, accent: '#fde68a', title: 'Quick Focus', durationSeconds: STEP_SECONDS[4], what: 'Shift focus smoothly.', coach: 'Move your eyes between the two glowing dots. Keep your head still.', intro: 'Quick Focus. Shift between horizontal, vertical, and diagonal targets at a comfortable pace.', cues: [{ atSec: 8, text: 'Horizontal — side to side.' }, { atSec: 16, text: 'Vertical — up and down.' }, { atSec: 24, text: 'Diagonal — corner to corner.' }] },
  { id: 'convergence', icon: Minimize2, accent: '#fda4af', title: 'Near–Far Focus', durationSeconds: STEP_SECONDS[5], what: 'Follow the dot closer.', coach: 'Focus on the dot as it moves closer, then farther away.', intro: 'Near Far Focus. Follow the dot as it comes closer. If you see double, look away and start again.', cues: [{ atSec: 12, text: 'Stop if it doubles or blurs.' }, { atSec: 24, text: 'Bring it back, slowly.' }, { atSec: 35, text: 'Two more cycles.' }], important: true },
  { id: 'nearfar', icon: ArrowLeftRight, accent: '#5eead4', title: 'Focus Change', durationSeconds: STEP_SECONDS[6], what: 'Change focus naturally.', coach: 'Shift your attention between the glowing points.', intro: 'Focus Change. Look at the near target, then shift to the far target. Keep the change comfortable.', cues: [{ atSec: 14, text: 'Now near… now far.' }, { atSec: 28, text: 'Keep switching — stay relaxed.' }], important: true },
];

// Mid-session encouragement, shown on the transition beat AFTER this many
// completed exercises (index into STEPS of the exercise just finished).
const ENCOURAGEMENT: Record<number, string> = {
  2: "You're doing great.",
  4: 'Almost there.',
};

const TOTAL_DURATION = STEPS.reduce((s, x) => s + x.durationSeconds, 0);

/** 210 → "3 min 30 sec"; 180 → "3 min". */
function formatTotal(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}

/** 210 → "3m 30s"; 180 → "3m". Compact form for the summary chips. */
function formatTotalShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const BENEFITS = ['Take a structured screen break', 'Practice comfortable focus changes', 'Build a consistent eye-care habit'];

const COMFORT_OPTIONS: { value: EyeComfortRating; label: string }[] = [
  { value: 1, label: 'Comfortable' },
  { value: 2, label: 'Slight' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Severe' },
];

function StepGuide({ stepId, active }: { stepId: string; active: boolean }) {
  switch (stepId) {
    case 'circle': return <CircularOrbitGuide active={active} singleShape={0} />;
    case 'square': return <CircularOrbitGuide active={active} singleShape={1} />;
    case 'triangle': return <CircularOrbitGuide active={active} singleShape={2} />;
    case 'cardinal': return <CardinalGazesGuide active={active} />;
    case 'saccade': return <SaccadeGuide active={active} />;
    case 'convergence': return <ConvergenceGuide active={active} />;
    case 'nearfar': return <NearFarGuide active={active} />;
    default: return null;
  }
}

/**
 * Hero: the eye breathes. A slow 3s glow-pulse + gentle float — alive, never
 * aggressive (Calm-style). All three values ride one repeating timing loop.
 */
function AnimatedEyeHero() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.22, 0.5]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pulse.value, [0, 1], [0, -5]) },
      { scale: interpolate(pulse.value, [0, 1], [1, 1.05]) },
    ],
  }));

  return (
    <View style={styles.heroWrap}>
      <Animated.View style={[styles.heroGlow, glowStyle]} />
      <Animated.View style={[styles.idleEyeRing, ringStyle]}>
        <Eye size={30} color={ACCENT} strokeWidth={1.8} />
      </Animated.View>
    </View>
  );
}

function StepIconBadge({ icon: Icon, accent }: { icon: LucideIcon; accent: string }) {
  // Uniform badges: one size, one stroke, one alpha recipe for every step.
  return (
    <View style={[styles.iconBadge, { backgroundColor: accent + '16', borderColor: accent + '40' }]}>
      <Icon size={28} color={accent} strokeWidth={2} />
    </View>
  );
}

/** Live "you are being tracked" cue during the active phase — a slow pulsing
 * cyan dot + label, so the session clearly reads as in-progress (it hides
 * while paused or between exercises). */
function TrackingBadge() {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.trackingBadge}>
      <Animated.View style={[styles.trackingDot, pulseStyle]} />
      <Text style={styles.trackingText}>TRACKING</Text>
    </View>
  );
}

function StepDots({ count, current }: { count: number; current: number }) {
  return <View style={styles.dotsRow}>{Array.from({ length: count }).map((_, i) => {
    const done = i < current; const active = i === current;
    return (
      <Animated.View
        key={i}
        layout={LinearTransition.duration(300)}
        style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}
      />
    );
  })}</View>;
}

type Phase = 'idle' | 'checkin-before' | 'calibrate' | 'countdown' | 'active' | 'recovery' | 'checkin-after' | 'done';
type Interstitial = { doneTitle: string; nextTitle: string; encouragement?: string } | null;

// Tiny reminder tips under the countdown — rotate slowly, low-key coaching.
const ROTATING_TIPS = ['Keep your head still.', 'Blink naturally.', 'Relax your jaw.'];
const TIP_ROTATE_MS = 6000;

// Recorded voice per exercise (assets/audio/guide/<lang>/eyes/) — spoken at
// the start of each exercise; the session intro covers calibration.
const STEP_CLIPS: Record<string, AudioClipId> = {
  circle: 'eyes/reset-circle',
  square: 'eyes/reset-square',
  triangle: 'eyes/reset-triangle',
  cardinal: 'eyes/reset-ninedot',
  saccade: 'eyes/reset-quick',
  convergence: 'eyes/reset-nearfar',
  nearfar: 'eyes/reset-shift',
};

export default function CVSProtocolScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { recordCompletion, streak } = useEyeProgress(user?.uid);
  const logEyeExercise = useProgressStore(state => state.logEyeExercise);
  const { play, stop: stopVoice, pause: pauseVoice, resume: resumeVoice } = useAudioGuide();

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  // Bump to force a fresh countdown without changing the step (Restart
  // Exercise / re-run) — the step timer itself lives in useSessionClock.
  const [clockNonce, setClockNonce] = useState(0);
  const [paused, setPaused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  // "✓ Circle Complete → Next: Square Tracking" beat between exercises.
  const [interstitial, setInterstitial] = useState<Interstitial>(null);
  // Rotating micro-tip shown under the countdown ("Blink naturally." …).
  const [tipIdx, setTipIdx] = useState(0);
  // 3-2-1 beat between calibration and the first exercise.
  const [prepNum, setPrepNum] = useState(3);
  // 3-2-1 beat when resuming from pause — null when not resuming.
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  // 20-20-20 recovery: look far away for 20s after the last exercise.
  const [recoverySecs, setRecoverySecs] = useState(20);
  const [comfortBefore, setComfortBefore] = useState<EyeComfortRating | null>(null);
  const [comfortAfter, setComfortAfter] = useState<EyeComfortRating | null>(null);
  useSessionKeepAwake(phase === 'active', 'mindpulse-cvs-protocol');

  // Guard: 'Save & Finish' and 'Skip check-in' can both fire completeSession;
  // this ref makes the completion write exactly-once per session.
  const completedRef = useRef(false);
  const interstitialTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Background/lock handling: while the app is away no step timer may tick
  // and no step may auto-advance. A step change interrupted by a background
  // is deferred and replayed on return.
  const isBackgroundedRef = useRef(false);
  const pendingStepRef = useRef<number | null>(null);
  const pendingRecoveryRef = useRef(false);
  const contentOpacity = useSharedValue(1);
  const completionScale = useSharedValue(0.85);
  const completionOpacity = useSharedValue(0);
  // Smooth overall-session progress bar — animates toward each tick value
  // instead of snapping the fill width once a second.
  const progressAnim = useSharedValue(0);
  // Per-exercise coaching line: visible at the start, fades out after ~3s so
  // the screen stays clean while the user tracks the target.
  const coachOpacity = useSharedValue(0);
  // Pause card: scale 0.94 → 1 on open.
  const pauseCardScale = useSharedValue(0.94);

  const step = STEPS[stepIndex];

  // ─── Background / lock handling ────────────────────────────────────────────
  // The step timer, 3-2-1 countdown and 20-20-20 recovery all freeze while
  // the app is away. On return the existing paused/resume UI takes over, so
  // nothing auto-resumes and no time is lost while backgrounded. A step
  // change interrupted mid-transition is replayed on return.
  const { isBackgrounded } = useSessionLifecycle({
    onPause: () => {
      isBackgroundedRef.current = true;
      // An in-flight 3-2-1 resume beat must not finish while away — it would
      // auto-resume the session (no paused overlay on return, voice playing
      // in the background). Cancel it so the user resumes deliberately.
      if (cvsCancelResumeBeat(phase, resumeCountdown)) setResumeCountdown(null);
      if (cvsShouldFreezeActive(phase) && !paused) {
        // Freeze the live exercise (voice included) and surface the normal
        // paused overlay on return — same UX as a manual pause.
        pauseVoice();
        setPaused(true);
      } else if (cvsPauseVoiceOnBackground(phase)) {
        pauseVoice();
      }
    },
    onResume: () => {
      isBackgroundedRef.current = false;
      // Voice-only phases (calibrate intro) simply continue on return.
      if (cvsResumeVoiceOnForeground(phase)) resumeVoice();
      // Replay any step change interrupted by the background.
      if (cvsDeferredStepApplies(pendingStepRef.current, false)) {
        const next = pendingStepRef.current as number;
        pendingStepRef.current = null;
        if (phase === 'active') {
          clearInterstitialTimers();
          applyStepAdvance(next);
          setInterstitial(null);
          contentOpacity.value = withTiming(1, { duration: 450 });
        }
      } else if (phase === 'active' && interstitial) {
        // The step swap already ran; only the "complete → next" clear was
        // deferred while away.
        clearInterstitialTimers();
        setInterstitial(null);
        contentOpacity.value = withTiming(1, { duration: 450 });
      }
      if (pendingRecoveryRef.current) {
        pendingRecoveryRef.current = false;
        setPaused(false);
        setRecoverySecs(20);
        setPhase('recovery');
      }
    },
  });

  // The step countdown — wall-clock based, freezes on pause OR background,
  // resumes from the exact remaining time, fires completion once per step.
  // `clockNonce` bumps on explicit restarts (Restart Exercise / re-run).
  const { secondsLeft } = useSessionClock({
    totalSeconds: step.durationSeconds,
    running: phase === 'active',
    paused: cvsTimingBlocked('active', isBackgrounded, paused) || interstitial !== null,
    resetKey: `${stepIndex}:${clockNonce}`,
    onComplete: goNext,
  });

  useEffect(() => () => {
    for (const t of interstitialTimersRef.current) clearTimeout(t);
    stopVoice();
  }, [stopVoice]);

  // Speak each exercise's guidance as it appears. On transitions the swap
  // happens ~0.4s into the "complete → next" beat, so a small delay lands the
  // voice right as the new exercise fades in (it replaces any previous clip).
  useEffect(() => {
    if (phase !== 'active') return;
    play(STEP_CLIPS[STEPS[stepIndex].id], stepIndex === 0 ? 400 : 1100, 1);
  }, [phase, stepIndex, play]);

  // Coaching line: fade in with each new exercise, fade out after ~3s.
  useEffect(() => {
    if (phase !== 'active') return;
    coachOpacity.value = withTiming(1, { duration: 400 });
    const t = setTimeout(() => {
      coachOpacity.value = withTiming(0, { duration: 600 });
    }, 3200);
    return () => clearTimeout(t);
  }, [phase, stepIndex, coachOpacity]);

  // Rotate the micro-tip every few seconds while tracking.
  useEffect(() => {
    if (phase !== 'active' || paused || interstitial || isBackgrounded) return;
    const interval = setInterval(
      () => setTipIdx(i => (i + 1) % ROTATING_TIPS.length),
      TIP_ROTATE_MS,
    );
    return () => clearInterval(interval);
  }, [phase, paused, interstitial, isBackgrounded]);

  const elapsedBefore = STEPS.slice(0, stepIndex).reduce((s, x) => s + x.durationSeconds, 0);
  const elapsed = elapsedBefore + (step.durationSeconds - secondsLeft);
  const progressPct = Math.min(1, elapsed / TOTAL_DURATION);

  useEffect(() => {
    progressAnim.value = withTiming(progressPct, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressPct, progressAnim]);
  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%`,
  }));

  function clearInterstitialTimers() {
    for (const t of interstitialTimersRef.current) clearTimeout(t);
    interstitialTimersRef.current = [];
  }

  /** Swap the exercise; its countdown is owned by useSessionClock, so the
   * resetKey change (stepIndex) starts the new step fresh. */
  function applyStepAdvance(next: number) {
    setStepIndex(next);
  }

  function goNext() {
    const next = stepIndex + 1;
    if (next >= STEPS.length) {
      // Final exercise done → 20-20-20 recovery. Never auto-advance into it
      // while away; defer until the app returns.
      if (isBackgroundedRef.current) { pendingRecoveryRef.current = true; return; }
      contentOpacity.value = withTiming(0, { duration: 320 });
      stopVoice();
      interstitialTimersRef.current.push(setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecoverySecs(20);
        setPhase('recovery');
      }, 360));
      return;
    }
    if (isBackgroundedRef.current) {
      // Never auto-advance a step while backgrounded — defer the whole
      // "complete → next" beat until the app returns.
      pendingStepRef.current = next;
      return;
    }
    // Premium transition: fade the exercise out (~400ms), show the
    // "complete → next" beat, swap behind it, fade the new one in.
    setInterstitial({
      doneTitle: step.title,
      nextTitle: STEPS[next].title,
      encouragement: ENCOURAGEMENT[stepIndex],
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    contentOpacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) });
    interstitialTimersRef.current.push(setTimeout(() => {
      if (isBackgroundedRef.current) { pendingStepRef.current = next; return; }
      applyStepAdvance(next);
    }, 420));
    interstitialTimersRef.current.push(setTimeout(() => {
      if (isBackgroundedRef.current) return; // replayed on return
      setInterstitial(null);
      contentOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
      void Haptics.selectionAsync();
    }, 1600));
  }

  function skipStep() { if (interstitial) return; void Haptics.selectionAsync(); goNext(); }
  function togglePause() {
    if (interstitial) return;
    void Haptics.selectionAsync();
    // Voice freezes/resumes with the session.
    if (paused) resumeVoice();
    else pauseVoice();
    setPaused(p => !p);
  }

  // Tapping "Resume Session" plays a calm 3-2-1 beat (same rhythm as the
  // session-start countdown) before actually unpausing — feels intentional
  // rather than an instant jump back into a moving target.
  function startResume() {
    void Haptics.selectionAsync();
    setResumeCountdown(3);
  }
  useEffect(() => {
    // Frozen while backgrounded (belt & braces on top of the onPause cancel)
    // so the beat can never complete while the app is away.
    if (resumeCountdown === null || isBackgrounded) return;
    if (resumeCountdown <= 0) {
      const t = setTimeout(() => {
        setResumeCountdown(null);
        togglePause(); // paused is still true here, so this resumes.
      }, 350);
      return () => clearTimeout(t);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = setTimeout(() => setResumeCountdown(n => (n ?? 1) - 1), 650);
    return () => clearTimeout(t);
  }, [resumeCountdown, isBackgrounded]);

  useEffect(() => {
    if (paused) {
      pauseCardScale.value = 0.94;
      pauseCardScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      pauseCardScale.value = 0.94;
    }
  }, [paused, pauseCardScale]);

  const activeStartedRef = useRef(false);
  function startPrep() {
    if (activeStartedRef.current) return;
    activeStartedRef.current = true;
    setPrepNum(3);
    setPhase('countdown');
  }

  // 3 → 2 → 1 → "Begin" → first exercise (light haptic per digit). Frozen
  // while the app is backgrounded; continues where it left off on return.
  useEffect(() => {
    if (phase !== 'countdown' || cvsTimingBlocked(phase, isBackgrounded, false)) return;
    if (prepNum <= 0) {
      // Let "Begin" breathe for a beat before the exercise fades in.
      const t = setTimeout(() => {
        contentOpacity.value = 0;
        contentOpacity.value = withTiming(1, { duration: 450 });
        setPhase('active');
      }, 650);
      return () => clearTimeout(t);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = setTimeout(() => setPrepNum(n => n - 1), 750);
    return () => clearTimeout(t);
  }, [phase, prepNum, contentOpacity, isBackgrounded]);

  function requestStart() {
    void Haptics.selectionAsync();
    // A fresh session may write a new completion record again.
    completedRef.current = false;
    setComfortBefore(null);
    setComfortAfter(null);
    setPhase('checkin-before');
  }

  function begin(before: EyeComfortRating | null = comfortBefore) {
    void Haptics.selectionAsync();
    setComfortBefore(before);
    setStepIndex(0); setClockNonce(n => n + 1); setPaused(false);
    activeStartedRef.current = false;
    // Calibration holds while the recorded session intro speaks (~20s),
    // then 3-2-1 into the first exercise. 30s cap in case audio stalls.
    setPhase('calibrate');
    play('eyes/reset-intro', 400, 1, { protect: true, onDone: startPrep });
    interstitialTimersRef.current.push(setTimeout(startPrep, 30000));
  }

  // Session end: 20-20-20 recovery first, then the celebration screen.
  function finishSession() {
    stopVoice();
    setPhase('checkin-after');
  }

  function completeSession(after: EyeComfortRating | null) {
    // Completion can only run in the foreground — while backgrounded the
    // check-in is unreachable anyway; belt & braces on top of completedRef.
    if (!cvsCanComplete(isBackgrounded)) return;
    setComfortAfter(after);
    setPhase('done');
    // Writes are normalised: Eye Reset records the activity id
    // 'cvs-protocol' (previously wrote the legacy 'eye-reset' type — see
    // eyeSessionIds.ts, which still resolves both to the same recovery id
    // for back-compat). The progress-store counter updates exactly once
    // per completed session.
    if (!completedRef.current) {
      completedRef.current = true;
      void recordCompletion('cvs-protocol');
      logEyeExercise();
      void saveEyeComfortRecord(user?.uid, {
        completedAt: Date.now(),
        sessionType: 'cvs-protocol',
        before: comfortBefore,
        after,
      });
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('eyes/reset-complete', 500, 1, { protect: true });
    completionOpacity.value = withTiming(1, { duration: 420 });
    completionScale.value = withTiming(1, { duration: 520 });
  }

  useEffect(() => {
    // 20-20-20 recovery freezes while away — it must not auto-advance into
    // the after-check-in while the app is backgrounded.
    if (phase !== 'recovery' || cvsTimingBlocked(phase, isBackgrounded, false)) return;
    if (recoverySecs <= 0) {
      const t = setTimeout(finishSession, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRecoverySecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recoverySecs, isBackgrounded]);

  function repeatSession() {
    void Haptics.selectionAsync();
    completionOpacity.value = 0; completionScale.value = 0.85;
    requestStart();
  }

  function exitNow() { stopVoice(); setExitConfirm(false); router.back(); }

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const completionStyle = useAnimatedStyle(() => ({ opacity: completionOpacity.value, transform: [{ scale: completionScale.value }] }));
  const coachStyle = useAnimatedStyle(() => ({ opacity: coachOpacity.value }));
  const pauseCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pauseCardScale.value }] }));

  return (
    <View style={styles.root}>
      <PillarProvider pillar="eye"><AmbientBackground subtle /></PillarProvider>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (phase === 'active' ? setExitConfirm(true) : router.back())} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text.primary} />
          </TouchableOpacity>
          {phase === 'active' ? (
            <View style={styles.headerProgress}>
              <Animated.Text key={stepIndex} entering={FadeIn.duration(300)} style={styles.exerciseCount}>
                Exercise {stepIndex + 1} of {STEPS.length}
              </Animated.Text>
              <StepDots count={STEPS.length} current={stepIndex} />
              <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, progressFillStyle]} /></View>
            </View>
          ) : (
            <View style={styles.headerTitle}><Text style={styles.headerTitleText}>Eye Reset</Text></View>
          )}
          <View style={styles.iconSpacer} />
        </View>

        {/* IDLE — CTA pinned at the bottom, content scrolls behind it */}
        {phase === 'idle' && (
          <View style={styles.idleRoot}>
            <ScrollView contentContainerStyle={styles.idleScroll} showsVerticalScrollIndicator={false}>
            {/* Hero — alive, breathing */}
            <AnimatedEyeHero />
            <Text style={styles.heroTitle}>Eye Reset</Text>
            <Text style={styles.heroSub}>A guided break for screen-heavy days</Text>

            {/* Summary chips — metadata at a glance, not a plain text line */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Clock size={11} color={colors.text.tertiary} />
                <Text style={styles.summaryChipText}>{formatTotalShort(TOTAL_DURATION)}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Eye size={11} color={colors.text.tertiary} />
                <Text style={styles.summaryChipText}>{STEPS.length} Exercises</Text>
              </View>
              <View style={styles.summaryChip}>
                <Check size={11} color={colors.text.tertiary} />
                <Text style={styles.summaryChipText}>Beginner</Text>
              </View>
            </View>

            {/* Exercise list — icon + name + one-liner + duration */}
            <GlassCard style={styles.stepList}>
              {STEPS.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.6}
                  onPress={() => void Haptics.selectionAsync()}
                  style={[styles.stepRow, i > 0 && styles.stepRowBorder]}
                >
                  <StepIconBadge icon={s.icon} accent={s.accent} />
                  <View style={styles.stepRowInfo}>
                    <Text style={styles.stepRowTitle}>{s.title}</Text>
                    <Text style={styles.stepRowDesc} numberOfLines={1}>{s.what}</Text>
                  </View>
                  <Text style={styles.stepRowDur}>{s.durationSeconds}s</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>

            {/* Benefits — the reason to press start */}
            <View style={styles.benefits}>
              <Text style={styles.benefitsTitle}>You&apos;ll experience</Text>
              {BENEFITS.map(b => (
                <View key={b} style={styles.benefitRow}>
                  <View style={styles.benefitCheck}>
                    <Check size={12} color={ACCENT} strokeWidth={3} />
                  </View>
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>

            </ScrollView>

            {/* Always-visible primary action */}
            <View style={styles.idleCtaBar}>
              <GradientCTA
                label="Start Session"
                icon={<Play size={18} color="#03212C" />}
                onPress={requestStart}
                textColor="#03212C"
                style={styles.cta}
              />
            </View>
          </View>
        )}

        {(phase === 'checkin-before' || phase === 'checkin-after') && (
          <View style={styles.checkinRoot}>
            <GlassCard style={styles.checkinCard}>
              <Text style={styles.checkinKicker}>
                {phase === 'checkin-before' ? 'BEFORE YOUR RESET' : 'AFTER YOUR RESET'}
              </Text>
              <Text style={styles.checkinTitle}>How uncomfortable do your eyes feel?</Text>
              <Text style={styles.checkinSub}>
                This tracks how you feel—it does not diagnose an eye condition.
              </Text>
              <View style={styles.comfortOptions}>
                {COMFORT_OPTIONS.map(option => {
                  const selected = (phase === 'checkin-before' ? comfortBefore : comfortAfter) === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.comfortOption, selected && styles.comfortOptionSelected]}
                      activeOpacity={0.8}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        if (phase === 'checkin-before') setComfortBefore(option.value);
                        else setComfortAfter(option.value);
                      }}
                    >
                      <Text style={[styles.comfortNumber, selected && styles.comfortTextSelected]}>{option.value}</Text>
                      <Text style={[styles.comfortLabel, selected && styles.comfortTextSelected]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {phase === 'checkin-after' && comfortAfter !== null && (
                <Text style={styles.comfortOutcome}>
                  {getComfortChange({ before: comfortBefore, after: comfortAfter }) === 'better'
                    ? 'You reported feeling more comfortable.'
                    : getComfortChange({ before: comfortBefore, after: comfortAfter }) === 'worse'
                      ? 'You reported more discomfort. Rest your eyes and stop if symptoms persist.'
                      : getComfortChange({ before: comfortBefore, after: comfortAfter }) === 'same'
                        ? 'You reported no immediate change.'
                        : 'Your response will be saved with this session.'}
                </Text>
              )}
              <GradientCTA
                label={phase === 'checkin-before' ? 'Continue' : 'Save & Finish'}
                onPress={() => {
                  if (phase === 'checkin-before') begin(comfortBefore);
                  else completeSession(comfortAfter);
                }}
                textColor="#03212C"
                style={styles.cta}
              />
              <TouchableOpacity
                onPress={() => {
                  if (phase === 'checkin-before') begin(null);
                  else completeSession(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.checkinSkip}>Skip check-in</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* CALIBRATE — 3s setup beat, then auto-start */}
        {phase === 'calibrate' && (
          <Animated.View
            entering={FadeIn.duration(350)}
            exiting={FadeOut.duration(300)}
            style={styles.calibrateRoot}
          >
            <View style={styles.heroRing}>
              <Eye size={36} color={ACCENT} strokeWidth={1.8} />
            </View>
            <Text style={styles.calibrateTitle}>Preparing your eyes…</Text>
            <Text style={styles.calibrateLine}>Keep your head still.</Text>
            <Text style={styles.calibrateLine}>Sit about 40–60 cm from your screen.</Text>
            <Text style={styles.calibrateLine}>Follow the target using only your eyes.</Text>
            <TouchableOpacity
              onPress={() => { void Haptics.selectionAsync(); stopVoice(); startPrep(); }}
              hitSlop={8}
              activeOpacity={0.7}
              style={styles.calibrateSkip}
            >
              <Text style={styles.recoverySkip}>Skip intro</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 3-2-1 — the breath before the first exercise */}
        {phase === 'countdown' && (
          <View style={styles.prepRoot}>
            <Animated.Text
              key={prepNum}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(180)}
              style={[styles.prepNum, { color: ACCENT }]}
            >
              {prepNum > 0 ? prepNum : 'Begin'}
            </Animated.Text>
          </View>
        )}

        {/* ACTIVE — immersive */}
        {phase === 'active' && (
          <View style={styles.activeRoot}>
            <Animated.View style={[styles.activeContent, contentStyle]}>
              {/* Exercise name + coaching line (fades out after ~3s) */}
              <View style={styles.activeTop}>
                <Text style={styles.stepName}>{step.title}</Text>
                <Animated.Text style={[styles.stepWhat, coachStyle]}>{step.coach}</Animated.Text>
              </View>

              {/* Animation — fills the center */}
              <View style={styles.activeCenter}>
                <StepCountdownRing
                  size={320} strokeWidth={4} duration={step.durationSeconds}
                  active={!paused && !interstitial} paused={paused} resetKey={stepIndex}
                  color={step.accent} trackColor="rgba(255,255,255,0.04)" gradient={false}
                >
                  <LottieGuide stepId={step.id} active={!paused && !interstitial} size={260} speed={0.85}
                    fallback={<StepGuide stepId={step.id} active={!paused && !interstitial} />}
                  />
                </StepCountdownRing>
              </View>

              {/* Live tracking cue — hidden while paused or between steps */}
              {!paused && !interstitial && <TrackingBadge />}

              <View style={styles.remainingBlock}>
                <View style={styles.remainingRow}>
                  {/* key remount = soft fade on every tick, no hard number snap */}
                  <Animated.Text
                    key={secondsLeft}
                    entering={FadeIn.duration(240)}
                    style={[styles.activeRemainingNum, { color: ACCENT }]}
                  >
                    {secondsLeft}
                  </Animated.Text>
                  <Text style={styles.activeRemaining}>sec remaining</Text>
                </View>
                <Animated.Text
                  key={`tip-${tipIdx}`}
                  entering={FadeIn.duration(600)}
                  style={styles.rotatingTip}
                >
                  {ROTATING_TIPS[tipIdx]}
                </Animated.Text>
              </View>

              {/* Coming up next — fixed-height slot so controls never shift */}
              <View style={styles.nextUpSlot}>
                {secondsLeft <= 10 && stepIndex < STEPS.length - 1 && !interstitial && (
                  <Animated.View entering={FadeIn.duration(450)} style={styles.nextUpChip}>
                    <Text style={styles.nextUpLabel}>NEXT</Text>
                    <Text style={styles.nextUpTitle}>{STEPS[stepIndex + 1].title}</Text>
                  </Animated.View>
                )}
              </View>

              {/* Controls — icon + label so the bottom never feels unfinished */}
              <View style={styles.activeControls}>
                <TouchableOpacity style={styles.controlGroup} onPress={togglePause} activeOpacity={0.85}>
                  <View style={styles.pauseBtn}>
                    {paused
                      ? <Play size={18} color={ACCENT} />
                      : <Pause size={18} color={ACCENT} />}
                  </View>
                  <Text style={styles.controlLabel}>{paused ? 'Resume' : 'Pause Session'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlGroup} onPress={skipStep} activeOpacity={0.7} hitSlop={8}>
                  <View style={styles.skipBtn}>
                    <Zap size={16} color={colors.text.secondary} />
                  </View>
                  <Text style={styles.controlLabel}>Skip Exercise</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Paused — a calm glass card over a blurred game, not a floating menu */}
            {paused && resumeCountdown === null && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(180)}
                style={styles.pausedOverlay}
                pointerEvents="box-none"
              >
                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.pausedScrim} pointerEvents="none" />

                <Animated.View style={[styles.pauseCard, pauseCardStyle]}>
                  <View style={styles.pauseIconRing}>
                    <Pause size={30} color={ACCENT} fill={ACCENT} />
                  </View>
                  <Text style={styles.pausedTitle}>Session Paused</Text>
                  <Text style={styles.pausedSub}>Take a short break.{'\n'}Resume whenever you&apos;re ready.</Text>

                  <View style={styles.pausedDivider} />

                  <GradientCTA
                    label="Resume Session"
                    icon={<Play size={16} color="#03212C" />}
                    onPress={startResume}
                    textColor="#03212C"
                    style={styles.pausedResumeCta}
                  />
                  <TouchableOpacity
                    style={styles.pausedTextBtn}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setClockNonce(n => n + 1);
                      setPaused(false);
                      // Fresh run of the exercise = fresh guidance.
                      play(STEP_CLIPS[step.id], 400, 1);
                    }}
                    activeOpacity={0.7}
                  >
                    <RotateCcw size={13} color={colors.text.secondary} />
                    <Text style={styles.pausedTextBtnLabel}>Restart Exercise</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pausedEndBtn}
                    onPress={() => { void Haptics.selectionAsync(); setExitConfirm(true); }}
                    activeOpacity={0.6}
                    hitSlop={8}
                  >
                    <Text style={styles.pausedEndBtnText}>End Session</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            )}

            {/* Resume beat — same 3-2-1 rhythm as the session start, so
                gameplay never snaps back into motion without warning. */}
            {resumeCountdown !== null && (
              <View style={styles.pausedOverlay} pointerEvents="none">
                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.pausedScrim} />
                <Animated.Text
                  key={resumeCountdown}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(160)}
                  style={[styles.prepNum, { color: ACCENT }]}
                >
                  {resumeCountdown > 0 ? resumeCountdown : 'Go'}
                </Animated.Text>
              </View>
            )}

            {/* "✓ Complete → Next" beat between exercises */}
            {interstitial && (
              <Animated.View
                entering={FadeIn.duration(350)}
                exiting={FadeOut.duration(300)}
                style={styles.interstitial}
                pointerEvents="none"
              >
                <View style={styles.interstitialCheck}>
                  <Check size={26} color={ACCENT} strokeWidth={2.5} />
                </View>
                <Text style={styles.interstitialGreat}>
                  {interstitial.encouragement ?? 'Great'}
                </Text>
                <Text style={styles.interstitialDone}>{interstitial.doneTitle} complete</Text>
                <Text style={styles.interstitialBreath}>Take one deep breath.</Text>
                <Text style={styles.interstitialNextLabel}>Next</Text>
                <Text style={styles.interstitialNext}>{interstitial.nextTitle}</Text>
              </Animated.View>
            )}
          </View>
        )}

        {/* 20-20-20 RECOVERY — look far away before the celebration */}
        {phase === 'recovery' && (
          <Animated.View entering={FadeIn.duration(450)} style={styles.recoveryRoot}>
            <View style={styles.heroRing}>
              <Eye size={36} color={ACCENT} strokeWidth={1.8} />
            </View>
            <Text style={styles.recoveryKicker}>Excellent</Text>
            <Text style={styles.recoveryTitle}>Exercises complete</Text>
            <Text style={styles.recoverySub}>
              Now look at something{'\n'}
              <Text style={styles.recoveryEm}>20 feet away</Text>
              {'\n'}for 20 seconds
            </Text>
            <View style={styles.recoveryRing}>
              <Animated.Text
                key={recoverySecs}
                entering={FadeIn.duration(280)}
                style={[styles.recoveryNum, { color: ACCENT }]}
              >
                {recoverySecs}
              </Animated.Text>
            </View>
            {recoverySecs > 0 ? (
              <TouchableOpacity onPress={finishSession} hitSlop={8} activeOpacity={0.7}>
                <Text style={styles.recoverySkip}>Skip rest</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.recoveryDoneText}>Well done</Text>
            )}
          </Animated.View>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <Animated.View style={[styles.doneRoot, completionStyle]}>
            <ScrollView contentContainerStyle={styles.doneScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroRing}>
                <CheckCircle2 size={44} color={ACCENT} strokeWidth={1.8} />
              </View>
              <Text style={styles.heroTitle}>Excellent work</Text>
              <Text style={styles.heroSub}>Your eyes should feel lighter.{'\n'}Take one slow blink.</Text>
              <Text style={styles.heroMeta}>Rested for {formatTotal(TOTAL_DURATION)}</Text>
              <GlassCard style={styles.completionRow}>
                <View style={styles.completionStat}><Text style={styles.completionValue}>{STEPS.length}</Text><Text style={styles.completionLabel}>exercises</Text></View>
                <View style={styles.completionDivider} />
                <View style={styles.completionStat}><Text style={styles.completionValue}>{formatTotal(TOTAL_DURATION)}</Text><Text style={styles.completionLabel}>rested</Text></View>
                <View style={styles.completionDivider} />
                <View style={styles.completionStat}><Text style={styles.completionValue}>{streak}</Text><Text style={styles.completionLabel}>day streak</Text></View>
              </GlassCard>
              <GradientCTA
                label="DONE"
                onPress={() => router.back()}
                textColor="#03212C"
                letterSpacing={1.5}
                style={styles.cta}
              />
              <TouchableOpacity style={styles.secondaryBtn} onPress={repeatSession} activeOpacity={0.7}>
                <RotateCcw size={14} color={ACCENT} />
                <Text style={styles.secondaryBtnText}>Repeat</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}

        {/* EXIT CONFIRM */}
        {exitConfirm && (
          <View style={styles.confirmOverlay}>
            <GlassCard style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Leave session?</Text>
              <Text style={styles.confirmSub}>Progress for this exercise won&apos;t be saved.</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.confirmStay} onPress={() => setExitConfirm(false)} activeOpacity={0.8}>
                  <Text style={styles.confirmStayText}>Keep going</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLeave} onPress={exitNow} activeOpacity={0.8}>
                  <Text style={styles.confirmLeaveText}>Leave</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND.base },
  safe: { flex: 1 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerTitleText: { fontFamily: FONTS.heading, fontSize: 16, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.4 },
  headerProgress: { flex: 1, gap: 7 },
  exerciseCount: {
    fontSize: 11, fontWeight: '700', color: colors.text.secondary,
    letterSpacing: 0.6, textAlign: 'center',
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotDone: { backgroundColor: ACCENT, opacity: 0.55 },
  dotActive: { width: 18, backgroundColor: ACCENT },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: ACCENT, borderRadius: 2 },

  iconSpacer: { width: 44, height: 44 },

  // Idle — hero
  idleRoot: { flex: 1 },
  idleScroll: { paddingHorizontal: SPACING.screenH, paddingVertical: 8, paddingBottom: 16, alignItems: 'center', gap: 3 },
  idleCtaBar: { paddingHorizontal: SPACING.screenH, paddingTop: 10, paddingBottom: 14 },
  heroWrap: { width: 80, height: 76, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  heroGlow: {
    position: 'absolute',
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(0,224,255,0.22)',
  },
  // Dedicated smaller ring for the idle hero only — the shared `heroRing`
  // below stays untouched since calibrate/recovery/done all reuse it.
  idleEyeRing: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 1.5, borderColor: ACCENT + '55',
    backgroundColor: 'rgba(0,224,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 1.5, borderColor: ACCENT + '55',
    backgroundColor: 'rgba(0,224,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 27, fontWeight: '900', color: colors.text.primary, textAlign: 'center', letterSpacing: 0.3, marginTop: 2 },
  heroSub: { fontSize: 14.5, color: colors.text.secondary, textAlign: 'center' },
  heroMeta: { fontSize: 12.5, color: colors.text.tertiary, fontWeight: '600', letterSpacing: 0.3, marginTop: 2, marginBottom: 10 },

  // Idle — summary chips (replaces the old plain-text meta line)
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  summaryChipText: { fontSize: 11.5, fontWeight: '600', color: colors.text.tertiary },

  // Idle — exercise list
  stepList: { alignSelf: 'stretch' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9, paddingHorizontal: 4 },
  stepRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)' },
  iconBadge: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepRowInfo: { flex: 1, gap: 2 },
  stepRowTitle: { fontFamily: FONTS.headingSemi, fontSize: 18, fontWeight: '600', color: colors.text.primary },
  stepRowDesc: { fontSize: 14, color: colors.text.tertiary, lineHeight: 17 },
  stepRowDur: { fontSize: 12, color: colors.text.primary, fontWeight: '600' },

  // Idle — benefits
  benefits: { alignSelf: 'stretch', paddingHorizontal: 6, marginTop: 10, marginBottom: 16, gap: 9 },
  benefitsTitle: { fontFamily: FONTS.headingSemi, fontSize: 16, fontWeight: '700', color: colors.text.secondary, letterSpacing: 0.2, marginBottom: 2 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },

  // Optional self-reported comfort check-ins
  checkinRoot: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.screenH },
  checkinCard: { gap: 14 },
  checkinKicker: { fontSize: 11, fontWeight: '800', color: ACCENT, letterSpacing: 1.6 },
  checkinTitle: { fontFamily: FONTS.heading, fontSize: 23, fontWeight: '800', color: colors.text.primary, lineHeight: 29 },
  checkinSub: { fontSize: 13, color: colors.text.secondary, lineHeight: 19 },
  comfortOptions: { gap: 8, marginVertical: 4 },
  comfortOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 48, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  comfortOptionSelected: {
    borderColor: ACCENT + '88',
    backgroundColor: ACCENT + '16',
  },
  comfortNumber: { width: 22, fontSize: 14, fontWeight: '800', color: colors.text.tertiary },
  comfortLabel: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  comfortTextSelected: { color: ACCENT },
  comfortOutcome: { fontSize: 12.5, color: colors.text.secondary, lineHeight: 18 },
  checkinSkip: { paddingVertical: 4, textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.text.tertiary },

  cta: { alignSelf: 'stretch' },

  // Active phase — immersive
  activeRoot: { flex: 1 },
  activeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  activeTop: { alignItems: 'center', gap: 4, marginBottom: 12 },
  stepName: { fontFamily: FONTS.heading, fontSize: 21, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.2 },
  stepWhat: { fontSize: 13.5, color: colors.text.secondary },
  activeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remainingBlock: { alignItems: 'center', gap: 4, marginBottom: 12 },
  remainingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  activeRemaining: { fontSize: 13, color: colors.text.tertiary, fontWeight: '600' },
  activeRemainingNum: { fontFamily: FONTS.heading, fontSize: 42, fontWeight: '900' },
  rotatingTip: { fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: '500', letterSpacing: 0.3 },
  activeControls: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, paddingBottom: 20 },
  controlGroup: { alignItems: 'center', gap: 7 },
  pauseBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,224,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: ACCENT + '66',
  },
  skipBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
  },
  controlLabel: { fontSize: 11, color: colors.text.tertiary, fontWeight: '600', letterSpacing: 0.3 },

  // Paused overlay — strong blur + dark scrim, game visible but unreachable
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', zIndex: 10,
  },
  pausedScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3,8,11,0.72)',
  },
  pauseCard: {
    width: '88%', maxWidth: 360,
    backgroundColor: 'rgba(22,22,32,0.92)',
    borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: GLASS_CARD.border,
    paddingVertical: 28, paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4, shadowRadius: 40, elevation: 20,
  },
  pauseIconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1.5, borderColor: ACCENT + '55',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  pausedTitle: { fontFamily: FONTS.heading, fontSize: 26, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.3 },
  pausedSub: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  pausedDivider: { alignSelf: 'stretch', height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 20, marginBottom: 20 },
  pausedResumeCta: { alignSelf: 'stretch' },
  pausedTextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 14,
  },
  pausedTextBtnLabel: { fontSize: 13.5, fontWeight: '700', color: colors.text.secondary },
  pausedEndBtn: { paddingTop: 2, paddingBottom: 4 },
  pausedEndBtnText: { fontSize: 12, fontWeight: '600', color: STATUS_COLORS.error, opacity: 0.85 },

  // Calibration beat
  calibrateRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  calibrateTitle: { fontFamily: FONTS.heading, fontSize: 19, fontWeight: '800', color: colors.text.primary, marginBottom: 2 },
  calibrateLine: { fontSize: 15.5, color: colors.text.secondary, textAlign: 'center', lineHeight: 23 },
  calibrateSkip: { marginTop: 14 },

  // 3-2-1 beat
  prepRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prepNum: {
    fontFamily: FONTS.heading,
    fontSize: 96, fontWeight: '200', letterSpacing: 1,
    textShadowColor: 'rgba(0,224,255,0.35)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },

  // Live tracking cue
  trackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(0,224,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.28)',
    marginBottom: 10,
  },
  trackingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  trackingText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, color: ACCENT },

  // Next-up preview chip (slot reserves the space even while empty)
  nextUpSlot: { height: 30, marginBottom: 10, justifyContent: 'center' },
  nextUpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.25)',
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
  },
  nextUpLabel: { fontSize: 9.5, fontWeight: '800', color: ACCENT, letterSpacing: 1.5 },
  nextUpTitle: { fontSize: 12.5, fontWeight: '700', color: colors.text.primary },

  // 20-20-20 recovery
  recoveryRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  recoveryKicker: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' },
  recoveryTitle: { fontFamily: FONTS.heading, fontSize: 24, fontWeight: '900', color: colors.text.primary, letterSpacing: 0.3 },
  recoverySub: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 24, marginTop: 6 },
  recoveryEm: { fontSize: 17, fontWeight: '800', color: colors.text.primary },
  recoveryRing: {
    width: 128, height: 128, borderRadius: 64, marginVertical: 22,
    borderWidth: 2, borderColor: 'rgba(0,224,255,0.4)',
    backgroundColor: 'rgba(0,224,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  recoveryNum: { fontSize: 46, fontWeight: '200' },
  recoverySkip: { fontSize: 13, fontWeight: '600', color: colors.text.tertiary, padding: 8 },
  recoveryDoneText: { fontSize: 14, fontWeight: '700', color: '#6ee7b7' },

  // Interstitial beat
  interstitial: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(3,8,11,0.55)',
  },
  interstitialCheck: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,224,255,0.12)',
    borderWidth: 1.5, borderColor: ACCENT + '66',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  interstitialGreat: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 0.6 },
  interstitialDone: { fontFamily: FONTS.heading, fontSize: 17, fontWeight: '800', color: colors.text.primary },
  interstitialBreath: { fontSize: 12.5, color: colors.text.tertiary, marginTop: 2 },
  interstitialNextLabel: { fontSize: 11, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 2, textTransform: 'uppercase', marginTop: 10 },
  interstitialNext: { fontSize: 15, fontWeight: '700', color: ACCENT },

  // Done
  doneRoot: { flex: 1, alignSelf: 'stretch', paddingHorizontal: 16 },
  doneScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10 },
  secondaryBtnText: { fontSize: 13, color: ACCENT, fontWeight: '700' },
  completionRow: {
    alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  completionStat: { alignItems: 'center', gap: 3 },
  completionValue: { fontSize: 17, fontWeight: '900', color: ACCENT },
  completionLabel: { fontSize: 11, color: colors.text.tertiary, fontWeight: '600', letterSpacing: 0.4 },
  completionDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Exit confirm
  confirmOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3,8,11,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  confirmCard: { width: '100%', maxWidth: 360, gap: 10 },
  confirmTitle: { fontFamily: FONTS.heading, fontSize: 17, fontWeight: '800', color: colors.text.primary },
  confirmSub: { fontSize: 13, color: colors.text.secondary, lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  confirmStay: { flex: 1, backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  confirmStayText: { fontSize: 13, fontWeight: '800', color: '#03212c' },
  confirmLeave: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(255,95,114,0.5)', paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  confirmLeaveText: { fontSize: 13, fontWeight: '700', color: STATUS_COLORS.error },
});
