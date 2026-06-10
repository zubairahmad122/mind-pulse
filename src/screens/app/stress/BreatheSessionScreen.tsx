import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmbientSoundDock } from '@/components/breathing/AmbientSoundDock';
import { BREATH_MODES, getBreathMode, type BreathModeId } from '@/constants/breathingModes';
import { BREATHING_MUSIC, type BreathingMusicId } from '@/constants/breathingMusic';
import { useBreathingMusic } from '@/hooks/useBreathingMusic';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';
import { useLanguage } from '@/context/LanguageContext';

const { width: SW } = Dimensions.get('window');

// ─── Ambient word cycling (per mode) ─────────────────────────────────────────
const AMBIENT_WORDS: Record<BreathModeId, string[]> = {
  'calm-flow':   ['just watching', 'nowhere to be', 'nothing to control', 'here, now'],
  'box-release': ['open', 'resting', 'softening', 'stillness'],
  'sleep-drop':  ['heavier', 'quieter', 'drifting', 'safe'],
  'reset-wave':  ['rising', 'cresting', 'falling', 'returning'],
};

const SETTLE_MS = 5500;

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Calm Flow: layered fog orb ──────────────────────────────────────────────
function CalmFlowOrb({ color }: { color: string }) {
  const scale1 = useSharedValue(0.82);
  const scale2 = useSharedValue(0.78);
  const scale3 = useSharedValue(0.72);
  const glow1  = useSharedValue(0.12);
  const glow2  = useSharedValue(0.06);

  useEffect(() => {
    // Irregular timing = organic feel
    scale1.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.82, { duration: 4800, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    scale2.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1.05, { duration: 4400, easing: Easing.inOut(Easing.ease) })),
        withTiming(0.80, { duration: 4600, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    scale3.value = withRepeat(
      withSequence(
        withDelay(700, withTiming(1.08, { duration: 4600, easing: Easing.inOut(Easing.ease) })),
        withTiming(0.74, { duration: 4400, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    glow1.value = withRepeat(
      withSequence(
        withTiming(0.38, { duration: 4200 }),
        withTiming(0.08, { duration: 4800 }),
      ), -1, false,
    );
    glow2.value = withRepeat(
      withSequence(
        withDelay(300, withTiming(0.22, { duration: 4400 })),
        withTiming(0.05, { duration: 4600 }),
      ), -1, false,
    );
    return () => {
      [scale1, scale2, scale3, glow1, glow2].forEach(v => cancelAnimation(v));
    };
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }], opacity: glow1.value + 0.55 }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }], opacity: glow1.value * 0.7 + 0.4 }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }], opacity: glow2.value + 0.18 }));
  const g1 = useAnimatedStyle(() => ({ opacity: glow1.value }));
  const g2 = useAnimatedStyle(() => ({ opacity: glow2.value }));

  return (
    <View style={orb.wrap}>
      {/* Outer glow halos */}
      <Animated.View style={[orb.halo2, { borderColor: color + '22' }, g2]} />
      <Animated.View style={[orb.halo1, { borderColor: color + '35' }, g1]} />
      {/* Fog layers */}
      <Animated.View style={[orb.layer3, { backgroundColor: color + '08' }, s3]} />
      <Animated.View style={[orb.layer2, { backgroundColor: color + '14' }, s2]} />
      <Animated.View style={[orb.layer1, { backgroundColor: color + '22', borderColor: color + '40', shadowColor: color }, s1]} />
    </View>
  );
}

const orb = StyleSheet.create({
  wrap:   { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  halo2:  { position: 'absolute', width: 320, height: 320, borderRadius: 160, borderWidth: 1 },
  halo1:  { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 1.5 },
  layer3: { position: 'absolute', width: 240, height: 240, borderRadius: 120 },
  layer2: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  layer1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 32, elevation: 12,
  },
});

// ─── Box Release: 4-petal bloom ───────────────────────────────────────────────
const BOX_DUR = 4000; // ms per phase
const BOX_PHASES = ['open', 'rest-open', 'close', 'rest-close'] as const;

