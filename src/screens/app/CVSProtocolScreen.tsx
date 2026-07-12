import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronLeft,
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
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
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
import type { AudioClipId } from '@/constants/audioGuide';
import { PILLAR_THEME } from '@/constants/theme';
import { PillarProvider } from '@/context/PillarContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioGuide } from '@/hooks/useAudioGuide';
import { useEyeProgress } from '@/hooks/useEyeProgress';

// One accent for the whole Eyes feature — matches the Eye tab.
const EYES = PILLAR_THEME.eyes;
const ACCENT = EYES.accent;

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
const STEPS: EyeStep[] = [
  { id: 'circle', icon: RotateCw, accent: '#7dd3fc', title: 'Circle Tracking', durationSeconds: 25, what: 'Follow the moving circle', coach: 'Keep your head still. Follow the glowing dot using only your eyes.', intro: 'Circle. Follow the orbiting dot smoothly with your eyes only. Keep your head still.', cues: [{ atSec: 12, text: 'Stay smooth — no jumping.' }] },
  { id: 'square', icon: Square, accent: '#a5b4fc', title: 'Square Tracking', durationSeconds: 25, what: 'Follow the moving square', coach: 'Move your eyes smoothly along the square.', intro: 'Square. Trace the square path — this trains your horizontal and vertical eye muscles.', cues: [{ atSec: 12, text: 'Corners train both directions together.' }] },
  { id: 'triangle', icon: Triangle, accent: '#6ee7b7', title: 'Triangle Tracking', durationSeconds: 25, what: 'Follow the moving triangle', coach: 'Let your eyes travel gently between each corner.', intro: 'Triangle. Follow the triangular path — this works your oblique muscles for diagonal gaze.', cues: [{ atSec: 12, text: 'Diagonals engage the obliques.' }] },
  { id: 'cardinal', icon: Grid3x3, accent: '#fcd34d', title: 'Nine-Dot Focus', durationSeconds: 30, what: 'Hold your gaze on nine points', coach: 'Pause briefly on each glowing point.', intro: 'Nine Dot Focus. We will visit all 9 gaze positions in order — training every eye muscle. Hold steady at each point.', cues: [{ atSec: 14, text: 'Each position works a different muscle.' }, { atSec: 24, text: 'Almost through all nine — keep holding.' }] },
  { id: 'saccade', icon: Zap, accent: '#fde68a', title: 'Quick Eye Movements', durationSeconds: 30, what: 'Snap between the glowing targets', coach: 'Move your eyes quickly between the two glowing dots. Keep your head still.', intro: 'Quick Eye Movements. Snap your eyes between targets through four phases. Each trains different eye muscles.', cues: [{ atSec: 8, text: 'Horizontal — side to side.' }, { atSec: 16, text: 'Vertical — up and down.' }, { atSec: 24, text: 'Diagonal — corner to corner.' }] },
  { id: 'convergence', icon: Minimize2, accent: '#fda4af', title: 'Near–Far Focus', durationSeconds: 40, what: 'Follow the dot toward your nose', coach: 'Focus on the dot as it moves closer, then farther away.', intro: 'Near Far Focus. Follow the dot as it comes closer. If you see double, look away and start again.', cues: [{ atSec: 12, text: 'Stop if it doubles or blurs.' }, { atSec: 24, text: 'Bring it back, slowly.' }, { atSec: 35, text: 'Two more cycles.' }], important: true },
  { id: 'nearfar', icon: ArrowLeftRight, accent: '#5eead4', title: 'Focus Shift', durationSeconds: 35, what: 'Switch focus between near and far', coach: 'Shift your focus between the glowing points.', intro: 'Focus Shift. Look at the near target, then shift to the far target. This trains your focusing muscle.', cues: [{ atSec: 14, text: 'Now near… now far.' }, { atSec: 28, text: 'Keep switching — stay relaxed.' }], important: true },
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

const BENEFITS = ['Reduce eye strain', 'Improve focus', 'Relax eye muscles'];

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
      <Animated.View style={[styles.heroRing, ringStyle]}>
        <Eye size={40} color={ACCENT} strokeWidth={1.8} />
      </Animated.View>
    </View>
  );
}

function StepIconBadge({ icon: Icon, accent }: { icon: LucideIcon; accent: string }) {
  // Uniform badges: one size, one stroke, one alpha recipe for every step.
  return (
    <View style={[styles.iconBadge, { backgroundColor: accent + '16', borderColor: accent + '40' }]}>
      <Icon size={19} color={accent} strokeWidth={2} />
    </View>
  );
}

function StepDots({ count, current }: { count: number; current: number }) {
  return <View style={styles.dotsRow}>{Array.from({ length: count }).map((_, i) => {
    const done = i < current; const active = i === current;
    return <View key={i} style={[styles.dot, done && styles.dotDone, active && styles.dotActive]} />;
  })}</View>;
}

