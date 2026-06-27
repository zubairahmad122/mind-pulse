import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
import { useAuth } from '@/context/AuthContext';
import { useEyeProgress } from '@/hooks/useEyeProgress';
import { speak, speakIfSilent, stopSpeaking } from '@/services/voiceGuide';

const C = {
  bg1: '#0a0818', bg2: '#0e0b1e', card: '#1a1535',
  green: '#6ee7b7', purple: '#a78bfa', red: '#e24b4a',
  amber: '#f59e0b', text: '#ffffff', muted: '#9b8ec4', dim: '#7a6fa0',
};

type IconName = keyof typeof Ionicons.glyphMap;
interface VoiceCue { atSec: number; text: string }
interface EyeStep {
  id: string; icon: IconName; accent: string; title: string;
  durationSeconds: number; what: string; intro: string; cues: VoiceCue[]; important?: boolean;
}

const STEPS: EyeStep[] = [
  { id: 'circle', icon: 'sync-outline', accent: '#4FC3F7', title: 'Circle', durationSeconds: 25, what: 'Smooth circular pursuit', intro: 'Circle. Follow the orbiting dot smoothly with your eyes only. Keep your head still.', cues: [{ atSec: 12, text: 'Stay smooth — no jumping.' }] },
  { id: 'square', icon: 'expand-outline', accent: '#a78bfa', title: 'Square', durationSeconds: 25, what: 'Horizontal + vertical eye movement', intro: 'Square. Trace the square path — this trains your horizontal and vertical eye muscles.', cues: [{ atSec: 12, text: 'Corners train both directions together.' }] },
  { id: 'triangle', icon: 'triangle-outline', accent: '#6ee7b7', title: 'Triangle', durationSeconds: 25, what: 'Diagonal + oblique eye movement', intro: 'Triangle. Follow the triangular path — this works your oblique muscles for diagonal gaze.', cues: [{ atSec: 12, text: 'Diagonals engage the obliques.' }] },
  { id: 'cardinal', icon: 'grid-outline', accent: '#fbbf24', title: '9-Point Gaze', durationSeconds: 30, what: 'All 9 cardinal gaze positions', intro: 'Nine Point Gaze. We will visit all 9 gaze positions in order — training every extraocular muscle. Hold steady at each point.', cues: [{ atSec: 14, text: 'Each position works a different muscle.' }, { atSec: 24, text: 'Almost through all nine — keep holding.' }] },
  { id: 'saccade', icon: 'flash-outline', accent: '#fde047', title: 'Saccade Patterns', durationSeconds: 30, what: 'Horizontal → Vertical → Diagonal → Random', intro: 'Saccade Patterns. Snap your eyes between targets through four phases. Each trains different eye muscles.', cues: [{ atSec: 8, text: 'Horizontal — lateral rectus.' }, { atSec: 16, text: 'Vertical — superior and inferior rectus.' }, { atSec: 24, text: 'Diagonal — obliques.' }] },
  { id: 'convergence', icon: 'contract-outline', accent: '#fb7185', title: 'Pencil Push-Ups', durationSeconds: 40, what: 'Follow dot toward nose — stop if double', intro: 'Pencil Push-ups. Follow the dot as it comes closer. If you see double, look away and start again.', cues: [{ atSec: 12, text: 'Stop if it doubles or blurs.' }, { atSec: 24, text: 'Bring it back, slowly.' }, { atSec: 35, text: 'Two more cycles.' }], important: true },
  { id: 'nearfar', icon: 'swap-horizontal-outline', accent: '#6ee7b7', title: 'Focus Shifting', durationSeconds: 35, what: 'Switch focus between near and far', intro: 'Focus Shifting. Look at the near target, then shift to the far target. This trains your ciliary muscle.', cues: [{ atSec: 14, text: 'Now near… now far.' }, { atSec: 28, text: 'Keep switching — stay relaxed.' }], important: true },
];

const TOTAL_DURATION = STEPS.reduce((s, x) => s + x.durationSeconds, 0);

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

