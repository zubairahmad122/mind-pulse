import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmbientSoundDock } from '@/components/breathing/AmbientSoundDock';
import { BOX_SCRIPTS } from '@/constants/sessionScripts';
import { BREATHING_MUSIC, type BreathingMusicId } from '@/constants/breathingMusic';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLanguage } from '@/context/LanguageContext';
import { useBreathingMusic } from '@/hooks/useBreathingMusic';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

// ─── Phase definitions ────────────────────────────────────────────────────────
type Phase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

interface PhaseConfig {
  labelKey:    'breatheIn' | 'holdBreath' | 'breatheOut' | 'holdEmpty';
  sub:         string;   // kept in EN — motivational, short
  seconds:     number;
  color:       string;
  glowColor:   string;
  targetScale: number;
}

const PHASES: Record<Phase, PhaseConfig> = {
  inhale: {
    labelKey:    'breatheIn',
    sub:         'Let air fill your lungs',
    seconds:     4,
    color:       '#4FC3F7',
    glowColor:   'rgba(79,195,247,0.28)',
    targetScale: 1.18,
  },
  'hold-in': {
    labelKey:    'holdBreath',
    sub:         'Stay still',
    seconds:     4,
    color:       '#B39DDB',
    glowColor:   'rgba(179,157,219,0.22)',
    targetScale: 1.18,
  },
  exhale: {
    labelKey:    'breatheOut',
    sub:         'Let everything go',
    seconds:     4,
    color:       '#7B61FF',
    glowColor:   'rgba(123,97,255,0.28)',
    targetScale: 0.78,
  },
  'hold-out': {
    labelKey:    'holdEmpty',
    sub:         'Rest in the stillness',
    seconds:     4,
    color:       '#4DB6AC',
    glowColor:   'rgba(77,182,172,0.22)',
    targetScale: 0.78,
  },
};

const PHASE_ORDER: Phase[] = ['inhale', 'hold-in', 'exhale', 'hold-out'];

const SETTLE_MS = 5000;

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CIRCLE = 220;

