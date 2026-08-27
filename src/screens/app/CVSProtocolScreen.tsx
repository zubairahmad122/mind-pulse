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
  Volume2,
  VolumeX,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
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
import { EyeGuideButton, EyeGuideSheet, type EyeGuideContent } from '@/components/eye/EyeGuideSheet';
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
import { useEyeAudioGuide } from '@/hooks/useEyeAudioGuide';

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

// Guide-sheet copy per exercise — instructional only, read alongside each
// STEPS entry's real title/icon/accent/duration so nothing drifts.
const STEP_GUIDE_COPY: Record<string, { purpose: string; steps: string[] }> = {
  circle: {
    purpose: 'Follow the moving target around the circular path.',
    steps: [
      'Keep your head comfortably still.',
      'Follow the highlighted target with your eyes.',
      'Move your gaze smoothly around the circle.',
      'Blink normally.',
    ],
  },
  square: {
    purpose: 'Guide your gaze along each side of the square.',
    steps: [
      'Watch the highlighted target.',
      'Follow it along each straight edge.',
      'Let your eyes change direction naturally at each corner.',
      'Keep your head comfortably still.',
    ],
  },
  triangle: {
    purpose: 'Follow the target through the three corners.',
    steps: [
      'Follow the highlighted target.',
      'Move your gaze from corner to corner.',
      'Keep movements comfortable and controlled.',
      'Blink naturally.',
    ],
  },
  cardinal: {
    purpose: 'Move your attention between highlighted points.',
    steps: [
      'Watch for the glowing point.',
      'Shift your gaze directly to it.',
      'Pause briefly on each point.',
      'Wait for the next point to activate.',
    ],
  },
  saccade: {
    purpose: 'Shift your gaze between highlighted targets.',
    steps: [
      'Look at the active glowing point.',
      'When the next point lights up, move your gaze to it.',
      'Avoid moving your head unnecessarily.',
      'Blink normally.',
    ],
  },
  convergence: {
    purpose: 'Follow the target as the visual focus changes.',
    steps: [
      'Focus on the highlighted target.',
      'Follow the visual cue as it changes position/depth.',
      'Let your eyes adjust naturally.',
      'Do not strain to keep the image perfectly sharp.',
    ],
  },
  nearfar: {
    purpose: 'Alternate attention between the two highlighted targets.',
    steps: [
      'Look at the active target.',
      'When the second target activates, shift your gaze.',
      'Continue alternating at the guided pace.',
      'Keep the movement comfortable.',
    ],
  },
};

function stepGuideContent(s: EyeStep): EyeGuideContent {
  const copy = STEP_GUIDE_COPY[s.id];
  return {
    title: s.title,
    description: copy.purpose,
    steps: copy.steps,
    duration: `${s.durationSeconds} sec`,
    icon: s.icon,
    accent: s.accent,
  };
}

