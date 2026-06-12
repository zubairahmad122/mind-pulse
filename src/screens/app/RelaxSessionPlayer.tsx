import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathingOrb } from '@/components/breathing/BreathingOrb';
import { FinalSessionLayout } from '@/components/breathing/FinalSessionLayout';
import { ParticleField } from '@/components/breathing/ParticleField';
import { RelaxBackground } from '@/components/breathing/RelaxBackground';
import { BREATHING_MUSIC } from '@/constants/breathingMusic';
import { BREATHING_PATTERNS } from '@/constants/breathingPatterns';
import { colors } from '@/constants/colors';
import { getSessionById } from '@/constants/relaxSessions';

import { getSessionVoiceScript } from '@/constants/sessionVoiceScripts';
import { useRelaxContext } from '@/context/RelaxContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBreathingMusic } from '@/hooks/useBreathingMusic';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

export default function RelaxSessionPlayer() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { guide, stop, scripts } = useVoiceGuide();
  const { langCode } = useLanguage();

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

  // Session state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<'init' | 'countdown' | 'transition' | 'breathing' | 'ending'>('init');
  const [countdownNum, setCountdownNum] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Breathing phase state
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseSecondsRemaining, setPhaseSecondsRemaining] = useState(0);
  const [phaseFill, setPhaseFill] = useState(0);
  const [phaseName, setPhaseName] = useState('');

  // Volume
  const [voiceVolLocal, setVoiceVolLocal] = useState(0.8);
  const [ambientVolLocal, setAmbientVolLocal] = useState(0.4);

  // Animated values
  const countdownOpacity = useSharedValue(1);
  const orbOpacity = useSharedValue(0);
  const phaseTextOpacity = useSharedValue(0);
  const phaseTextScale = useSharedValue(0.8);
  const countdownScale = useSharedValue(1);

  const { selectedSound, setSelectedSound } = useRelaxContext();
  const music = BREATHING_MUSIC.find(m => m.id === selectedSound) || BREATHING_MUSIC[0];

  const musicShouldPlay = isRunning && !isPaused && sessionPhase === 'breathing';
  useBreathingMusic(music.url, musicShouldPlay, ambientVolLocal);

  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceSegmentsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastSpokenPhaseRef = useRef(-1);

  const handleStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(true);
    setSessionPhase('countdown');
    setCountdownNum(3);
    setElapsedSeconds(0);
    setCurrentPhaseIndex(0);
    lastSpokenPhaseRef.current = -1;
    // Stagger voice guidance to allow natural playback without cuts
    guide(scripts.breatheSettleIntro, 500, voiceVolLocal);
    guide(scripts.boxBreathIntro, 3500, voiceVolLocal);
  }, [guide, voiceVolLocal]);

  const handlePause = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(prev => !prev);
  }, []);

  const handleStop = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stop();
    setIsRunning(false);
    setIsPaused(false);
    router.back();
  }, [stop]);

  // Phase orchestration
  useEffect(() => {
    if (!isRunning) return;
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
          runOnJS(setSessionPhase)('transition');
        }, 600);
      }
    } else if (sessionPhase === 'transition') {
      timer = setTimeout(() => {
        runOnJS(setSessionPhase)('breathing');
      }, 2000);
    } else if (sessionPhase === 'ending') {
      timer = setTimeout(() => {
        setIsRunning(false);
        stop();
        if (sessionId) {
          router.push({
            pathname: '/(app)/relax/completion',
            params: { sessionId },
          } as never);
        }
      }, 4000);
    }

    return () => clearTimeout(timer);
  }, [isRunning, sessionPhase, countdownNum, sessionId, stop]);

  // Main breathing timer
  useEffect(() => {
    if (sessionPhase !== 'breathing' || isPaused || !session) return;

    let elapsed = elapsedSeconds;

    sessionTimerRef.current = setInterval(() => {
      elapsed++;
      runOnJS(setElapsedSeconds)(elapsed);

      if (elapsed >= session.durationSeconds) {
        runOnJS(setSessionPhase)('ending');
        return;
      }

      if (pattern !== 'calm' && patternDef.phases.length > 0) {
        const phaseDefs = patternDef.phases;
        const cycleDuration = phaseDefs.reduce((sum: number, p: typeof phaseDefs[0]) => sum + p.duration, 0);
        const timeInCycle = elapsed % cycleDuration;

        let accum = 0;
        let newPhaseIndex = 0;

        for (let i = 0; i < phaseDefs.length; i++) {
          accum += phaseDefs[i].duration;
          if (timeInCycle < accum) {
            newPhaseIndex = i;
            const phaseDef = phaseDefs[i];
            const secsSincePhaseStart = timeInCycle - phaseDefs.slice(0, i).reduce((s: number, p: typeof phaseDefs[0]) => s + p.duration, 0);
            const secsRemaining = Math.max(0, Math.floor(phaseDef.duration - secsSincePhaseStart));

            const pct = phaseDef.duration > 0
              ? (phaseDef.name === 'exhale' || phaseDef.name === 'hold-out'
                  ? (secsRemaining / phaseDef.duration) * 100
                  : (secsSincePhaseStart / phaseDef.duration) * 100)
              : 50;

            runOnJS(setCurrentPhaseIndex)(newPhaseIndex);
            runOnJS(setPhaseFill)(Math.round(Math.min(100, Math.max(0, pct))));
            runOnJS(setPhaseSecondsRemaining)(secsRemaining);

            let displayText = '';
            if (phaseDef.name === 'inhale') displayText = scripts.breatheIn;
            else if (phaseDef.name === 'exhale') displayText = scripts.breatheOut;
            else if (phaseDef.name.includes('hold')) displayText = scripts.holdBreath;

            if (i !== lastSpokenPhaseRef.current && secsRemaining === phaseDef.duration) {
              lastSpokenPhaseRef.current = i;
              runOnJS(setPhaseName)(displayText);

              phaseTextOpacity.value = 0;
              phaseTextScale.value = 0.8;
              phaseTextOpacity.value = withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) });
              phaseTextScale.value = withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) });

              if (displayText) runOnJS(guide)(displayText, 100, voiceVolLocal);
            }
            break;
          }
        }
      }
    }, 1000);

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [sessionPhase, isPaused, session, pattern, patternDef, guide, voiceVolLocal]);

  // Voice segments from script
  useEffect(() => {
    // Clear any pending voice timeouts when paused
    if (isPaused) {
      voiceSegmentsRef.current.forEach(clearTimeout);
      voiceSegmentsRef.current = [];
      return;
    }

    if (!isRunning || !sessionId) return;
    const voiceScript = getSessionVoiceScript(sessionId, langCode as 'en' | 'hi' | 'ur' | 'ps');
    if (!voiceScript) return;

    // Schedule remaining segments relative to current elapsed time
    voiceSegmentsRef.current = voiceScript.segments
      .filter(seg => seg.startSecond > elapsedSeconds)
      .map(segment =>
        setTimeout(() => {
          if (isRunning && !isPaused) guide(segment.text, 0, voiceVolLocal);
        }, (segment.startSecond - elapsedSeconds) * 1000)
      );

    return () => {
      voiceSegmentsRef.current.forEach(clearTimeout);
    };
  }, [isRunning, isPaused, sessionId, elapsedSeconds, guide, voiceVolLocal]);

  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      voiceSegmentsRef.current.forEach(clearTimeout);
      stop();
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

  const timeRemaining = Math.ceil((session.durationSeconds - elapsedSeconds) / 60);

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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* SVG depth background */}
      <RelaxBackground pattern={pattern} isActive={isRunning && sessionPhase === 'breathing'} />

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
            <BreathingOrb pattern={pattern} isRunning={false} isPaused={false} size={110} />
          </View>

          {/* Bottom info + CTA */}
          <View style={styles.initBottom}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <Text style={styles.sessionDesc}>{session.description}</Text>

            <View style={styles.initMeta}>
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.3)" />
                <Text style={styles.metaText}>
                  {session.durationSeconds > 60
                    ? `${Math.round(session.durationSeconds / 60)} min`
                    : `${session.durationSeconds} sec`}
                </Text>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaPill}>
                <Ionicons name="pulse-outline" size={11} color="rgba(255,255,255,0.3)" />
                <Text style={styles.metaText}>{patternDef.title}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleStart}
              style={[styles.startBtn, { backgroundColor: patternDef.color + '18' }]}
            >
              <Ionicons name="play" size={18} color={patternDef.color} />
              <Text style={[styles.startBtnText, { color: patternDef.color }]}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Active Session ── */}
      {isRunning && (
        <View style={styles.sessionContainer}>
          {/* Back button (top left) */}
          <TouchableOpacity onPress={handleStop} style={styles.backBtnTop}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {/* Main content: Final layout with scrollable sound grid */}
          <FinalSessionLayout
            voiceVolume={voiceVolLocal}
            ambientVolume={ambientVolLocal}
            onVoiceVolumeChange={setVoiceVolLocal}
            onAmbientVolumeChange={setAmbientVolLocal}
            onStop={handleStop}
            selectedId={selectedSound}
            onSelect={setSelectedSound}
            accentColor={patternDef.color}
            elapsedSeconds={elapsedSeconds}
            sessionDuration={session.durationSeconds}
          />

          {/* Centered breathing orb overlaid */}
          <View style={styles.orbContainer}>
            {sessionPhase === 'countdown' && (
              <Animated.Text style={[styles.countdownNum, { color: patternDef.color }, countdownAnimStyle]}>
                {countdownNum}
              </Animated.Text>
            )}

            {(sessionPhase === 'transition' || sessionPhase === 'breathing') && (
              <Animated.View style={orbAnimStyle}>
                <BreathingOrb
                  pattern={pattern}
                  isRunning={isRunning}
                  isPaused={isPaused}
                  size={220}
                  secondsLeft={phaseSecondsRemaining}
                  phaseFill={phaseFill}
                />
              </Animated.View>
            )}

            {/* Phase text overlay */}
            {sessionPhase === 'breathing' && (
              <Animated.Text
                style={[styles.phaseTextOverlay, { color: patternDef.color }, phaseTextAnimStyle]}
              >
                {phaseName || 'Breathe'}
              </Animated.Text>
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
    gap: 10,
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sessionDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: '80%',
  },
  initMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 100,
    marginTop: 6,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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

  countdownNum: {
    fontSize: 140,
    fontWeight: '200',
    lineHeight: 140,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },

  phaseTextOverlay: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    position: 'absolute',
    bottom: 220,
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