function BoxBloomOrb({ color, paused }: { color: string; paused: boolean }) {
  const petalN = useSharedValue(0);
  const petalS = useSharedValue(0);
  const petalE = useSharedValue(0);
  const petalW = useSharedValue(0);
  const coreScale = useSharedValue(0.9);
  const glowOp = useSharedValue(0.1);

  const phaseRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  function runPhase() {
    if (pausedRef.current) { timerRef.current = setTimeout(runPhase, 200); return; }
    const ph = BOX_PHASES[phaseRef.current % 4];
    const isOpen   = ph === 'open';
    const isClosed = ph === 'close';
    const dur = BOX_DUR - 100;

    if (isOpen) {
      [petalN, petalS, petalE, petalW].forEach(v => {
        v.value = withTiming(68, { duration: dur, easing: Easing.out(Easing.ease) });
      });
      coreScale.value = withTiming(1.12, { duration: dur, easing: Easing.out(Easing.ease) });
      glowOp.value    = withTiming(0.4, { duration: dur });
    } else if (isClosed) {
      [petalN, petalS, petalE, petalW].forEach(v => {
        v.value = withTiming(0, { duration: dur, easing: Easing.in(Easing.ease) });
      });
      coreScale.value = withTiming(0.88, { duration: dur, easing: Easing.in(Easing.ease) });
      glowOp.value    = withTiming(0.08, { duration: dur });
    }
    // hold phases: nothing changes

    phaseRef.current += 1;
    timerRef.current = setTimeout(runPhase, BOX_DUR);
  }

  useEffect(() => {
    timerRef.current = setTimeout(runPhase, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const makeStyle = (sv: typeof petalN, axis: 'Y' | 'X', dir: -1 | 1) =>
    useAnimatedStyle(() => ({
      transform: axis === 'Y'
        ? [{ translateY: sv.value * dir }]
        : [{ translateX: sv.value * dir }],
    }));

  const styleN = makeStyle(petalN, 'Y', -1);
  const styleS = makeStyle(petalS, 'Y', 1);
  const styleE = makeStyle(petalE, 'X', 1);
  const styleW = makeStyle(petalW, 'X', -1);
  const styleC = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
    shadowOpacity: glowOp.value,
  }));
  const styleG = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  return (
    <View style={bloom.wrap}>
      <Animated.View style={[bloom.glow, { borderColor: color + '40' }, styleG]} />
      {/* Petals */}
      <Animated.View style={[bloom.petal, { backgroundColor: color + '35', top: 60 }, styleN]} />
      <Animated.View style={[bloom.petal, { backgroundColor: color + '35', bottom: 60 }, styleS]} />
      <Animated.View style={[bloom.petal, { backgroundColor: color + '35', right: 60 }, styleE]} />
      <Animated.View style={[bloom.petal, { backgroundColor: color + '35', left: 60 }, styleW]} />
      {/* Core */}
      <Animated.View
        style={[bloom.core, { backgroundColor: color + '28', borderColor: color + '60', shadowColor: color }, styleC]}
      />
    </View>
  );
}

const bloom = StyleSheet.create({
  wrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1 },
  petal: {
    position: 'absolute',
    width: 60, height: 60, borderRadius: 30,
  },
  core: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 28, elevation: 10,
  },
});

// ─── Sleep Drop: single slow moon orb ────────────────────────────────────────
function SleepMoonOrb({ color }: { color: string }) {
  const moonScale = useSharedValue(1.0);
  const glowOp    = useSharedValue(0.05);
  const haloOp    = useSharedValue(0.08);

  useEffect(() => {
    moonScale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    glowOp.value = withRepeat(
      withSequence(
        withTiming(0.22, { duration: 8000 }),
        withTiming(0.04, { duration: 8000 }),
      ), -1, false,
    );
    haloOp.value = withRepeat(
      withSequence(
        withDelay(2000, withTiming(0.18, { duration: 8000 })),
        withTiming(0.04, { duration: 8000 }),
      ), -1, false,
    );
    return () => { [moonScale, glowOp, haloOp].forEach(v => cancelAnimation(v)); };
  }, []);

  const moonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: moonScale.value }],
    shadowOpacity: glowOp.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOp.value }));

  return (
    <View style={moon.wrap}>
      <Animated.View style={[moon.haloOuter, { borderColor: color + '30' }, haloStyle]} />
      <Animated.View style={[moon.glowLayer, { backgroundColor: color + '12' }, glowStyle]} />
      <Animated.View
        style={[moon.orb, { backgroundColor: color + '25', borderColor: color + '50', shadowColor: color }, moonStyle]}
      />
      {/* Subtle inner core */}
      <View style={[moon.core, { backgroundColor: color + '15' }]} />
    </View>
  );
}