const EYE_RESET_GUIDE_STEPS = [
  'Sit comfortably about 40–60 cm from the screen.',
  'Keep your head comfortably still.',
  'Follow the highlighted target with your eyes.',
  'Blink naturally and avoid forcing the movement.',
  'Pause or skip an exercise whenever needed.',
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

const EYE_RESET_GUIDE_CONTENT: EyeGuideContent = {
  title: 'Eye Reset',
  description: 'A short guided screen break with seven visual activities.',
  steps: EYE_RESET_GUIDE_STEPS,
  duration: `${formatTotal(TOTAL_DURATION)} · ${STEPS.length} activities`,
  icon: Eye,
  accent: ACCENT,
};

const COMFORT_OPTIONS: { value: EyeComfortRating; label: string }[] = [
  { value: 1, label: 'Comfortable' },
  { value: 2, label: 'Slight' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Severe' },
];

function StepGuide({ stepId, active, size }: { stepId: string; active: boolean; size?: number }) {
  const ARENA = 260;
  const needsScale = size != null && size !== ARENA;
  const inner = (() => {
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
  })();
  if (!needsScale) return inner;
  const scale = size / ARENA;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: ARENA, height: ARENA, transform: [{ scale }] }}>
        {inner}
      </View>
    </View>
  );
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
  return (
    <View style={[styles.iconBadge, { backgroundColor: accent + '14', borderColor: accent + '30' }]}>
      <Icon size={20} color={accent} strokeWidth={2} />
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
  const audioGuide = useEyeAudioGuide();

  /** Gated play — only plays if audio guide is enabled. */
  const guidedPlay: typeof play = useCallback(
    (clipId, delayMs, volume, opts) => {
      if (!audioGuide.enabled) { opts?.onDone?.(); return; }
      play(clipId, delayMs, volume, opts);
    },
    [audioGuide.enabled, play],
  );

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
  // Guide sheet — instructional only. Never mutates exercise/session state
  // beyond reusing the existing `paused` pause/resume path below.
  const [guideOpen, setGuideOpen] = useState(false);
  // True only when opening Guide is what paused the session — so closing it
  // resumes only what Guide itself paused, never a pause the user already had.
  const guidePausedByGuideRef = useRef(false);
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
  // Countdown number: a settle-to-1 pulse on every tick, never a from-zero
  // "entering" animation — a dropped/late frame can only mean less punch on
  // the pulse, never a number stuck invisible.
  const secondsPulse = useSharedValue(1);
  // Same robust pattern for the 20-20-20 rest countdown.
  const recoveryPulse = useSharedValue(1);

  const { width: screenW } = useWindowDimensions();
  // Responsive canvas: 88% width, clamped for small screens.
  const canvasSize = Math.min(Math.round(screenW * 0.88), 320);
  const guideSize = Math.max(canvasSize - 30, 200);

  // Stop narration immediately if audio guide is toggled off mid-session.
  useEffect(() => {
    if (!audioGuide.enabled && (phase === 'active' || phase === 'calibrate' || phase === 'countdown')) {
      stopVoice();
    }
  }, [audioGuide.enabled, phase, stopVoice]);

  const step = STEPS[stepIndex];
  const guideContent: EyeGuideContent =
    phase === 'active' || phase === 'countdown' ? stepGuideContent(step) : EYE_RESET_GUIDE_CONTENT;

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
    guidedPlay(STEP_CLIPS[STEPS[stepIndex].id], stepIndex === 0 ? 400 : 1100, 1);
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

  // Countdown number pulse — every tick, quickly dip and settle back to
  // fully opaque. The target is always 1, so a stalled/dropped animation
  // frame just means a flatter pulse, never an invisible number. A fresh
  // exercise must never inherit a leftover low-opacity mid-pulse from the
  // previous one, so a step change snaps straight to fully visible instead
  // of pulsing.
  const lastPulseStepRef = useRef(stepIndex);
  useEffect(() => {
    if (lastPulseStepRef.current !== stepIndex) {
      lastPulseStepRef.current = stepIndex;
      secondsPulse.value = 1;
      return;
    }
    secondsPulse.value = withSequence(
      withTiming(0.35, { duration: 90 }),
      withTiming(1, { duration: 180 }),
    );
  }, [secondsLeft, stepIndex, secondsPulse]);

  useEffect(() => {
    if (phase !== 'recovery') return;
    recoveryPulse.value = withSequence(
      withTiming(0.35, { duration: 90 }),
      withTiming(1, { duration: 180 }),
    );
  }, [recoverySecs, phase, recoveryPulse]);

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
    // Clean, sequential transition (~900ms total): fade the finishing
    // exercise out, hold the "complete → next" beat, let it fully fade out
    // (its own `exiting` animation), and only THEN swap the step and reveal
    // the next exercise. The step swap and content reveal never happen while
    // the interstitial is still visible or mid-exit, so the next exercise's
    // guide/target can never render underneath stale "complete" text.
    clearInterstitialTimers();
    setInterstitial({
      doneTitle: step.title,
      nextTitle: STEPS[next].title,
      encouragement: ENCOURAGEMENT[stepIndex],
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    contentOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.ease) });
    interstitialTimersRef.current.push(setTimeout(() => {
      if (isBackgroundedRef.current) { pendingStepRef.current = next; return; }
      setInterstitial(null); // begins its own ~200ms exiting FadeOut
    }, 500));
    interstitialTimersRef.current.push(setTimeout(() => {
      if (isBackgroundedRef.current) { pendingStepRef.current = next; return; }
      applyStepAdvance(next);
      contentOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      void Haptics.selectionAsync();
    }, 700));
  }

  // Opening Guide during a live exercise reuses the exact same pause path as
  // the Pause button (freezes the session clock, pauses voice/target
  // animation) — no second pause system. The "Session Paused" overlay is
  // suppressed while Guide is open (see its render guard below) so the two
  // don't stack. Closing resumes only if Guide itself paused it.
  function openGuide() {
    if (phase === 'active' && !paused) {
      guidePausedByGuideRef.current = true;
      pauseVoice();
      setPaused(true);
    }
    void Haptics.selectionAsync();
    setGuideOpen(true);
  }
  function closeGuide() {
    setGuideOpen(false);
    if (guidePausedByGuideRef.current) {
      guidePausedByGuideRef.current = false;
      resumeVoice();
      setPaused(false);
    }
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
    // Frozen while Guide is open too — the 3-2-1 beat must never complete
    // behind the sheet and unexpectedly start the exercise.
    if (phase !== 'countdown' || cvsTimingBlocked(phase, isBackgrounded, false) || guideOpen) return;
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
  }, [phase, prepNum, contentOpacity, isBackgrounded, guideOpen]);

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
    guidedPlay('eyes/reset-intro', 400, 1, { protect: true, onDone: startPrep });
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
    guidedPlay('eyes/reset-complete', 500, 1, { protect: true });
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
  const secondsPulseStyle = useAnimatedStyle(() => ({ opacity: secondsPulse.value }));
  const recoveryPulseStyle = useAnimatedStyle(() => ({ opacity: recoveryPulse.value }));

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
          {(phase === 'idle' || phase === 'calibrate' || phase === 'countdown' || phase === 'active') && (
            <View style={styles.headerRightBtns}>
              <TouchableOpacity
                style={[styles.iconBtn, !audioGuide.enabled && styles.iconBtnMuted]}
                onPress={audioGuide.toggle}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={audioGuide.enabled ? 'Mute audio guide' : 'Enable audio guide'}
              >
                {audioGuide.enabled
                  ? <Volume2 size={18} color={ACCENT} />
                  : <VolumeX size={18} color={colors.text.secondary} />}
              </TouchableOpacity>
              <EyeGuideButton
                variant="icon"
                accent={ACCENT}
                accessibilityLabel={
                  phase === 'active' || phase === 'countdown' ? `${step.title} guide` : 'Eye Reset guide'
                }
                onPress={openGuide}
              />
            </View>
          )}
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

            </ScrollView>

            {/* Audio Guide preference row */}
            <TouchableOpacity
              style={styles.audioGuideRow}
              onPress={audioGuide.toggle}
              activeOpacity={0.75}
              accessibilityRole="switch"
              accessibilityState={{ checked: audioGuide.enabled }}
              accessibilityLabel="Toggle audio guide narration"
            >
              <View style={styles.audioGuideIcon}>
                {audioGuide.enabled
                  ? <Volume2 size={16} color={ACCENT} />
                  : <VolumeX size={16} color={colors.text.tertiary} />}
              </View>
              <View style={styles.audioGuideCopy}>
                <Text style={styles.audioGuideLabel}>Audio Guide</Text>
                <Text style={styles.audioGuideSub}>Spoken guidance during the session</Text>
              </View>
              <Text style={[styles.audioGuideValue, !audioGuide.enabled && styles.audioGuideValueOff]}>
                {audioGuide.enabled ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>

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
            <Text style={styles.prepContext}>{step.title}</Text>
            <Text style={styles.prepStartsIn}>Starts in</Text>
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
                  size={canvasSize} strokeWidth={1.5} duration={step.durationSeconds}
                  active={!paused && !interstitial} paused={paused} resetKey={stepIndex}
                  color={step.accent} trackColor="rgba(255,255,255,0.015)" gradient={false}
                  strokeOpacity={0.2}
                >
                  <LottieGuide stepId={step.id} active={!paused && !interstitial} size={guideSize} speed={0.85}
                    fallback={<StepGuide stepId={step.id} active={!paused && !interstitial} size={guideSize} />}
                  />
                </StepCountdownRing>
              </View>

              <View style={styles.remainingBlock}>
                <Animated.Text
                  style={[styles.activeRemaining, secondsPulseStyle]}
                >
                  {secondsLeft}s remaining
                </Animated.Text>
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

              {/* Controls — Visual Flow pill language: primary + secondary */}
              <View style={styles.activeControls}>
                <TouchableOpacity style={styles.pauseBtnPill} onPress={togglePause} activeOpacity={0.85}>
                  {paused
                    ? <Play size={15} color={ACCENT} fill={ACCENT} />
                    : <Pause size={15} color={ACCENT} fill={ACCENT} />}
                  <Text style={styles.pauseBtnPillText}>{paused ? 'Resume Session' : 'Pause Session'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipBtnPill} onPress={skipStep} activeOpacity={0.7} hitSlop={8}>
                  <Text style={styles.skipBtnPillText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Paused — a calm glass card over a blurred game, not a floating menu */}
            {paused && resumeCountdown === null && !guideOpen && (
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
                      guidedPlay(STEP_CLIPS[step.id], 400, 1);
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
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
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
              <Animated.Text style={[styles.recoveryNum, recoveryPulseStyle]}>
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

        <EyeGuideSheet visible={guideOpen} content={guideContent} onClose={closeGuide} />

        {/* EXIT CONFIRM */}
        {exitConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Leave Eye Reset?</Text>
              <Text style={styles.confirmSub}>Your current session will stop.</Text>
              <TouchableOpacity style={styles.confirmStay} onPress={() => setExitConfirm(false)} activeOpacity={0.85}>
                <Text style={styles.confirmStayText}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmLeave} onPress={exitNow} activeOpacity={0.7}>
                <Text style={styles.confirmLeaveText}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND.base },
  safe: { flex: 1 },
  // Header — matching Visual Flow
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 16 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerTitleText: { fontFamily: FONTS.heading, fontSize: 15, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.3 },
  headerProgress: { flex: 1, gap: 6 },
  exerciseCount: {
    fontSize: 10.5, fontWeight: '700', color: colors.text.secondary,
    letterSpacing: 0.5, textAlign: 'center',
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.10)' },
  dotDone: { backgroundColor: ACCENT, opacity: 0.5 },
  dotActive: { width: 16, backgroundColor: ACCENT },
  progressTrack: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 2.5, backgroundColor: ACCENT, borderRadius: 2 },

  iconSpacer: { width: 40, height: 40 },
  headerRightBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtnMuted: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' },

  // Idle — hero
  idleRoot: { flex: 1 },
  idleScroll: { paddingHorizontal: SPACING.screenH, paddingVertical: 6, paddingBottom: 14, alignItems: 'center', gap: 2 },
  idleCtaBar: { paddingHorizontal: SPACING.screenH, paddingTop: 8, paddingBottom: 12 },
  heroWrap: { width: 72, height: 68, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  heroGlow: {
    position: 'absolute',
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(0,224,255,0.18)',
  },
  // Dedicated smaller ring for the idle hero only — the shared `heroRing`
  // below stays untouched since calibrate/recovery/done all reuse it.
  idleEyeRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5, borderColor: ACCENT + '44',
    backgroundColor: 'rgba(0,224,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5, borderColor: ACCENT + '44',
    backgroundColor: 'rgba(0,224,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 24, fontWeight: '900', color: colors.text.primary, textAlign: 'center', letterSpacing: 0.3, marginTop: 4 },
  heroSub: { fontSize: 13.5, color: colors.text.secondary, textAlign: 'center', lineHeight: 19 },
  heroMeta: { fontSize: 12, color: colors.text.tertiary, fontWeight: '600', letterSpacing: 0.3, marginTop: 2, marginBottom: 10 },

  // Idle — summary chips (replaces the old plain-text meta line)
  summaryRow: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 12 },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  summaryChipText: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },

  // Idle — exercise list
  stepList: { alignSelf: 'stretch', paddingVertical: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  stepRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  iconBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepRowInfo: { flex: 1, gap: 1 },
  stepRowTitle: { fontFamily: FONTS.headingSemi, fontSize: 15, fontWeight: '600', color: colors.text.primary },
  stepRowDesc: { fontSize: 12.5, color: colors.text.tertiary, lineHeight: 16 },
  stepRowDur: { fontSize: 12, color: colors.text.tertiary, fontWeight: '600' },

  // Optional self-reported comfort check-ins
  checkinRoot: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.screenH },
  checkinCard: { gap: 12 },
  checkinKicker: { fontSize: 10, fontWeight: '800', color: ACCENT, letterSpacing: 1.8, textTransform: 'uppercase' },
  checkinTitle: { fontFamily: FONTS.heading, fontSize: 20, fontWeight: '800', color: colors.text.primary, lineHeight: 26 },
  checkinSub: { fontSize: 12, color: colors.text.secondary, lineHeight: 17 },
  comfortOptions: { gap: 6, marginVertical: 2 },
  comfortOption: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    minHeight: 44, paddingHorizontal: 13,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  comfortOptionSelected: {
    borderColor: ACCENT + '77',
    backgroundColor: ACCENT + '12',
  },
  comfortNumber: { width: 20, fontSize: 13, fontWeight: '800', color: colors.text.tertiary },
  comfortLabel: { fontSize: 13.5, fontWeight: '600', color: colors.text.secondary },
  comfortTextSelected: { color: ACCENT },
  comfortOutcome: { fontSize: 12, color: colors.text.secondary, lineHeight: 17 },
  checkinSkip: { paddingVertical: 6, textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: colors.text.tertiary },

  cta: { alignSelf: 'stretch' },

  // Audio Guide preference row (overview)
  audioGuideRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  audioGuideIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT + '12', borderWidth: 1, borderColor: ACCENT + '25',
  },
  audioGuideCopy: { flex: 1 },
  audioGuideLabel: { fontFamily: FONTS.headingSemi, fontSize: 13, fontWeight: '600', color: colors.text.primary },
  audioGuideSub: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },
  audioGuideValue: { fontSize: 12, fontWeight: '700', color: ACCENT },
  audioGuideValueOff: { color: colors.text.secondary },

  // Active phase — immersive, matching Visual Flow design language
  activeRoot: { flex: 1 },
  activeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  activeTop: { alignItems: 'center', gap: 3, marginBottom: 12 },
  stepName: { fontFamily: FONTS.heading, fontSize: 20, fontWeight: '700', color: colors.text.primary },
  stepWhat: { fontSize: 13.5, color: colors.text.secondary, textAlign: 'center', marginTop: 3 },
  activeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remainingBlock: { alignItems: 'center', gap: 6, marginBottom: 16 },
  remainingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  activeRemaining: { fontSize: 13.5, fontWeight: '600', color: 'rgba(245,247,251,0.62)', fontVariant: ['tabular-nums'] },
  activeRemainingNum: { fontFamily: FONTS.heading, fontSize: 13.5, fontWeight: '600', color: 'rgba(245,247,251,0.62)' },
  rotatingTip: { fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontWeight: '500', letterSpacing: 0.3 },
  activeControls: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingBottom: 24 },
  pauseBtnPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.button,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pauseBtnPillText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  skipBtnPill: {
    paddingVertical: 6, paddingHorizontal: 4,
  },
  skipBtnPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(245,247,251,0.55)' },

  // Paused overlay — strong blur + dark scrim, game visible but unreachable
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', zIndex: 10,
  },
  pausedScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9,9,15,0.92)',
  },
  pauseCard: {
    width: '86%', maxWidth: 340,
    backgroundColor: '#11162a',
    borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 24, paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45, shadowRadius: 36, elevation: 20,
  },
  pauseIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: ACCENT + '14',
    borderWidth: 1, borderColor: ACCENT + '38',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  pausedTitle: { fontFamily: FONTS.heading, fontSize: 20, fontWeight: '800', color: colors.text.primary },
  pausedSub: { fontSize: 13, lineHeight: 19, color: colors.text.secondary, textAlign: 'center', marginTop: 6 },
  pausedDivider: { alignSelf: 'stretch', height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 20, marginBottom: 20 },
  pausedResumeCta: { alignSelf: 'stretch' },
  pausedTextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 14,
  },
  pausedTextBtnLabel: { fontSize: 13.5, fontWeight: '700', color: colors.text.secondary },
  pausedEndBtn: { paddingTop: 2, paddingBottom: 4 },
  pausedEndBtnText: { fontSize: 12, fontWeight: '600', color: STATUS_COLORS.error, opacity: 0.85 },

  // Calibration beat — compact immersive preparation
  calibrateRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40, paddingBottom: 40 },
  calibrateTitle: { fontFamily: FONTS.heading, fontSize: 17, fontWeight: '800', color: colors.text.primary, marginBottom: 2 },
  calibrateLine: { fontSize: 14, fontWeight: '500', color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  calibrateSkip: { marginTop: 10 },

  // 3-2-1 beat
  prepRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  prepContext: {
    fontFamily: FONTS.headingSemi, fontSize: 14, fontWeight: '700',
    color: colors.text.primary, letterSpacing: 0.2,
  },
  prepStartsIn: {
    fontSize: 11, fontWeight: '600', color: colors.text.tertiary,
    letterSpacing: 0.3, marginBottom: 6,
  },
  prepNum: {
    fontFamily: FONTS.heading,
    fontSize: 56, fontWeight: '200', letterSpacing: 1,
    textShadowColor: 'rgba(0,224,255,0.30)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14,
  },

  // Next-up preview chip (slot reserves the space even while empty)
  nextUpSlot: { height: 28, marginBottom: 8, justifyContent: 'center' },
  nextUpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,224,255,0.20)',
    borderRadius: 100, paddingHorizontal: 13, paddingVertical: 5,
  },
  nextUpLabel: { fontSize: 9, fontWeight: '800', color: ACCENT, letterSpacing: 1.5 },
  nextUpTitle: { fontSize: 12, fontWeight: '700', color: colors.text.primary },

  // 20-20-20 recovery — compact premium
  recoveryRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 32 },
  recoveryKicker: { fontSize: 11, fontWeight: '800', color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' },
  recoveryTitle: { fontFamily: FONTS.heading, fontSize: 21, fontWeight: '900', color: colors.text.primary, letterSpacing: 0.3 },
  recoverySub: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 21, marginTop: 4 },
  recoveryEm: { fontSize: 15, fontWeight: '800', color: colors.text.primary },
  recoveryRing: {
    width: 110, height: 110, borderRadius: 55, marginVertical: 18,
    borderWidth: 1.5, borderColor: 'rgba(0,224,255,0.30)',
    backgroundColor: 'rgba(3,8,11,0.50)',
    alignItems: 'center', justifyContent: 'center',
  },
  recoveryNum: { fontFamily: FONTS.heading, fontSize: 38, fontWeight: '700', color: '#EAFBFF' },
  recoverySkip: { fontSize: 12.5, fontWeight: '600', color: colors.text.secondary, padding: 8 },
  recoveryDoneText: { fontSize: 13, fontWeight: '700', color: '#6ee7b7' },

  // Interstitial beat — matching Visual Flow dark style
  interstitial: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: 'rgba(9,9,15,0.85)',
  },
  interstitialCheck: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,224,255,0.10)',
    borderWidth: 1.5, borderColor: ACCENT + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  interstitialGreat: { fontSize: 12, fontWeight: '700', color: ACCENT, letterSpacing: 0.6 },
  interstitialDone: { fontFamily: FONTS.heading, fontSize: 16, fontWeight: '800', color: colors.text.primary },
  interstitialBreath: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  interstitialNextLabel: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 8 },
  interstitialNext: { fontSize: 14, fontWeight: '700', color: ACCENT },

  // Done — completion screen
  doneRoot: { flex: 1, alignSelf: 'stretch', paddingHorizontal: 16 },
  doneScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 20 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8 },
  secondaryBtnText: { fontSize: 12.5, color: ACCENT, fontWeight: '700' },
  completionRow: {
    alignSelf: 'stretch',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  completionStat: { alignItems: 'center', gap: 3 },
  completionValue: { fontSize: 17, fontWeight: '900', color: ACCENT },
  completionLabel: { fontSize: 11, color: colors.text.tertiary, fontWeight: '600', letterSpacing: 0.4 },
  completionDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Exit confirm — matching Visual Flow glass card
  confirmOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  confirmCard: { width: '100%', maxWidth: 340, borderRadius: RADIUS.card, padding: 20, gap: 6, backgroundColor: '#11162a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  confirmTitle: { fontFamily: FONTS.heading, fontSize: 17, fontWeight: '800', color: colors.text.primary },
  confirmSub: { fontSize: 13, lineHeight: 18, color: colors.text.secondary, marginBottom: 10 },
  confirmActions: { gap: 8 },
  confirmStay: { height: 46, borderRadius: RADIUS.button, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT + '1f', borderWidth: 1, borderColor: ACCENT + '55' },
  confirmStayText: { fontSize: 14.5, fontWeight: '700', color: ACCENT },
  confirmLeave: { height: 44, alignItems: 'center', justifyContent: 'center' },
  confirmLeaveText: { fontSize: 13.5, fontWeight: '600', color: colors.text.tertiary },
});