type Phase = 'idle' | 'calibrate' | 'countdown' | 'active' | 'recovery' | 'done';
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
  const { play, stop: stopVoice, pause: pauseVoice, resume: resumeVoice } = useAudioGuide();

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(STEPS[0].durationSeconds);
  const [paused, setPaused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  // "✓ Circle Complete → Next: Square Tracking" beat between exercises.
  const [interstitial, setInterstitial] = useState<Interstitial>(null);
  // Rotating micro-tip shown under the countdown ("Blink naturally." …).
  const [tipIdx, setTipIdx] = useState(0);
  // 3-2-1 beat between calibration and the first exercise.
  const [prepNum, setPrepNum] = useState(3);
  // 20-20-20 recovery: look far away for 20s after the last exercise.
  const [recoverySecs, setRecoverySecs] = useState(20);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interstitialTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const contentOpacity = useSharedValue(1);
  const completionScale = useSharedValue(0.85);
  const completionOpacity = useSharedValue(0);
  // Per-exercise coaching line: visible at the start, fades out after ~3s so
  // the screen stays clean while the user tracks the target.
  const coachOpacity = useSharedValue(0);

  const step = STEPS[stepIndex];

  // Date.now() delta so background/resume doesn't skip seconds
  const lastTickRef = useRef(Date.now());

  function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }

  useEffect(() => {
    clearTimer();
    if (phase !== 'active' || paused || interstitial) return;
    if (secondsLeft <= 0) { goNext(); return; }
    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      // Consume only WHOLE elapsed seconds and advance the reference by
      // exactly that much. The old code reset the reference on every 500ms
      // tick, so the delta was always floor(0.5s) = 0 and the countdown
      // never moved.
      const delta = Math.floor((Date.now() - lastTickRef.current) / 1000);
      if (delta > 0) {
        lastTickRef.current += delta * 1000;
        setSecondsLeft(s => Math.max(0, s - delta));
      }
    }, 250); // fast checks keep the display accurate even after backgrounding
    return clearTimer;
  }, [phase, paused, secondsLeft, interstitial]);

  useEffect(() => () => {
    clearTimer();
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
    if (phase !== 'active' || paused || interstitial) return;
    const interval = setInterval(
      () => setTipIdx(i => (i + 1) % ROTATING_TIPS.length),
      TIP_ROTATE_MS,
    );
    return () => clearInterval(interval);
  }, [phase, paused, interstitial]);

  const elapsedBefore = STEPS.slice(0, stepIndex).reduce((s, x) => s + x.durationSeconds, 0);
  const elapsed = elapsedBefore + (step.durationSeconds - secondsLeft);
  const progressPct = Math.min(1, elapsed / TOTAL_DURATION);

  function goNext() {
    clearTimer();
    const next = stepIndex + 1;
    if (next >= STEPS.length) {
      contentOpacity.value = withTiming(0, { duration: 320 });
      interstitialTimersRef.current.push(setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecoverySecs(20);
        setPhase('recovery');
      }, 360));
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
      setStepIndex(next);
      setSecondsLeft(STEPS[next].durationSeconds);
    }, 420));
    interstitialTimersRef.current.push(setTimeout(() => {
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

  const activeStartedRef = useRef(false);
  function startPrep() {
    if (activeStartedRef.current) return;
    activeStartedRef.current = true;
    setPrepNum(3);
    setPhase('countdown');
  }

  // 3 → 2 → 1 → "Begin" → first exercise (light haptic per digit).
  useEffect(() => {
    if (phase !== 'countdown') return;
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
  }, [phase, prepNum, contentOpacity]);

  function begin() {
    void Haptics.selectionAsync();
    setStepIndex(0); setSecondsLeft(STEPS[0].durationSeconds); setPaused(false);
    activeStartedRef.current = false;
    // Calibration holds while the recorded session intro speaks (~20s),
    // then 3-2-1 into the first exercise. 30s cap in case audio stalls.
    setPhase('calibrate');
    play('eyes/reset-intro', 400, 1, { protect: true, onDone: startPrep });
    interstitialTimersRef.current.push(setTimeout(startPrep, 30000));
  }

  // Session end: 20-20-20 recovery first, then the celebration screen.
  function finishSession() {
    setPhase('done');
    void recordCompletion('eye-reset');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('eyes/reset-complete', 500, 1, { protect: true });
    completionOpacity.value = withTiming(1, { duration: 420 });
    completionScale.value = withTiming(1, { duration: 520 });
  }

  useEffect(() => {
    if (phase !== 'recovery') return;
    if (recoverySecs <= 0) {
      const t = setTimeout(finishSession, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRecoverySecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, recoverySecs]);

  function repeatSession() {
    void Haptics.selectionAsync();
    completionOpacity.value = 0; completionScale.value = 0.85;
    begin();
  }

  function exitNow() { clearTimer(); stopVoice(); setExitConfirm(false); router.back(); }

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const completionStyle = useAnimatedStyle(() => ({ opacity: completionOpacity.value, transform: [{ scale: completionScale.value }] }));
  const coachStyle = useAnimatedStyle(() => ({ opacity: coachOpacity.value }));

  return (
    <View style={styles.root}>
      <PillarProvider pillar="eyes"><AmbientBackground subtle /></PillarProvider>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (phase === 'active' ? setExitConfirm(true) : router.back())} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text.primary} />
          </TouchableOpacity>
          {phase === 'active' ? (
            <View style={styles.headerProgress}>
              <Text style={styles.exerciseCount}>Exercise {stepIndex + 1} of {STEPS.length}</Text>
              <StepDots count={STEPS.length} current={stepIndex} />
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} /></View>
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
            <Text style={styles.heroSub}>Reduce eye strain naturally</Text>
            <Text style={styles.heroMeta}>
              {formatTotal(TOTAL_DURATION)}  ·  {STEPS.length} exercises  ·  No equipment
            </Text>

            {/* Exercise list — icon + name + one-liner + duration */}
            <GlassCard style={styles.stepList}>
              {STEPS.map((s, i) => (
                <View key={s.id} style={[styles.stepRow, i > 0 && styles.stepRowBorder]}>
                  <StepIconBadge icon={s.icon} accent={s.accent} />
                  <View style={styles.stepRowInfo}>
                    <Text style={styles.stepRowTitle}>{s.title}</Text>
                    <Text style={styles.stepRowDesc}>{s.what}</Text>
                  </View>
                  <Text style={styles.stepRowDur}>{s.durationSeconds} sec</Text>
                </View>
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
                label="START SESSION"
                icon={<Play size={17} color={EYES.buttonTextColor} />}
                onPress={begin}
                colors={EYES.buttonGradient}
                glowColor={EYES.buttonShadow}
                textColor={EYES.buttonTextColor}
                letterSpacing={1.5}
                style={styles.cta}
              />
            </View>
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
            <Text style={styles.calibrateLine}>Keep your head still.</Text>
            <Text style={styles.calibrateLine}>Sit about 40–60 cm from your screen.</Text>
            <Text style={styles.calibrateLine}>Follow the target using only your eyes.</Text>
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

            {/* Paused — a calm menu instead of a frozen screen */}
            {paused && (
              <Animated.View
                entering={FadeIn.duration(250)}
                exiting={FadeOut.duration(200)}
                style={styles.pausedOverlay}
              >
                <Text style={styles.pausedTitle}>Session Paused</Text>
                <Text style={styles.pausedSub}>Ready to continue?</Text>
                <TouchableOpacity style={styles.pausedResume} onPress={togglePause} activeOpacity={0.85}>
                  <Play size={16} color="#03212c" />
                  <Text style={styles.pausedResumeText}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pausedGhost}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSecondsLeft(step.durationSeconds);
                    setPaused(false);
                    // Fresh run of the exercise = fresh guidance.
                    play(STEP_CLIPS[step.id], 400, 1);
                  }}
                  activeOpacity={0.75}
                >
                  <RotateCcw size={14} color={colors.text.secondary} />
                  <Text style={styles.pausedGhostText}>Restart Exercise</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pausedGhost} onPress={exitNow} activeOpacity={0.75}>
                  <Text style={[styles.pausedGhostText, { color: '#e24b4a' }]}>End Session</Text>
                </TouchableOpacity>
              </Animated.View>
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
                <Text style={styles.interstitialNextLabel}>Next</Text>
                <Text style={styles.interstitialNext}>{interstitial.nextTitle}</Text>
              </Animated.View>
            )}
          </View>
        )}

        {/* 20-20-20 RECOVERY — look far away before the celebration */}
        {phase === 'recovery' && (
          <Animated.View entering={FadeIn.duration(450)} style={styles.recoveryRoot}>
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
                colors={EYES.buttonGradient}
                glowColor={EYES.buttonShadow}
                textColor={EYES.buttonTextColor}
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
              <Text style={styles.confirmTitle}>Leave?</Text>
              <Text style={styles.confirmSub}>You&apos;re almost done.</Text>
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
  root: { flex: 1, backgroundColor: colors.background.primary },
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
  headerTitleText: { fontSize: 16, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.4 },
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
  idleScroll: { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 16, alignItems: 'center', gap: 6 },
  idleCtaBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  heroWrap: { width: 130, height: 122, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  heroGlow: {
    position: 'absolute',
    width: 124, height: 124, borderRadius: 62,
    backgroundColor: 'rgba(34,211,238,0.22)',
  },
  heroRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 1.5, borderColor: ACCENT + '55',
    backgroundColor: 'rgba(34,211,238,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 27, fontWeight: '900', color: colors.text.primary, textAlign: 'center', letterSpacing: 0.3, marginTop: 4 },
  heroSub: { fontSize: 14.5, color: colors.text.secondary, textAlign: 'center' },
  heroMeta: { fontSize: 12.5, color: colors.text.tertiary, fontWeight: '600', letterSpacing: 0.3, marginTop: 2, marginBottom: 12 },

  // Idle — exercise list
  stepList: { alignSelf: 'stretch' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  stepRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  iconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepRowInfo: { flex: 1, gap: 2 },
  stepRowTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  stepRowDesc: { fontSize: 11.5, color: colors.text.tertiary, lineHeight: 15 },
  stepRowDur: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },

  // Idle — benefits
  benefits: { alignSelf: 'stretch', paddingHorizontal: 6, marginTop: 14, marginBottom: 16, gap: 9 },
  benefitsTitle: { fontSize: 13, fontWeight: '800', color: colors.text.secondary, letterSpacing: 0.4, marginBottom: 2 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { fontSize: 13.5, color: colors.text.primary, fontWeight: '500' },

  cta: { alignSelf: 'stretch' },

  // Active phase — immersive
  activeRoot: { flex: 1 },
  activeContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  activeTop: { alignItems: 'center', gap: 4, marginBottom: 4 },
  stepName: { fontSize: 21, fontWeight: '800', color: colors.text.primary, letterSpacing: 0.2 },
  stepWhat: { fontSize: 13.5, color: colors.text.secondary },
  activeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remainingBlock: { alignItems: 'center', gap: 4, marginBottom: 12 },
  remainingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  activeRemaining: { fontSize: 13, color: colors.text.tertiary, fontWeight: '600' },
  activeRemainingNum: { fontSize: 24, fontWeight: '800' },
  rotatingTip: { fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: '500', letterSpacing: 0.3 },
  activeControls: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, paddingBottom: 20 },
  controlGroup: { alignItems: 'center', gap: 7 },
  pauseBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(34,211,238,0.12)',
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

  // Paused overlay
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3,8,11,0.9)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  pausedTitle: { fontSize: 24, fontWeight: '900', color: colors.text.primary, letterSpacing: 0.5 },
  pausedSub: { fontSize: 13.5, color: colors.text.secondary, marginBottom: 12 },
  pausedResume: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT, borderRadius: 100,
    paddingHorizontal: 36, paddingVertical: 13, marginBottom: 6,
  },
  pausedResumeText: { fontSize: 14, fontWeight: '800', color: '#03212c', letterSpacing: 0.4 },
  pausedGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 100, paddingHorizontal: 24, paddingVertical: 10,
  },
  pausedGhostText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },

  // Calibration beat
  calibrateRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  calibrateLine: { fontSize: 15.5, color: colors.text.secondary, textAlign: 'center', lineHeight: 23 },

  // 3-2-1 beat
  prepRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prepNum: {
    fontSize: 96, fontWeight: '200', letterSpacing: 1,
    textShadowColor: 'rgba(34,211,238,0.35)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },

  // Next-up preview chip (slot reserves the space even while empty)
  nextUpSlot: { height: 30, marginBottom: 10, justifyContent: 'center' },
  nextUpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)',
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
  },
  nextUpLabel: { fontSize: 9.5, fontWeight: '800', color: ACCENT, letterSpacing: 1.5 },
  nextUpTitle: { fontSize: 12.5, fontWeight: '700', color: colors.text.primary },

  // 20-20-20 recovery
  recoveryRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  recoveryKicker: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' },
  recoveryTitle: { fontSize: 24, fontWeight: '900', color: colors.text.primary, letterSpacing: 0.3 },
  recoverySub: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 24, marginTop: 6 },
  recoveryEm: { fontSize: 17, fontWeight: '800', color: colors.text.primary },
  recoveryRing: {
    width: 128, height: 128, borderRadius: 64, marginVertical: 22,
    borderWidth: 2, borderColor: 'rgba(34,211,238,0.4)',
    backgroundColor: 'rgba(34,211,238,0.07)',
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
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1.5, borderColor: ACCENT + '66',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  interstitialGreat: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 0.6 },
  interstitialDone: { fontSize: 17, fontWeight: '800', color: colors.text.primary },
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
  confirmTitle: { fontSize: 17, fontWeight: '800', color: colors.text.primary },
  confirmSub: { fontSize: 13, color: colors.text.secondary, lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  confirmStay: { flex: 1, backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  confirmStayText: { fontSize: 13, fontWeight: '800', color: '#03212c' },
  confirmLeave: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(226,75,74,0.5)', paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  confirmLeaveText: { fontSize: 13, fontWeight: '700', color: '#e24b4a' },
});
