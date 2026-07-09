import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathingOrb } from '@/components/breathing/BreathingOrb';
import { FinalSessionLayout } from '@/components/breathing/FinalSessionLayout';
import { ParticleField } from '@/components/breathing/ParticleField';
import { RelaxBackground } from '@/components/breathing/RelaxBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import { BREATHING_PATTERNS } from '@/constants/breathingPatterns';
import { colors } from '@/constants/colors';
import { formatSessionDuration, getSessionById } from '@/constants/relaxSessions';
import type { AudioClipId } from '@/constants/audioGuide';
import { useRelaxContext } from '@/context/RelaxContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBreathingMusic } from '@/hooks/useBreathingMusic';
import { useAudioGuide } from '@/hooks/useAudioGuide';

// One accent for ALL Relax sessions (matches the Relax tab) — the color marks
// the feature, not the individual session, so it never changes between sessions.
const RELAX_ACCENT = '#34D399';

/**
 * Per-session voice plan (pre-recorded clips):
 * - Calm Flow: long guided intro (~2.5 min, "natural breathing"), then the orb
 *   leads a silent 5-5 rhythm — voice cues would contradict the recording.
 * - Box / Reset Wave / Bedtime: short settle-in intro, then per-phase cues
 *   that never interrupt the intro (they skip while it is still speaking).
 */
type SessionAudio = {
  intro: AudioClipId;
  complete: AudioClipId;
  phaseCues: boolean;
  /**
   * When true, the breathing loop (timer, phase text, cues) waits in a calm
   * "settling" state until the intro narration finishes — so the screen never
   * says "Hold" while the voice is still saying "get comfortable".
   */
  waitForIntro: boolean;
};
const SESSION_AUDIO: Record<string, SessionAudio> = {
  // Calm Flow: ~2.5 min guided intro. The session does NOT wait for all of it —
  // settling covers the first ~40s ("get comfortable"), then the orb's 5-5
  // rhythm starts under the remaining narration. Phase cues are ON but they
  // never interrupt the intro — spoken "in/out" starts once it finishes.
  'calm-flow': { intro: 'calm-flow/intro', complete: 'calm-flow/complete', phaseCues: true, waitForIntro: true },
  // Bedtime: gentle phase cues stay ON — users reported "sirf intro, phir
  // kuch nahi"; silence after the intro read as broken, not calming.
  'sleep-drop': { intro: 'bedtime/intro', complete: 'bedtime/complete', phaseCues: true, waitForIntro: true },
  'box-breathing': { intro: 'breathing/settle-in', complete: 'breathing/complete', phaseCues: true, waitForIntro: true },
  'reset-wave': { intro: 'breathing/settle-in', complete: 'breathing/complete', phaseCues: true, waitForIntro: true },
};
const DEFAULT_SESSION_AUDIO: SessionAudio = {
  intro: 'breathing/settle-in',
  complete: 'breathing/complete',
  phaseCues: true,
  waitForIntro: true,
};

