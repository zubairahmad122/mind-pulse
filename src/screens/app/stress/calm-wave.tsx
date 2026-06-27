import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AmbientSoundDock } from '@/components/breathing/AmbientSoundDock';
import { CALM_WAVE_SCRIPTS } from '@/constants/sessionScripts';
import { BREATHING_MUSIC, type BreathingMusicId } from '@/constants/breathingMusic';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLanguage } from '@/context/LanguageContext';
import { useBreathingMusic } from '@/hooks/useBreathingMusic';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

// ─── Calm Wave pattern: 4 in / 2 hold / 6 out ────────────────────────────────
type CWPhase = 'inhale' | 'hold' | 'exhale';
const PHASE_DUR: Record<CWPhase, number> = { inhale: 4000, hold: 2000, exhale: 6000 };
const PHASE_ORDER: CWPhase[] = ['inhale', 'hold', 'exhale'];

const PHASE_COLOR: Record<CWPhase, string> = {
  inhale: '#4FC3F7',
  hold:   '#B39DDB',
  exhale: '#a78bfa',
};

const SETTLE_MS = 5000;

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CIRCLE = 220;

export default function CalmWaveScreen() {
  const router = useRouter();
  const { guide, stop, scripts } = useVoiceGuide();
  const { langCode, setLang }    = useLanguage();

  const [running, setRunning]       = useState(false);
  const [settling, setSettling]     = useState(false);
  const [phase, setPhase]           = useState<CWPhase>('inhale');
  const [countdown, setCountdown]   = useState(4);
  const [cycles, setCycles]         = useState(0);
  const [musicId, setMusicId]       = useState<BreathingMusicId>('ocean');
  const [elapsedSec, setElapsedSec] = useState(0);

  const selectedMusic = BREATHING_MUSIC.find(m => m.id === musicId)!;
  useBreathingMusic(selectedMusic.url, running);

  // ── shared animation values ───────────────────────────────────────────────
  const outerScale  = useSharedValue(0.82);
  const innerScale  = useSharedValue(0.82);
  const glow        = useSharedValue(0);
  const ripple1     = useSharedValue(0);
  const ripple2     = useSharedValue(0);
  const idlePulse   = useSharedValue(1);

  // Idle gentle pulse
  useEffect(() => {
    if (running) { cancelAnimation(idlePulse); idlePulse.value = withTiming(1, { duration: 200 }); return; }
    idlePulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );
    return () => cancelAnimation(idlePulse);
  }, [running]);

  // ── timers ────────────────────────────────────────────────────────────────
  const countTimer = useRef<ReturnType<typeof setInterval>  | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval>  | null>(null);
  const cyclesRef  = useRef(0);
  const runRef     = useRef(false);

  function clearAll() {
    if (countTimer.current) clearInterval(countTimer.current);
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = null;
  }

  function animatePhase(p: CWPhase) {
    const dur = PHASE_DUR[p];
    if (p === 'inhale') {
      outerScale.value = withTiming(1.18, { duration: dur - 200, easing: Easing.out(Easing.quad) });
      innerScale.value = withTiming(1.12, { duration: dur - 200, easing: Easing.out(Easing.quad) });
      glow.value       = withTiming(0.9,  { duration: 600 });
      ripple1.value    = 0;
      ripple2.value    = 0;
    } else if (p === 'hold') {
      // gentle ripple rings during hold
      ripple1.value = withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 300 })),
        3, false,
      );
      ripple2.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 450 }),
          withTiming(1, { duration: 900 }),
          withTiming(0, { duration: 300 }),
        ),
        3, false,
      );
    } else {
      // exhale
      outerScale.value = withTiming(0.82, { duration: dur - 200, easing: Easing.in(Easing.quad) });
      innerScale.value = withTiming(0.82, { duration: dur - 200, easing: Easing.in(Easing.quad) });
      glow.value       = withTiming(0.2,  { duration: dur - 200 });
    }
  }

  function startPhase(idx: number) {
    if (!runRef.current) return;
    const p   = PHASE_ORDER[idx];
    const dur = PHASE_DUR[p];
    setPhase(p);
    const secCount = Math.round(dur / 1000);
    setCountdown(secCount);
    animatePhase(p);

    // Voice cue (localized)
    if (p === 'inhale') guide(scripts.breatheIn);
    else if (p === 'hold') guide(scripts.holdBreath);
    else guide(scripts.breatheOut);

    let secs = secCount;
    countTimer.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) { if (countTimer.current) clearInterval(countTimer.current); return; }
      setCountdown(secs);
    }, 1000);

    phaseTimer.current = setTimeout(() => {
      const nextIdx = (idx + 1) % PHASE_ORDER.length;
      if (nextIdx === 0) {
        cyclesRef.current += 1;
        setCycles(cyclesRef.current);
        if (cyclesRef.current === 3) guide(scripts.wellDone, 200);
      }
      startPhase(nextIdx);
    }, dur);
  }

  function begin() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cyclesRef.current = 0;
    setCycles(0);
    setElapsedSec(0);
    runRef.current = true;
    setRunning(true);
    setSettling(true);
    guide(scripts.boxBreathIntro.replace('box', 'calm wave').replace('बॉक्स', 'कैल्म वेव'), 300);
    elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    phaseTimer.current = setTimeout(() => {
      setSettling(false);
      startPhase(0);
    }, SETTLE_MS);
  }

  function pause() {
    runRef.current = false;
    clearAll();
    cancelAnimation(outerScale);
    cancelAnimation(innerScale);
    cancelAnimation(glow);
    cancelAnimation(ripple1);
    cancelAnimation(ripple2);
    stop();
    setRunning(false);
    setSettling(false);
    setCountdown(4);
  }

  useEffect(() => () => { clearAll(); stop(); }, []);

  function cycleLang() {
    if (running) return;
    const idx  = LANGUAGES.findIndex(l => l.code === langCode);
    setLang(LANGUAGES[(idx + 1) % LANGUAGES.length].code);
  }

  // ── animated styles ───────────────────────────────────────────────────────
  const waveColor = PHASE_COLOR[phase];

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: running ? outerScale.value : idlePulse.value }],
    shadowOpacity: interpolate(glow.value, [0, 0.9], [0.1, 0.55]),
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: running ? innerScale.value : idlePulse.value }],
  }));
  const ripple1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple1.value, [0, 1], [0, 0.22]),
    transform: [{ scale: interpolate(ripple1.value, [0, 1], [1.0, 1.35]) }],
  }));
  const ripple2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple2.value, [0, 1], [0, 0.15]),
    transform: [{ scale: interpolate(ripple2.value, [0, 1], [1.0, 1.55]) }],
  }));

  const currentLang = LANGUAGES.find(l => l.code === langCode)!;
  const cws         = CALM_WAVE_SCRIPTS.en;

  const cwPhaseDisplayMap: Record<CWPhase, string> = {
    inhale: cws.inhale,
    hold:   cws.hold,
    exhale: cws.exhale,
  };
  const cwPhaseSubMap: Record<CWPhase, string> = {
    inhale: cws.inhaleSub,
    hold:   cws.holdSub,
    exhale: cws.exhaleSub,
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { pause(); router.back(); }} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Calm Wave</Text>
          {running && (
            <Text style={styles.cycleLabel}>
              {settling ? 'Getting ready' : `Wave ${cycles + 1}`} · {formatElapsed(elapsedSec)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={cycleLang} style={styles.langBtn} disabled={running}>
          <Text style={styles.langFlag}>{currentLang.flag}</Text>
          <Text style={[styles.langCode, running && { opacity: 0.4 }]}>{currentLang.code.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Ambient sound dock (visible & changeable idle + running) ── */}
      <View style={styles.musicDock}>
        <AmbientSoundDock selectedId={musicId} onSelect={setMusicId} accentColor={waveColor} />
      </View>

      {/* ── Wave animation ── */}
      <View style={styles.circleArea}>
        {/* Outer ripple rings (pulse during hold) */}
        <Animated.View style={[styles.ripple2, { borderColor: waveColor }, ripple2Style]} />
        <Animated.View style={[styles.ripple1, { borderColor: waveColor }, ripple1Style]} />

        {/* Main outer ring */}
        <Animated.View
          style={[styles.outerRing, { borderColor: waveColor + '55', shadowColor: waveColor }, outerStyle]}
        >
          {/* Inner ring */}
          <Animated.View style={[styles.innerRing, { borderColor: waveColor + '80' }, innerStyle]}>
            <View style={[styles.core, { backgroundColor: waveColor + '12' }]}>
              {settling ? (
                <>
                  <Ionicons name="leaf-outline" size={40} color={colors.text.tertiary} />
                  <Text style={styles.settleText}>Relax and{'\n'}get comfortable</Text>
                </>
              ) : running ? (
                <>
                  <Text style={[styles.phaseLabel, { color: waveColor }]}>
                    {cwPhaseDisplayMap[phase]}
                  </Text>
                  <Text style={[styles.countdown, { color: waveColor }]}>{countdown}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="water-outline" size={44} color={colors.text.tertiary} />
                  <Text style={styles.readyText}>Ready</Text>
                </>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* ── Phase subtitle ── */}
      <View style={styles.descArea}>
        <Text style={styles.phaseSub}>
          {settling
            ? 'Settle in — your guided wave begins in a moment'
            : running
              ? cwPhaseSubMap[phase]
              : '4 in · 2 hold · 6 out · voice in ' + currentLang.labelEn}
        </Text>
      </View>

      {/* ── Phase pattern bar ── */}
      <View style={styles.patternRow}>
        {PHASE_ORDER.map((p, i) => {
          const active = running && p === phase;
          const c = PHASE_COLOR[p];
          return (
            <View key={p} style={[styles.patternBar, { flex: PHASE_DUR[p] / 1000, backgroundColor: active ? c : c + '28', marginHorizontal: 2 }]}>
              {active && <View style={[StyleSheet.absoluteFill, { backgroundColor: c + '40', borderRadius: 4 }]} />}
            </View>
          );
        })}
      </View>
      <View style={styles.patternLabels}>
        <Text style={styles.patternLabel}>4s</Text>
        <Text style={styles.patternLabel}>2s</Text>
        <Text style={styles.patternLabel}>6s</Text>
      </View>

      {/* ── Cycles ── */}
      {cycles > 0 && (
        <Text style={styles.cycleCount}>{cycles} complete wave{cycles !== 1 ? 's' : ''}</Text>
      )}

      {/* ── CTA ── */}
      <View style={styles.btnArea}>
        <TouchableOpacity
          style={[styles.startBtn, { borderColor: running ? '#FF5722' : waveColor }]}
          onPress={running ? pause : begin}
          activeOpacity={0.8}
        >
          <Ionicons
            name={running ? (settling ? 'stop' : 'pause') : 'play'}
            size={18}
            color={running ? '#FF5722' : waveColor}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.startBtnText, { color: running ? '#FF5722' : waveColor }]}>
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

  // Wave circle
  circleArea:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ripple2: {
    position: 'absolute',
    width: CIRCLE + 100, height: CIRCLE + 100, borderRadius: (CIRCLE + 100) / 2,
    borderWidth: 1,
  },
  ripple1: {
    position: 'absolute',
    width: CIRCLE + 60, height: CIRCLE + 60, borderRadius: (CIRCLE + 60) / 2,
    borderWidth: 1,
  },
  outerRing: {
    width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 24, elevation: 10,
  },
  innerRing: {
    width: CIRCLE * 0.78, height: CIRCLE * 0.78, borderRadius: (CIRCLE * 0.78) / 2,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  core: {
    width: CIRCLE * 0.58, height: CIRCLE * 0.58, borderRadius: (CIRCLE * 0.58) / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  phaseLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2.5 },
  countdown:  { fontSize: 64, fontWeight: '200', lineHeight: 70 },
  readyText:  { ...typography.bodyLarge, color: colors.text.secondary, marginTop: 4 },
  settleText: {
    ...typography.body, color: colors.text.secondary,
    textAlign: 'center', lineHeight: 20, marginTop: 4, fontSize: 13,
  },

  // Description
  descArea: { alignItems: 'center', paddingVertical: spacing.md, minHeight: 40 },
  phaseSub: { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },

  // Pattern bar
  patternRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 8, borderRadius: 4, overflow: 'hidden',
    marginBottom: 4,
  },
  patternBar: { height: '100%', borderRadius: 4 },
  patternLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingHorizontal: 2,
  },
  patternLabel: { fontSize: 10, color: colors.text.tertiary, fontWeight: '600' },
  cycleCount:   {
    ...typography.body, color: colors.text.secondary,
    textAlign: 'center', marginBottom: spacing.sm,
  },

  // Button
  btnArea: { paddingBottom: spacing.xl, alignItems: 'center' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl * 1.5, paddingVertical: spacing.md,
    borderRadius: 100, borderWidth: 1.5,
  },
  startBtnText: { ...typography.bodyLarge, fontWeight: '700', letterSpacing: 0.5 },
});