const moon = StyleSheet.create({
  wrap:       { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  haloOuter:  { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 1 },
  glowLayer:  { position: 'absolute', width: 240, height: 240, borderRadius: 120 },
  orb: {
    position: 'absolute', width: 190, height: 190, borderRadius: 95,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 40, elevation: 12,
  },
  core: { width: 100, height: 100, borderRadius: 50 },
});

// ─── Reset Wave: horizontal layered waves ─────────────────────────────────────
function ResetWave({ color }: { color: string }) {
  const w1Y = useSharedValue(0);
  const w2Y = useSharedValue(10);
  const w3Y = useSharedValue(-10);
  const w1S = useSharedValue(1);
  const w2S = useSharedValue(0.96);

  useEffect(() => {
    // Layer 1 — front, full amplitude
    w1Y.value = withRepeat(
      withSequence(
        withTiming(-28, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(28,  { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    // Layer 2 — mid, offset phase
    w2Y.value = withRepeat(
      withSequence(
        withDelay(1300, withTiming(-20, { duration: 3400, easing: Easing.inOut(Easing.ease) })),
        withTiming(20,  { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    // Layer 3 — back, slower
    w3Y.value = withRepeat(
      withSequence(
        withDelay(800, withTiming(-14, { duration: 5000, easing: Easing.inOut(Easing.ease) })),
        withTiming(14, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    // Subtle width breathe on layer 1
    w1S.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 4000 }),
        withTiming(0.97, { duration: 4000 }),
      ), -1, false,
    );
    w2S.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(1.03, { duration: 3800 })),
        withTiming(0.95, { duration: 3800 }),
      ), -1, false,
    );
    return () => { [w1Y, w2Y, w3Y, w1S, w2S].forEach(v => cancelAnimation(v)); };
  }, []);

  const s1 = useAnimatedStyle(() => ({
    transform: [{ translateY: w1Y.value }, { scaleX: w1S.value }],
  }));
  const s2 = useAnimatedStyle(() => ({
    transform: [{ translateY: w2Y.value }, { scaleX: w2S.value }],
  }));
  const s3 = useAnimatedStyle(() => ({
    transform: [{ translateY: w3Y.value }],
  }));

  const waveW = SW * 1.2;

  return (
    <View style={wave.wrap}>
      {/* Layer 3 — back */}
      <Animated.View
        style={[wave.strip, { width: waveW, backgroundColor: color + '14', borderTopLeftRadius: 60, borderTopRightRadius: 60 }, s3]}
      />
      {/* Layer 2 — mid */}
      <Animated.View
        style={[wave.strip, { width: waveW, backgroundColor: color + '22', borderTopLeftRadius: 50, borderTopRightRadius: 50 }, s2]}
      />
      {/* Layer 1 — front */}
      <Animated.View
        style={[wave.strip, { width: waveW, backgroundColor: color + '35', borderTopLeftRadius: 42, borderTopRightRadius: 42 }, s1]}
      />
      {/* Top edge shimmer line */}
      <Animated.View
        style={[wave.shimmer, { width: waveW * 0.6, backgroundColor: color + '60' }, s1]}
      />
    </View>
  );
}

const wave = StyleSheet.create({
  wrap:    { width: SW, height: 180, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  strip:   { position: 'absolute', height: 120 },
  shimmer: { position: 'absolute', height: 2, borderRadius: 1, top: '35%' },
});

// ─── Ambient word cycling ─────────────────────────────────────────────────────
function AmbientWord({ modeId }: { modeId: BreathModeId }) {
  const [wordIdx, setWordIdx] = useState(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let i = 0;
    function cycle() {
      opacity.value = withTiming(0, { duration: 800 }, () => {
        opacity.value = withTiming(0.45, { duration: 800 });
      });
      i = (i + 1) % AMBIENT_WORDS[modeId].length;
      setWordIdx(i);
    }
    // First fade-in
    opacity.value = withTiming(0.4, { duration: 1500 });
    const id = setInterval(cycle, 7000);
    return () => clearInterval(id);
  }, [modeId]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text style={[wrd.text, style]}>
      {AMBIENT_WORDS[modeId][wordIdx]}
    </Animated.Text>
  );
}

const wrd = StyleSheet.create({
  text: {
    fontSize: 14, fontWeight: '400', color: '#ffffff',
    letterSpacing: 1.5, textAlign: 'center', fontStyle: 'italic',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BreatheSessionScreen() {
  const router = useRouter();
  const { modeId } = useLocalSearchParams<{ modeId: BreathModeId }>();
  const mode = getBreathMode(modeId ?? 'calm-flow');

  const { langCode } = useLanguage();
  const { guide, stop, scripts } = useVoiceGuide();

  const [paused, setPaused] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [musicId, setMusicId] = useState<BreathingMusicId>(mode.ambientId);
  const pausedRef = useRef(false);
  const voiceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ambient music — user-selectable, defaults to the mode's curated track
  const music = BREATHING_MUSIC.find(m => m.id === musicId) ?? BREATHING_MUSIC[1];
  useBreathingMusic(music.url, !paused && introDone);

  // Settle intro: a short "relax and get comfortable" beat before the session starts
  useEffect(() => {
    guide(scripts.breatheSettleIntro, 200);
    introTimer.current = setTimeout(() => setIntroDone(true), SETTLE_MS);
    return () => { if (introTimer.current) clearTimeout(introTimer.current); };
  }, []);

  // Elapsed timer — starts once the settle intro finishes
  useEffect(() => {
    if (!introDone) return;
    elapsedTimer.current = setInterval(() => {
      if (!pausedRef.current) setElapsedSec(s => s + 1);
    }, 1000);
    return () => { if (elapsedTimer.current) clearInterval(elapsedTimer.current); };
  }, [introDone]);

  // UI fade-in
  const uiFade = useSharedValue(0);
  useEffect(() => { uiFade.value = withTiming(1, { duration: 800 }); }, []);
  const uiStyle = useAnimatedStyle(() => ({ opacity: uiFade.value }));

  // Pause button pulse
  const pausePulse = useSharedValue(1);
  useEffect(() => {
    pausePulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    return () => cancelAnimation(pausePulse);
  }, []);
  const pauseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pausePulse.value }] }));

  // Schedule all voice phrases — gated until the settle intro finishes
  useEffect(() => {
    if (!introDone) return;
    const lang = langCode === 'ps' ? 'ur' : langCode;
    mode.voice.forEach(entry => {
      const t = setTimeout(() => {
        if (!pausedRef.current) {
          const text = lang === 'hi' ? entry.hi : lang === 'ur' ? entry.ur : entry.en;
          guide(text);
        }
      }, entry.delayMs);
      voiceTimers.current.push(t);
    });

    // Auto-navigate to completion
    const totalMs = mode.durationMin * 60 * 1000;
    sessionTimer.current = setTimeout(() => {
      router.replace({
        pathname: '/(app)/stress/breathe-done',
        params: { modeId: mode.id, durationSec: totalMs / 1000 },
      } as never);
    }, totalMs);

    return () => {
      voiceTimers.current.forEach(clearTimeout);
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
      stop();
    };
  }, [introDone]);

  function togglePause() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pausedRef.current = !paused;
    setPaused(p => !p);
  }

  function exitEarly() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace({
      pathname: '/(app)/stress/breathe-done',
      params: { modeId: mode.id, durationSec: mode.durationMin * 30 }, // ~half session on early exit
    } as never);
  }

  const isWave = mode.id === 'reset-wave';

  return (
    <View style={[s.root, { backgroundColor: mode.bgTo }]}>
      <StatusBar hidden />

      {/* Background gradient suggestion (top to bottom) */}
      <View
        style={[
          s.bgGradient,
          { backgroundColor: mode.bgFrom },
        ]}
      />

      <SafeAreaView style={s.safe}>
        {/* ── Minimal top bar ── */}
        <Animated.View style={[s.topBar, uiStyle]}>
          <TouchableOpacity onPress={exitEarly} style={s.exitBtn} hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
          <Text style={[s.modeTitle, { color: mode.color + 'AA' }]}>{mode.title}</Text>
          {introDone ? (
            <Text style={[s.timerText, { color: mode.color + '80' }]}>{formatElapsed(elapsedSec)}</Text>
          ) : (
            <View style={{ width: 34 }} />
          )}
        </Animated.View>

        {introDone ? (
          <>
            {/* ── Main animation area ── */}
            <View style={[s.animArea, isWave && s.animAreaWave]}>
              {mode.id === 'calm-flow'   && <CalmFlowOrb  color={mode.color} />}
              {mode.id === 'box-release' && <BoxBloomOrb   color={mode.color} paused={paused} />}
              {mode.id === 'sleep-drop'  && <SleepMoonOrb  color={mode.color} />}
              {mode.id === 'reset-wave'  && <ResetWave     color={mode.color} />}
            </View>

            {/* ── Ambient word ── */}
            <Animated.View style={[s.wordArea, uiStyle]}>
              <AmbientWord modeId={mode.id} />
            </Animated.View>
          </>
        ) : (
          /* ── Settle intro ── */
          <View style={s.introArea}>
            <Ionicons name="leaf-outline" size={48} color={mode.color + 'CC'} />
            <Text style={[s.introTitle, { color: mode.color + 'DD' }]}>Relax and get comfortable</Text>
            <Text style={s.introSub}>
              Find a comfortable position, relax your shoulders, and let your breathing settle.
            </Text>
          </View>
        )}

        {/* ── Bottom controls ── */}
        <Animated.View style={[s.bottomBar, uiStyle]}>
          {/* Ambient sound dock — visible & changeable throughout */}
          <AmbientSoundDock selectedId={musicId} onSelect={setMusicId} accentColor={mode.color} compact />

          {introDone && (
            <>
              {/* Pause indicator */}
              <TouchableOpacity
                onPress={togglePause}
                style={s.pauseWrap}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[s.pauseRing, { borderColor: mode.color + '35' }, !paused && pauseStyle]}
                >
                  <Ionicons
                    name={paused ? 'play' : 'pause'}
                    size={18}
                    color={mode.color + 'CC'}
                  />
                </Animated.View>
                <Text style={[s.pauseLabel, { color: mode.color + '70' }]}>
                  {paused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>

              {/* Paused overlay text */}
              {paused && (
                <Text style={s.pausedMsg}>
                  Paused — take your time
                </Text>
              )}
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bgGradient: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '50%', opacity: 0.85,
  },
  safe:     { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 0,
  },
  exitBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  modeTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  timerText: { width: 34, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textAlign: 'right' },

  // Settle intro
  introArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 40,
  },
  introTitle: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
  introSub: {
    fontSize: 13, lineHeight: 20, textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
  },

  // Animation area
  animArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  animAreaWave: {
    justifyContent: 'flex-end', paddingBottom: 20,
  },

  // Ambient word
  wordArea: {
    height: 40, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },

  // Bottom bar
  bottomBar: {
    alignItems: 'center', paddingBottom: 32, paddingTop: 8, gap: 8,
  },
  pauseWrap:   { alignItems: 'center', gap: 6 },
  pauseRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  pauseLabel:  { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  pausedMsg: {
    fontSize: 13, color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic', letterSpacing: 0.3,
  },
});