export default function RelaxSessionPlayer() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  // Voice activity drives music ducking: ambient fades to ~30% while the guide speaks.
  const [voiceActive, setVoiceActive] = useState(false);
  const { play, stop, pause: pauseVoice, resume: resumeVoice, setVolume: setVoicePlayerVolume } = useAudioGuide({
    onActivity: setVoiceActive,
  });
  const { scripts } = useLanguage();

  // Validate session ID before proceeding
  if (!sessionId) {
    router.back();
    return null;
  }

  const session = getSessionById(sessionId);
  if (!session) {
    // Invalid session ID — exit gracefully
    router.back();
    return null;
  }

  const pattern = session.breathingPattern || 'calm';
  const patternDef = BREATHING_PATTERNS[pattern];
  const sessionAudio = SESSION_AUDIO[session.id] ?? DEFAULT_SESSION_AUDIO;

  // Exact, not rounded: for breathing sessions durationSeconds is derived
  // from the pattern (cycles × cycle length), so the timer ends precisely on
  // the last cycle — rounding to whole minutes was cutting cycles short.
  const displayDurationSeconds = Math.max(60, session.durationSeconds);

  // Session state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<'init' | 'countdown' | 'settling' | 'transition' | 'breathing' | 'ending'>('init');
  const [countdownNum, setCountdownNum] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // True once the intro narration has finished (or failed) — gates 'settling'.
  const [introDone, setIntroDone] = useState(true);

  // Breathing phase state — drives the orb's motion, the label/hint, and the
  // progress dots, all from the same tick so nothing can drift apart.
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [activePhase, setActivePhase] = useState<{ name: string; seconds: number } | null>(null);
  // The label crossfades: old text fades OUT, then this swaps and fades IN —
  // so "BREATHE IN" never snaps into "HOLD" mid-air.
  const [displayPhaseName, setDisplayPhaseName] = useState<string | null>(null);

  // Volume + mute. Muting keeps the session flow intact (clips still "play"
  // silently so intro→settling→breathing chaining and timing never change).
  const [voiceVolLocal, setVoiceVolLocal] = useState(0.8);
  const [ambientVolLocal, setAmbientVolLocal] = useState(0.4);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const effectiveVoiceVol = voiceMuted ? 0 : voiceVolLocal;

  // Apply mute/slider changes to the clip that is ALREADY playing (e.g. mid-intro).
  useEffect(() => {
    setVoicePlayerVolume(effectiveVoiceVol);
  }, [effectiveVoiceVol, setVoicePlayerVolume]);
  // The breathing timer reads the volume through a ref: with effectiveVoiceVol
  // in its deps, every slider movement restarted the interval and stalled the
  // session clock for the whole drag.
  const effectiveVoiceVolRef = useRef(effectiveVoiceVol);
  useEffect(() => {
    effectiveVoiceVolRef.current = effectiveVoiceVol;
  }, [effectiveVoiceVol]);

  // Animated values
  const countdownOpacity = useSharedValue(1);
  const orbOpacity = useSharedValue(0);
  const phaseTextOpacity = useSharedValue(0);
  const phaseTextScale = useSharedValue(0.8);
  const countdownScale = useSharedValue(1);

  const { selectedSound, setSelectedSound, startSession, lastEmotion } = useRelaxContext();
  const music = BREATHING_MUSIC.find(m => m.id === selectedSound) || BREATHING_MUSIC[0];

  const musicShouldPlay = isRunning && !isPaused && sessionPhase === 'breathing';
  // Muted music fades to 0 but keeps looping, so unmute fades right back in.
  // A muted voice shouldn't duck the music (no audible reason to dip).
  useBreathingMusic(
    music.url,
    musicShouldPlay,
    musicMuted ? 0 : ambientVolLocal,
    voiceActive && !voiceMuted,
  );

  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const labelSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Navigation to the completion screen lives in a ref so a re-render/dep
  // change during the 3.2s "Session complete" beat can never cancel it.
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // DEV testing: jump the clock to the last 10 seconds on next tick.
  const skipToEndRef = useRef(false);
  const lastSpokenPhaseRef = useRef(-1);
  const endingHandledRef = useRef(false);
  // True once we've navigated to the completion screen — the closing narration
  // must keep playing there, so unmount skips stop() in that one case.
  const completedRef = useRef(false);

  const handleStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(true);
    setSessionPhase('countdown');
    setCountdownNum(3);
    // Fade the orb in immediately so the center is never empty (incl. countdown/pause).
    orbOpacity.value = withTiming(1, { duration: 600 });
    setElapsedSeconds(0);
    setCurrentPhaseIndex(0);
    setActivePhase(null);
    setDisplayPhaseName(null);
    if (labelSwapTimerRef.current) clearTimeout(labelSwapTimerRef.current);
    lastSpokenPhaseRef.current = -1;
    endingHandledRef.current = false;
    completedRef.current = false;
    // Register with RelaxContext so the completion screen can record stats.
    startSession(session.id, lastEmotion ?? null);
    // Session intro starts under the countdown; phase cues won't interrupt it.
    setIntroDone(false);
    play(sessionAudio.intro, 800, effectiveVoiceVol, {
      protect: true, // phase cues must never cut the intro narration
      onDone: () => setIntroDone(true),
    });
  }, [play, sessionAudio, effectiveVoiceVol, startSession, session.id, lastEmotion]);

  const handleToggleVoiceMute = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceMuted(m => !m);
  }, []);

  const handleToggleMusicMute = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMusicMuted(m => !m);
  }, []);

  // Dragging a slider while muted unmutes it — the user clearly wants sound.
  const handleVoiceVolumeChange = useCallback((v: number) => {
    setVoiceVolLocal(v);
    setVoiceMuted(false);
  }, []);

  const handleAmbientVolumeChange = useCallback((v: number) => {
    setAmbientVolLocal(v);
    setMusicMuted(false);
  }, []);

  const handlePause = useCallback(() => {
    // The 3.2s "Session complete" beat can't pause — navigation to the
    // completion screen fires regardless, which left the closing narration
    // frozen and the completion screen silent.
    if (sessionPhase === 'ending') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Freeze the voice mid-clip with the session; music pause/fade follows isPaused.
    if (isPaused) resumeVoice();
    else pauseVoice();
    setIsPaused(!isPaused);
  }, [isPaused, pauseVoice, resumeVoice, sessionPhase]);

  const handleStop = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stop();
    setIsRunning(false);
    setIsPaused(false);
    router.back();
  }, [stop]);

  // Phase orchestration. Paused = frozen: without the isPaused gate the
  // countdown kept counting and the settling cap kept running under a pause —
  // only the voice and the breathing clock actually stopped.
  useEffect(() => {
    if (!isRunning || isPaused) return;
    let timer: ReturnType<typeof setTimeout>;

    if (sessionPhase === 'countdown') {
      if (countdownNum > 0) {
        timer = setTimeout(() => {
          countdownScale.value = withTiming(1.15, { duration: 200 }, () => {
            countdownScale.value = withTiming(1, { duration: 200 });
          });
          countdownOpacity.value = withTiming(0, { duration: 250 }, () => {
            runOnJS(setCountdownNum)(countdownNum - 1);
            countdownOpacity.value = withTiming(1, { duration: 250 });
          });
        }, 1000);
      } else {
        timer = setTimeout(() => {
          orbOpacity.value = withTiming(1, { duration: 800 });
          // Hold in a calm "settling" state while the intro narration finishes,
          // so phase text/cues don't contradict the voice ("get comfortable…").
          runOnJS(setSessionPhase)(
            sessionAudio.waitForIntro && !introDone ? 'settling' : 'transition',
          );
        }, 600);
      }
    } else if (sessionPhase === 'settling') {
      if (introDone) {
        runOnJS(setSessionPhase)('transition');
      } else {
        // Cap the settling wait: short intros (18-28s) finish inside it and
        // exit via introDone; Calm Flow's ~2.5 min intro keeps narrating over
        // the breathing rhythm once the session starts.
        timer = setTimeout(() => runOnJS(setSessionPhase)('transition'), 40000);
      }
    } else if (sessionPhase === 'transition') {
      timer = setTimeout(() => {
        runOnJS(setSessionPhase)('breathing');
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [isRunning, isPaused, sessionPhase, countdownNum, sessionId, stop, introDone, sessionAudio]);

  // Main breathing timer. A phase-change fires on the phase's FIRST second —
  // including the very first inhale (updatePhase runs once immediately, which
  // the old code missed) — so the orb's motion, the label, the haptic and the
  // voice cue all start together instead of drifting.
  useEffect(() => {
    if (sessionPhase !== 'breathing' || isPaused || !session) return;

    let elapsed = elapsedSeconds;

    const updatePhase = (el: number) => {
      if (patternDef.phases.length === 0) return;
      const phaseDefs = patternDef.phases;
      const cycleDuration = phaseDefs.reduce((sum: number, p: typeof phaseDefs[0]) => sum + p.duration, 0);
      if (cycleDuration <= 0) return;
      const timeInCycle = el % cycleDuration;

      let accum = 0;
      for (let i = 0; i < phaseDefs.length; i++) {
        accum += phaseDefs[i].duration;
        if (timeInCycle < accum) {
          const phaseDef = phaseDefs[i];
          const secsSincePhaseStart = timeInCycle - (accum - phaseDef.duration);
          runOnJS(setCurrentPhaseIndex)(i);

          if (i !== lastSpokenPhaseRef.current) {
            const isFirstPhase = lastSpokenPhaseRef.current === -1;
            lastSpokenPhaseRef.current = i;
            // Orb animates over the seconds actually left in this phase.
            runOnJS(setActivePhase)({
              name: phaseDef.name,
              seconds: Math.max(1, phaseDef.duration - secsSincePhaseStart),
            });

            // Label crossfade: old text fades out (~240ms), swaps while
            // invisible, new text fades in (~320ms). The very first label
            // has nothing to fade out, so it just fades in.
            if (labelSwapTimerRef.current) clearTimeout(labelSwapTimerRef.current);
            if (isFirstPhase) {
              runOnJS(setDisplayPhaseName)(phaseDef.name);
              phaseTextOpacity.value = 0;
              phaseTextScale.value = 0.92;
              phaseTextOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
              phaseTextScale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
            } else {
              labelSwapTimerRef.current = setTimeout(
                () => setDisplayPhaseName(phaseDef.name),
                240,
              );
              phaseTextOpacity.value = withSequence(
                withTiming(0, { duration: 240, easing: Easing.in(Easing.ease) }),
                withTiming(1, { duration: 320, easing: Easing.out(Easing.ease) }),
              );
              phaseTextScale.value = withSequence(
                withTiming(0.94, { duration: 240, easing: Easing.in(Easing.ease) }),
                withTiming(1, { duration: 320, easing: Easing.out(Easing.ease) }),
              );
            }

            // Haptic cue at the start of each phase (medium for holds, light otherwise).
            const hapticStyle = phaseDef.name.includes('hold')
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
            void Haptics.impactAsync(hapticStyle);

            // Per-phase voice cue (pre-recorded clip); cues never cut off a longer clip
            // (interrupt: false skips them while the intro is still speaking).
            if (sessionAudio.phaseCues) {
              const phaseClip: AudioClipId =
                phaseDef.name === 'inhale' ? 'breathing/breathe-in'
                : phaseDef.name === 'exhale' ? 'breathing/breathe-out'
                : phaseDef.name === 'hold-out' ? 'breathing/hold-empty'
                : 'breathing/hold';
              play(phaseClip, 100, effectiveVoiceVolRef.current, { interrupt: false });
            }
          }
          break;
        }
      }
    };

    // Fire the current phase right away (first inhale / resume from pause).
    updatePhase(elapsed);

    sessionTimerRef.current = setInterval(() => {
      if (skipToEndRef.current) {
        skipToEndRef.current = false;
        elapsed = Math.max(elapsed, displayDurationSeconds - 10);
      }
      elapsed++;
      runOnJS(setElapsedSeconds)(elapsed);

      if (elapsed >= displayDurationSeconds) {
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        runOnJS(setSessionPhase)('ending');
        return;
      }
      updatePhase(elapsed);
    }, 1000);

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [sessionPhase, isPaused, session, pattern, patternDef, play, sessionAudio]);

  // Session end: start the closing narration, show "Session complete" for a
  // short beat, then move on. The narration KEEPS PLAYING over the completion
  // screen — the shared player survives navigation and the completion screen
  // stops it when the user leaves.
  useEffect(() => {
    if (sessionPhase !== 'ending' || endingHandledRef.current) return;
    endingHandledRef.current = true;

    play(sessionAudio.complete, 400, effectiveVoiceVol, { protect: true });
    // Deliberately NOT cleared on dep changes (only on unmount): a volume/mute
    // tweak during this beat used to cancel the timer and strand the user here.
    navTimerRef.current = setTimeout(() => {
      completedRef.current = true;
      setIsRunning(false);
      if (sessionId) {
        // replace, not push: the finished player renders nothing, so leaving
        // it in the stack made "Back to Home" land on a blank screen.
        router.replace({
          pathname: '/(app)/relax/completion',
          params: { sessionId },
        } as never);
      }
    }, 3200);
  }, [sessionPhase, sessionAudio, sessionId, play, effectiveVoiceVol]);

  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (labelSwapTimerRef.current) clearTimeout(labelSwapTimerRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      // Player is released AFTER navigation, not before: when the session
      // completed, the closing narration continues on the completion screen.
      if (!completedRef.current) stop();
    };
  }, [stop]);

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centerFlex}>
          <Text style={styles.errorText}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const countdownAnimStyle = useAnimatedStyle(() => ({
    opacity: countdownOpacity.value,
    transform: [{ scale: countdownScale.value }],
  }));

  const orbAnimStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
  }));

  const phaseTextAnimStyle = useAnimatedStyle(() => ({
    opacity: phaseTextOpacity.value,
    transform: [{ scale: phaseTextScale.value }],
  }));

  // Big phase label + small hint, e.g. "BREATHE IN / Take a slow, deep breath".
  // Reads displayPhaseName (not activePhase) so the crossfade controls the swap.
  const phaseTextContent =
    displayPhaseName === 'inhale' ? { label: scripts.phaseInLabel, hint: scripts.phaseInHint }
    : displayPhaseName === 'hold-in' ? { label: scripts.phaseHoldLabel, hint: scripts.phaseHoldHint }
    : displayPhaseName === 'exhale' ? { label: scripts.phaseOutLabel, hint: scripts.phaseOutHint }
    : displayPhaseName === 'hold-out' ? { label: scripts.phaseHoldLabel, hint: scripts.phaseHoldOutHint }
    : null;

  const showPhaseDots =
    sessionPhase === 'breathing' && patternDef.phases.length > 1;
  // Bedtime: dots stay barely visible — only the active one lights up.
  const subtleDots = session.id === 'sleep-drop';
  const dotDoneColor  = subtleDots ? RELAX_ACCENT + '33' : RELAX_ACCENT + 'aa';
  const dotIdleBorder = subtleDots ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.3)';
  const lineLitColor  = subtleDots ? RELAX_ACCENT + '26' : RELAX_ACCENT + '88';
  const lineDimColor  = subtleDots ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* SVG depth background */}
      <RelaxBackground
        pattern={pattern}
        isActive={isRunning && sessionPhase === 'breathing'}
        accentColor={RELAX_ACCENT}
      />

      {/* ── Pre-session Init ── */}
      {!isRunning && sessionPhase === 'init' && (
        <View style={styles.initContainer}>
          {/* Back + orb row */}
          <View style={styles.initTop}>
            <TouchableOpacity
              onPress={() => {
                stop();
                router.back();
              }}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Center content */}
          <View style={styles.initCenter}>
            <BreathingOrb
              pattern={pattern}
              isRunning={false}
              isPaused={false}
              size={110}
              accentColor={RELAX_ACCENT}
            />
          </View>

          {/* Bottom info + CTA */}
          <View style={styles.initBottom}>
            <GlassCard style={styles.initCard}>
              <Text style={styles.sessionTitle}>{session.title}</Text>
              <Text style={styles.sessionDesc}>{session.description}</Text>

              <View style={styles.initMeta}>
                <View style={[styles.metaPill, { borderColor: RELAX_ACCENT + '30' }]}>
                  <Ionicons name="time-outline" size={12} color={RELAX_ACCENT} />
                  <Text style={[styles.metaText, { color: RELAX_ACCENT }]}>
                    {formatSessionDuration(displayDurationSeconds)}
                  </Text>
                </View>
              </View>
            </GlassCard>

            <GradientCTA
              label="START SESSION"
              icon={<Ionicons name="play" size={18} color="#fff" />}
              onPress={handleStart}
              colors={[RELAX_ACCENT, RELAX_ACCENT + 'cc']}
              glowColor={RELAX_ACCENT + '88'}
              letterSpacing={1.5}
              style={styles.initCta}
            />
          </View>
        </View>
      )}

      {/* ── Active Session ── */}
      {isRunning && (
        <View style={styles.sessionContainer}>
          {/* Exit button (top left) — clear "close session" affordance */}
          <TouchableOpacity onPress={handleStop} style={styles.backBtnTop}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.75)" />
            <Text style={styles.exitLabel}>End</Text>
          </TouchableOpacity>

          {/* DEV only: jump to the last 10s to test the ending/completion flow */}
          {__DEV__ && sessionPhase === 'breathing' && (
            <TouchableOpacity
              onPress={() => { skipToEndRef.current = true; }}
              style={styles.devSkipBtn}
            >
              <Ionicons name="play-forward" size={14} color="#FBBF24" />
              <Text style={styles.devSkipLabel}>0:10</Text>
            </TouchableOpacity>
          )}

          {/* Main content: Final layout with scrollable sound grid */}
          <FinalSessionLayout
            voiceVolume={voiceVolLocal}
            ambientVolume={ambientVolLocal}
            onVoiceVolumeChange={handleVoiceVolumeChange}
            onAmbientVolumeChange={handleAmbientVolumeChange}
            voiceMuted={voiceMuted}
            musicMuted={musicMuted}
            onToggleVoiceMute={handleToggleVoiceMute}
            onToggleMusicMute={handleToggleMusicMute}
            onStop={handleStop}
            isPaused={isPaused}
            onTogglePause={handlePause}
            selectedId={selectedSound}
            onSelect={setSelectedSound}
            accentColor={RELAX_ACCENT}
            elapsedSeconds={elapsedSeconds}
            sessionDuration={displayDurationSeconds}
          />

          {/* Centered breathing orb overlaid */}
          <View style={styles.orbContainer}>
            {(sessionPhase === 'countdown' ||
              sessionPhase === 'settling' ||
              sessionPhase === 'transition' ||
              sessionPhase === 'breathing') && (
              <Animated.View style={[orbAnimStyle, styles.orbWrap]}>
                {/* ONE ring only (the phase ring inside the orb) — session
                    progress lives in the 0:00/5:00 timer, not another circle.
                    Orb idles gently during countdown, runs the pattern once breathing starts.
                    No secondsLeft → no ambiguous number inside; phase progress + text show state. */}
                <BreathingOrb
                  pattern={pattern}
                  isRunning={sessionPhase === 'transition' || sessionPhase === 'breathing'}
                  isPaused={isPaused}
                  size={220}
                  phaseName={activePhase?.name ?? null}
                  phaseSeconds={activePhase?.seconds}
                  // Narration sessions (no pattern) get a barely-there 13s-per-
                  // direction wave; Calm Flow keeps its gentle 3s wave.
                  waveSeconds={session.breathingPattern ? 3 : 13}
                  accentColor={RELAX_ACCENT}
                  // No pulsing/rings while the intro narration speaks — motion
                  // starts only when the actual breathing exercise does.
                  still={sessionPhase === 'countdown' || sessionPhase === 'settling'}
                />
              </Animated.View>
            )}

            {/* "Get ready…" number overlays on top of the orb */}
            {sessionPhase === 'countdown' && (
              <Animated.View
                style={[styles.countdownGroup, countdownAnimStyle]}
                pointerEvents="none"
              >
                <Text style={styles.countdownLabel}>Get ready…</Text>
                <Text style={[styles.countdownNum, { color: RELAX_ACCENT }]}>
                  {countdownNum}
                </Text>
              </Animated.View>
            )}

            {/* While the intro narration speaks, the screen says the same thing —
                no "Hold"/"Breathe in" until the exercise actually starts. */}
            {sessionPhase === 'settling' && (
              <Text style={styles.settlingText}>{scripts.breatheSettleIntro}</Text>
            )}

            {/* Phase label + hint: "BREATHE IN / Take a slow, deep breath" */}
            {sessionPhase === 'breathing' && phaseTextContent && (
              <Animated.View
                style={[styles.phaseTextGroup, phaseTextAnimStyle]}
                pointerEvents="none"
              >
                <Text style={styles.phaseLabel}>{phaseTextContent.label}</Text>
                <Text style={styles.phaseHint}>{phaseTextContent.hint}</Text>
              </Animated.View>
            )}

            {/* Cycle progress dots: one per phase; the active one fades in/out
                (~280ms) instead of snapping. Bedtime uses the subtle palette. */}
            {showPhaseDots && (
              <View style={styles.dotsRow} pointerEvents="none">
                {patternDef.phases.map((p: typeof patternDef.phases[0], i: number) => (
                  <View key={p.name} style={styles.dotGroup}>
                    {i > 0 && (
                      <View
                        style={[
                          styles.dotLine,
                          {
                            backgroundColor:
                              i <= currentPhaseIndex ? lineLitColor : lineDimColor,
                          },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.dot,
                        i <= currentPhaseIndex
                          ? { backgroundColor: dotDoneColor, borderColor: 'transparent' }
                          : { backgroundColor: 'transparent', borderColor: dotIdleBorder },
                      ]}
                    >
                      {i === currentPhaseIndex && (
                        <Animated.View
                          entering={FadeIn.duration(280)}
                          exiting={FadeOut.duration(280)}
                          style={[
                            styles.dotActive,
                            { backgroundColor: RELAX_ACCENT, shadowColor: RELAX_ACCENT },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {sessionPhase === 'ending' && (
              <Text style={styles.endingText}>{scripts.sessionComplete}</Text>
            )}
          </View>
        </View>
      )}

      {/* Particles overlay */}
      {isRunning && (
        <ParticleField
          musicId={selectedSound}
          isActive={!isPaused && sessionPhase === 'breathing'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.text.primary,
  },

  /* ── Shared back button ── */
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Pre-session Init (clean minimal) ── */
  initContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  initTop: {
    paddingTop: 8,
  },
  initCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  initBottom: {
    gap: 14,
  },
  initCard: {
    alignItems: 'center',
    gap: 10,
  },
  sessionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sessionDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: '88%',
  },
  initMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  initCta: {
    marginTop: 2,
  },

  /* ── Active Session ── */
  sessionContainer: {
    flex: 1,
    position: 'relative',
  },

  backBtnTop: {
    position: 'absolute',
    top: 12,
    left: 16,
    height: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 10,
  },
  exitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },

  // DEV-only skip-to-end pill (top right); never ships in release builds.
  devSkipBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    zIndex: 10,
  },
  devSkipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },


  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Orb Container (centered, large) ── */
  orbContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  countdownGroup: {
    alignItems: 'center',
    gap: 4,
  },
  countdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  countdownNum: {
    fontSize: 140,
    fontWeight: '200',
    lineHeight: 140,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },

  // Phase label + hint sit just above the orb (orb ≈ 260px tall, centered).
  phaseTextGroup: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -218,
    alignItems: 'center',
    gap: 5,
  },
  phaseLabel: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  phaseHint: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  // Cycle progress dots just below the orb.
  dotsRow: {
    position: 'absolute',
    top: '50%',
    marginTop: 152,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  // Glowing overlay on the active dot — slightly larger than the base dot so
  // its fade-in/out reads as the dot "lighting up".
  dotActive: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 7.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  dotLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 5,
  },

  settlingText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    // Same slot as the phase text: just above the orb.
    position: 'absolute',
    top: '50%',
    left: 36,
    right: 36,
    marginTop: -210,
  },

  endingText: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.3,
  },
});