export default function BoxBreathingScreen() {
  const router = useRouter();
  const { guide, stop, scripts } = useVoiceGuide();
  const { langCode, setLang }    = useLanguage();

  const [running, setRunning]   = useState(false);
  const [settling, setSettling] = useState(false);
  const [phase, setPhase]       = useState<Phase>('inhale');
  const [countdown, setCountdown] = useState(4);
  const [cycles, setCycles]     = useState(0);
  const [musicId, setMusicId]   = useState<BreathingMusicId>('ocean');
  const [elapsedSec, setElapsedSec] = useState(0);

  const selectedMusic = BREATHING_MUSIC.find(m => m.id === musicId)!;
  useBreathingMusic(selectedMusic.url, running);

  // ── animations ────────────────────────────────────────────────────────────
  const circleScale = useSharedValue(0.78);
  const glowOpacity = useSharedValue(0);
  const ring1Scale  = useSharedValue(1);
  const ring2Scale  = useSharedValue(1);

  const timerRef      = useRef<ReturnType<typeof setInterval>  | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const elapsedRef    = useRef<ReturnType<typeof setInterval>  | null>(null);
  const cyclesRef     = useRef(0);

  function clearAll() {
    if (timerRef.current)      clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (elapsedRef.current)    clearInterval(elapsedRef.current);
    elapsedRef.current = null;
  }

  function animateCircle(p: Phase) {
    const cfg = PHASES[p];
    const ms  = cfg.seconds * 1000 - 150;
    circleScale.value = withTiming(cfg.targetScale, { duration: ms, easing: Easing.inOut(Easing.ease) });
    glowOpacity.value = withTiming(0.9, { duration: 400 });
    if (cfg.targetScale > 1) {
      ring1Scale.value = withSequence(withTiming(1.05, { duration: 900 }), withTiming(1.02, { duration: 700 }));
      ring2Scale.value = withSequence(withTiming(1.09, { duration: 1100 }), withTiming(1.04, { duration: 800 }));
    } else {
      ring1Scale.value = withSequence(withTiming(0.97, { duration: 800 }), withTiming(1.0, { duration: 600 }));
      ring2Scale.value = withSequence(withTiming(0.94, { duration: 1000 }), withTiming(1.0, { duration: 700 }));
    }
  }

  function startPhase(idx: number) {
    const p   = PHASE_ORDER[idx];
    const cfg = PHASES[p];
    setPhase(p);
    setCountdown(cfg.seconds);
    guide(scripts[cfg.labelKey]);   // ← localized voice cue
    animateCircle(p);

    let secs = cfg.seconds;
    timerRef.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
      setCountdown(secs);
    }, 1000);

    phaseTimerRef.current = setTimeout(() => {
      const nextIdx = (idx + 1) % PHASE_ORDER.length;
      if (nextIdx === 0) {
        cyclesRef.current += 1;
        setCycles(cyclesRef.current);
        if (cyclesRef.current === 3) guide(scripts.wellDone, 200);
      }
      startPhase(nextIdx);
    }, cfg.seconds * 1000);
  }

  function begin() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cyclesRef.current = 0;
    setCycles(0);
    setElapsedSec(0);
    setRunning(true);
    setSettling(true);
    guide(scripts.boxBreathIntro, 300);
    elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    phaseTimerRef.current = setTimeout(() => {
      setSettling(false);
      startPhase(0);
    }, SETTLE_MS);
  }

  function pause() {
    clearAll();
    cancelAnimation(circleScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring2Scale);
    stop();
    setRunning(false);
    setSettling(false);
  }

  useEffect(() => () => { clearAll(); stop(); }, []);

  // cycle through languages
  function cycleLang() {
    const idx  = LANGUAGES.findIndex(l => l.code === langCode);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    setLang(next.code);
  }

  const cfg = PHASES[phase];

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const glowStyle   = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const ring1Style  = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }] }));
  const ring2Style  = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }] }));

  const currentLang = LANGUAGES.find(l => l.code === langCode)!;
  const bs          = BOX_SCRIPTS.en;

  const phaseDisplayMap: Record<Phase, string> = {
    inhale:     bs.inhale,
    'hold-in':  bs.holdIn,
    exhale:     bs.exhale,
    'hold-out': bs.holdOut,
  };
  const phaseSubMap: Record<Phase, string> = {
    inhale:     bs.inhaleSub,
    'hold-in':  bs.holdInSub,
    exhale:     bs.exhaleSub,
    'hold-out': bs.holdOutSub,
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { pause(); router.back(); }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Box Breathing</Text>
          {running && (
            <Text style={styles.cycleLabel}>
              {settling ? 'Getting ready' : `Round ${cycles + 1}`} · {formatElapsed(elapsedSec)}
            </Text>
          )}
        </View>

        {/* Language cycle button */}
        <TouchableOpacity onPress={cycleLang} style={styles.langBtn} disabled={running}>
          <Text style={styles.langFlag}>{currentLang.flag}</Text>
          <Text style={[styles.langCode, running && { opacity: 0.4 }]}>{currentLang.code.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Ambient sound dock (visible & changeable idle + running) ── */}
      <View style={styles.musicDock}>
        <AmbientSoundDock selectedId={musicId} onSelect={setMusicId} accentColor={cfg.color} />
      </View>

      {/* ── Circle animation ── */}
      <View style={styles.circleArea}>
        <Animated.View style={[styles.ring2, { borderColor: cfg.color }, ring2Style]} />
        <Animated.View style={[styles.ring1, { borderColor: cfg.color }, ring1Style]} />
        <Animated.View style={[styles.glow,  { backgroundColor: cfg.glowColor }, glowStyle]} />

        <Animated.View style={[styles.circle, { borderColor: cfg.color }, circleStyle]}>
          <View style={styles.circleInner}>
            {settling ? (
              <>
                <Ionicons name="leaf-outline" size={40} color={colors.text.tertiary} />
                <Text style={styles.settleText}>Relax and{'\n'}get comfortable</Text>
              </>
            ) : running ? (
              <>
                <Text style={[styles.phaseLabel, { color: cfg.color }]}>
                  {phaseDisplayMap[phase]}
                </Text>
                <Text style={[styles.countdown, { color: cfg.color }]}>{countdown}</Text>
              </>
            ) : (
              <>
                <Ionicons name="radio-outline" size={44} color={colors.text.tertiary} />
                <Text style={styles.readyText}>Ready</Text>
              </>
            )}
          </View>
        </Animated.View>
      </View>

      {/* ── Phase subtitle ── */}
      <View style={styles.descArea}>
        <Text style={styles.phaseSub}>
          {settling
            ? 'Settle in — your guided breathing begins in a moment'
            : running
              ? phaseSubMap[phase]
              : '4 seconds each phase · voice in ' + currentLang.labelEn}
        </Text>
      </View>

      {/* ── Phase dots ── */}
      <View style={styles.phaseDots}>
        {PHASE_ORDER.map(p => (
          <View
            key={p}
            style={[
              styles.dot,
              { backgroundColor: running && p === phase ? PHASES[p].color : 'rgba(255,255,255,0.1)' },
            ]}
          />
        ))}
      </View>

      {/* ── CTA ── */}
      <View style={styles.btnArea}>
        <TouchableOpacity
          style={[styles.startBtn, { borderColor: running ? '#FF5722' : cfg.color }]}
          onPress={running ? pause : begin}
          activeOpacity={0.8}
        >
          <Ionicons
            name={running ? (settling ? 'stop' : 'pause') : 'play'}
            size={18}
            color={running ? '#FF5722' : cfg.color}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.startBtnText, { color: running ? '#FF5722' : cfg.color }]}>
            {running ? (settling ? 'Stop' : 'Pause') : 'Begin Session'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  title:        { ...typography.headingSmall, color: colors.text.primary },
  cycleLabel:   { ...typography.caption, color: colors.text.secondary },
  langBtn:      { alignItems: 'center', gap: 2 },
  langFlag:     { fontSize: 18 },
  langCode:     { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.5 },

  // Ambient sound dock
  musicDock: { marginBottom: spacing.sm },

  // Circle
  circleArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring2: {
    position: 'absolute',
    width: CIRCLE + 80, height: CIRCLE + 80, borderRadius: (CIRCLE + 80) / 2,
    borderWidth: 1, opacity: 0.14,
  },
  ring1: {
    position: 'absolute',
    width: CIRCLE + 40, height: CIRCLE + 40, borderRadius: (CIRCLE + 40) / 2,
    borderWidth: 1, opacity: 0.28,
  },
  glow: {
    position: 'absolute',
    width: CIRCLE + 40, height: CIRCLE + 40, borderRadius: (CIRCLE + 40) / 2,
    opacity: 0,
  },
  circle: {
    width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleInner: { alignItems: 'center', gap: spacing.xs },
  phaseLabel:  { fontSize: 12, fontWeight: '800', letterSpacing: 2.5 },
  countdown:   { fontSize: 72, fontWeight: '200', lineHeight: 80 },
  readyText:   { ...typography.bodyLarge, color: colors.text.secondary },
  settleText:  {
    ...typography.body, color: colors.text.secondary,
    textAlign: 'center', lineHeight: 22,
  },

  // Description
  descArea: { alignItems: 'center', paddingVertical: spacing.md, minHeight: 44 },
  phaseSub: { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },

  // Phase dots
  phaseDots: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Button
  btnArea:      { paddingBottom: spacing.xl, alignItems: 'center' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl * 1.5, paddingVertical: spacing.md,
    borderRadius: 100, borderWidth: 1.5,
  },
  startBtnText: { ...typography.bodyLarge, fontWeight: '700', letterSpacing: 0.5 },
});