function StepIconBadge({ icon, accent, size = 28 }: { icon: IconName; accent: string; size?: number }) {
  const wrap = size + 16;
  return <View style={[styles.iconBadge, { width: wrap, height: wrap, borderRadius: wrap / 2, backgroundColor: accent + '22', borderColor: accent + '55' }]}><Ionicons name={icon} size={size} color={accent} /></View>;
}

function StepDots({ count, current }: { count: number; current: number }) {
  return <View style={styles.dotsRow}>{Array.from({ length: count }).map((_, i) => {
    const done = i < current; const active = i === current;
    return <View key={i} style={[styles.dot, done && styles.dotDone, active && styles.dotActive]} />;
  })}</View>;
}

type Phase = 'idle' | 'active' | 'done';

export default function CVSProtocolScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { recordCompletion, streak } = useEyeProgress(user?.uid);

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(STEPS[0].durationSeconds);
  const [paused, setPaused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenStepRef = useRef<number | null>(null);
  const playedCuesRef = useRef<Set<string>>(new Set());
  const contentOpacity = useSharedValue(1);
  const completionScale = useSharedValue(0.85);
  const completionOpacity = useSharedValue(0);

  const step = STEPS[stepIndex];
  const elapsedInStep = step.durationSeconds - secondsLeft;

  useEffect(() => {
    if (isMuted) { stopSpeaking(); return; }
    if (phase === 'active' && !paused) {
      if (lastSpokenStepRef.current !== stepIndex) {
        lastSpokenStepRef.current = stepIndex;
        playedCuesRef.current = new Set();
        speak(stepIndex === 0 ? `Welcome to your Eye Reset. ${step.intro}` : step.intro);
      }
    } else if (phase === 'done') {
      if (lastSpokenStepRef.current !== -2) { lastSpokenStepRef.current = -2; speak('Session complete.'); }
    } else if (phase === 'idle') { lastSpokenStepRef.current = null; playedCuesRef.current = new Set(); stopSpeaking(); }
    else if (paused) stopSpeaking();
  }, [phase, stepIndex, paused, isMuted, step.intro]);

  useEffect(() => {
    if (phase !== 'active' || paused || isMuted) return;
    for (const cue of step.cues) {
      const key = `${stepIndex}-${cue.atSec}`;
      if (elapsedInStep >= cue.atSec && !playedCuesRef.current.has(key)) {
        playedCuesRef.current.add(key);
        void speakIfSilent(cue.text);
      }
    }
  }, [elapsedInStep, phase, paused, isMuted, stepIndex, step.cues]);

  // 🔧 Use Date.now() delta so background/resume doesn't skip seconds
  const lastTickRef = useRef(Date.now());

  function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }

  useEffect(() => {
    clearTimer();
    if (phase !== 'active' || paused) return;
    if (secondsLeft <= 0) { goNext(); return; }
    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      if (delta > 0) {
        setSecondsLeft(s => Math.max(0, s - delta));
      }
    }, 500); // check every 500ms, accounts for missed seconds
    return clearTimer;
  }, [phase, paused, secondsLeft]);

  useEffect(() => () => { clearTimer(); stopSpeaking(); }, []);

  const elapsedBefore = STEPS.slice(0, stepIndex).reduce((s, x) => s + x.durationSeconds, 0);
  const elapsed = elapsedBefore + (step.durationSeconds - secondsLeft);
  const progressPct = Math.min(1, elapsed / TOTAL_DURATION);

  function fadeTransition(fn: () => void) {
    clearTimer();
    contentOpacity.value = withTiming(0, { duration: 280 });
    setTimeout(() => { fn(); contentOpacity.value = withTiming(1, { duration: 400 }); void Haptics.selectionAsync(); }, 320);
  }

  function goNext() {
    const next = stepIndex + 1;
    if (next >= STEPS.length) {
      fadeTransition(() => { setPhase('done'); void recordCompletion('eye-reset'); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); completionOpacity.value = withTiming(1, { duration: 420 }); completionScale.value = withTiming(1, { duration: 520 }); });
    } else {
      fadeTransition(() => { setStepIndex(next); setSecondsLeft(STEPS[next].durationSeconds); });
    }
  }

  function skipStep() { void Haptics.selectionAsync(); goNext(); }
  function togglePause() { void Haptics.selectionAsync(); setPaused(p => !p); }

  function begin() {
    void Haptics.selectionAsync();
    setStepIndex(0); setSecondsLeft(STEPS[0].durationSeconds); setPaused(false); setPhase('active');
  }

  function repeatSession() {
    void Haptics.selectionAsync();
    completionOpacity.value = 0; completionScale.value = 0.85;
    setStepIndex(0); setSecondsLeft(STEPS[0].durationSeconds); setPaused(false); setPhase('active');
  }

  function exitNow() { clearTimer(); setExitConfirm(false); router.back(); }

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const completionStyle = useAnimatedStyle(() => ({ opacity: completionOpacity.value, transform: [{ scale: completionScale.value }] }));

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.bg1, C.bg2]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (phase === 'active' ? setExitConfirm(true) : router.back())} hitSlop={10}>
            <Ionicons name="close" size={18} color={C.muted} />
          </TouchableOpacity>
          {phase === 'active' ? (
            <View style={styles.headerProgress}>
              <StepDots count={STEPS.length} current={stepIndex} />
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} /></View>
            </View>
          ) : (
            <View style={styles.headerTitle}><Text style={styles.headerTitleText}>Eye Reset</Text></View>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsMuted(m => !m)} hitSlop={10}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color={isMuted ? C.muted : C.purple} />
          </TouchableOpacity>
        </View>

        {/* IDLE */}
        {phase === 'idle' && (
          <Animated.View style={[styles.doneRoot, contentStyle]}>
            <ScrollView contentContainerStyle={styles.doneScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroLogoWrap}><View style={styles.heroLogoRing}><Ionicons name="eye" size={40} color={C.purple} /></View></View>
              <Text style={styles.heroTitle}>Eye Reset</Text>
              <Text style={styles.heroSub}>3.5-min guided break</Text>
              <View style={styles.stepList}>
                {STEPS.map((s, i) => (
                  <View key={s.id} style={styles.stepRow}>
                    <StepIconBadge icon={s.icon} accent={s.accent} size={18} />
                    <View style={styles.stepRowInfo}><Text style={styles.stepRowTitle}>{s.title}</Text><Text style={styles.stepRowDur}>{s.durationSeconds}s</Text></View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={begin} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Begin Session</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}

        {/* ACTIVE — immersive, no card borders */}
        {phase === 'active' && (
          <Animated.View style={[styles.activeRoot, contentStyle]}>
            {/* Step info — minimal top bar */}
            <View style={styles.activeTop}>
              <Text style={styles.stepName}>{step.title}</Text>
              <Text style={styles.stepTimer}>{secondsLeft}s</Text>
            </View>

            {/* Animation — fills the center, no cards */}
            <View style={styles.activeCenter}>
              <StepCountdownRing
                size={320} strokeWidth={4} duration={step.durationSeconds}
                active={!paused} paused={paused} resetKey={stepIndex}
                color={step.accent} trackColor="rgba(255,255,255,0.04)" gradient={false}
              >
                <LottieGuide stepId={step.id} active={!paused} size={260} speed={0.85}
                  fallback={<StepGuide stepId={step.id} active={!paused} />}
                />
              </StepCountdownRing>
            </View>

            {/* Instruction — minimal */}
            <Text style={styles.activeInstruction}>{step.what}</Text>

            {/* Controls — minimal, overlays bottom */}
            <View style={styles.activeControls}>
              <TouchableOpacity style={styles.pauseBtn} onPress={togglePause} activeOpacity={0.85}>
                <Ionicons name={paused ? 'play' : 'pause'} size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={skipStep} hitSlop={8}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <Animated.View style={[styles.doneRoot, completionStyle]}>
            <ScrollView contentContainerStyle={styles.doneScrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.heroLogoRing, { borderColor: C.green, backgroundColor: 'rgba(110,231,183,0.10)' }]}>
                <Ionicons name="checkmark-circle" size={44} color={C.green} />
              </View>
              <Text style={styles.heroTitle}>Break complete</Text>
              <Text style={styles.heroSub}>Eyes rested for {Math.round(TOTAL_DURATION / 60)} minutes</Text>
              <View style={styles.completionRow}>
                <View style={styles.completionStat}><Text style={styles.completionValue}>{STEPS.length}</Text><Text style={styles.completionLabel}>steps</Text></View>
                <View style={styles.completionDivider} />
                <View style={styles.completionStat}><Text style={styles.completionValue}>{Math.round(TOTAL_DURATION / 60)}m</Text><Text style={styles.completionLabel}>rested</Text></View>
                <View style={styles.completionDivider} />
                <View style={styles.completionStat}><Text style={styles.completionValue}>{streak}</Text><Text style={styles.completionLabel}>day streak</Text></View>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={repeatSession} activeOpacity={0.7}>
                <Ionicons name="refresh" size={14} color={C.purple} />
                <Text style={styles.secondaryBtnText}>Repeat</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}

        {/* EXIT CONFIRM */}
        {exitConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Leave?</Text>
              <Text style={styles.confirmSub}>You're almost done.</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.confirmStay} onPress={() => setExitConfirm(false)} activeOpacity={0.8}>
                  <Text style={styles.confirmStayText}>Keep going</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLeave} onPress={exitNow} activeOpacity={0.8}>
                  <Text style={styles.confirmLeaveText}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg1 },
  safe: { flex: 1 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerTitleText: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 0.4 },
  headerProgress: { flex: 1, gap: 8 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotDone: { backgroundColor: C.green, opacity: 0.6 },
  dotActive: { width: 18, backgroundColor: C.green },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: C.green, borderRadius: 2 },
  // Active phase — immersive
  activeRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 8, marginBottom: 8 },
  stepName: { fontSize: 20, fontWeight: '700', color: C.text },
  stepTimer: { fontSize: 18, fontWeight: '700', color: C.muted },
  activeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activeInstruction: { fontSize: 15, color: C.muted, textAlign: 'center', paddingHorizontal: 24, marginVertical: 12, lineHeight: 22 },
  activeControls: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingBottom: 24 },
  pauseBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.purple },
  skipText: { fontSize: 14, color: C.dim, fontWeight: '600' },
  // Idle / Done
  doneRoot: { flex: 1, alignSelf: 'stretch', paddingHorizontal: 16 },
  doneScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 },
  iconBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroLogoWrap: { alignItems: 'center', justifyContent: 'center' },
  heroLogoRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderColor: C.purple, backgroundColor: 'rgba(167,139,250,0.10)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center', letterSpacing: 0.4 },
  heroSub: { fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 14 },
  stepList: { alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepRowInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepRowTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  stepRowDur: { fontSize: 12, color: C.muted, fontWeight: '600' },
  primaryBtn: { backgroundColor: C.green, paddingHorizontal: 36, paddingVertical: 15, borderRadius: 100, alignSelf: 'stretch', alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#0a0818', letterSpacing: 0.5 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10 },
  secondaryBtnText: { fontSize: 13, color: C.purple, fontWeight: '700' },
  completionRow: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  completionStat: { alignItems: 'center', gap: 3 },
  completionValue: { fontSize: 22, fontWeight: '900', color: C.green },
  completionLabel: { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 0.4 },
  completionDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.07)' },
  // Exit confirm
  confirmOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,4,15,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  confirmCard: { width: '100%', maxWidth: 360, backgroundColor: '#0F1228', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20, gap: 10 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  confirmSub: { fontSize: 13, color: C.muted, lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  confirmStay: { flex: 1, backgroundColor: C.green, paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  confirmStayText: { fontSize: 13, fontWeight: '800', color: '#0a0818' },
  confirmLeave: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(226,75,74,0.5)', paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  confirmLeaveText: { fontSize: 13, fontWeight: '700', color: C.red },
});
