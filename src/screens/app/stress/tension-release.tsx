import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Dumbbell,
  Footprints,
  Grip,
  Hand,
  Leaf,
  PersonStanding,
  Play,
  Smile,
  Wind,
  X,
} from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { TENSION_SCRIPTS } from '@/constants/sessionScripts';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { resolveGuideLang, type AudioClipId } from '@/constants/audioGuide';
import { useLanguage } from '@/context/LanguageContext';
import { useAudioGuide } from '@/hooks/useAudioGuide';

// One accent across the whole Relax feature — matches RelaxSessionPlayer.
const ACCENT = '#34D399';

// Zone icons (lucide, matching the app's icon set)
const ZONE_ICONS = [Hand, PersonStanding, Smile, Wind, Footprints, Grip] as const;

// Pre-recorded voice clip per zone (order matches TENSION_SCRIPTS zones).
const ZONE_CLIPS: AudioClipId[] = [
  'tension/fists',
  'tension/shoulders',
  'tension/jaw',
  'tension/stomach',
  'tension/legs',
  'tension/toes',
];

const ZONE_COUNT = ZONE_CLIPS.length;

// Phase lengths fit the narration + a real hold/rest. Hindi clips run longer
// than English, so the timing adapts to the recorded guide language.
const PHASE_SECONDS = {
  en: { squeeze: 18, release: 18 },
  hi: { squeeze: 28, release: 26 },
} as const;

export default function TensionReleaseScreen() {
  const router = useRouter();
  const { play, stop } = useAudioGuide();
  const { langCode, scripts } = useLanguage();
  const phaseSeconds = PHASE_SECONDS[resolveGuideLang(langCode)];

  const [phase, setPhase]      = useState<'idle' | 'intro' | 'running' | 'done'>('idle');
  const [zoneIdx, setZoneIdx]  = useState(0);
  const [sub, setSub]          = useState<'squeeze' | 'release'>('squeeze');
  const [secondsLeft, setSecs] = useState<number>(phaseSeconds.squeeze);

  const progressAnim = useSharedValue(0);
  const ringScale    = useSharedValue(1);
  const ringOpacity  = useSharedValue(0.5);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zonesStartedRef = useRef(false);

  const en     = TENSION_SCRIPTS.en;
  const zoneEn = en.zones[zoneIdx];
  const ZoneIcon = ZONE_ICONS[zoneIdx];

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function triggerPulse() {
    ringScale.value   = withSequence(withTiming(1.25, { duration: 300 }), withSpring(1, { damping: 8 }));
    ringOpacity.value = withSequence(withTiming(0.9, { duration: 200 }), withTiming(0.4, { duration: 600 }));
  }

  function runPhase(idx: number, nextSub: 'squeeze' | 'release') {
    const dur = nextSub === 'squeeze' ? phaseSeconds.squeeze : phaseSeconds.release;

    setZoneIdx(idx);
    setSub(nextSub);
    setSecs(dur);

    progressAnim.value = 0;
    progressAnim.value = withTiming(1, { duration: dur * 1000 });

    if (nextSub === 'squeeze') {
      triggerPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      play(ZONE_CLIPS[idx], 200);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      play('tension/release', 200);
    }

    clearTimer();
    let secs = dur;
    timerRef.current = setInterval(() => {
      secs -= 1;
      setSecs(secs);
      if (secs <= 0) {
        clearTimer();
        if (nextSub === 'squeeze') {
          runPhase(idx, 'release');
        } else {
          const next = idx + 1;
          if (next >= ZONE_COUNT) {
            cancelAnimation(progressAnim);
            play('tension/complete', 400);
            setPhase('done');
          } else {
            runPhase(next, 'squeeze');
          }
        }
      }
    }, 1000);
  }

  function begin() {
    setPhase('intro');
    zonesStartedRef.current = false;
    const startZones = () => {
      if (zonesStartedRef.current) return;
      zonesStartedRef.current = true;
      setPhase('running');
      runPhase(0, 'squeeze');
    };
    // No dedicated tension intro was recorded, so the settle-in guide opens the
    // session ("Find a comfortable position…"). Fallback keeps things moving.
    play('breathing/settle-in', 300, 1, {
      protect: true,
      onDone: () => setTimeout(startZones, 800),
    });
    introTimerRef.current = setTimeout(startZones, 30000);
  }

  function skipNext() {
    clearTimer();
    cancelAnimation(progressAnim);
    const next = zoneIdx + 1;
    if (next >= ZONE_COUNT) {
      play('tension/complete', 400);
      setPhase('done');
    } else {
      runPhase(next, 'squeeze');
    }
  }

  function reset() {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    zonesStartedRef.current = true;
    clearTimer();
    stop();
    cancelAnimation(progressAnim);
    setPhase('idle');
    setZoneIdx(0);
    setSub('squeeze');
    setSecs(phaseSeconds.squeeze);
    progressAnim.value = 0;
  }

  useEffect(() => () => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    clearTimer();
    stop();
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%` as `${number}%`,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { reset(); router.back(); }} style={styles.closeBtn}>
          <X size={18} color={colors.text.secondary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Muscle Release</Text>
          <Text style={styles.headerSub}>Squeeze, then let go</Text>
        </View>
        {phase === 'running' ? (
          <View style={[styles.counterPill, { borderColor: ACCENT + '30' }]}>
            <Text style={[styles.counterText, { color: ACCENT }]}>
              {zoneIdx + 1}/{ZONE_COUNT}
            </Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.center}>
        {/* ── Idle ── */}
        {phase === 'idle' && (
          <View style={styles.introWrap}>
            <Dumbbell size={56} color={ACCENT} strokeWidth={1.4} />
            <Text style={styles.introTitle}>Muscle Release</Text>
            <Text style={styles.introSub}>
              Squeeze each muscle group tight, then let it go completely.{'\n'}
              A guided pace through 6 zones — no taps needed, just follow along.
            </Text>
            <GlassCard style={styles.zoneList}>
              {en.zones.map((z, i) => {
                const RowIcon = ZONE_ICONS[i];
                return (
                  <View key={z.label} style={styles.zoneRow}>
                    <RowIcon size={18} color={ACCENT} strokeWidth={1.8} style={styles.zoneRowIcon} />
                    <Text style={styles.zoneRowLabel}>{z.label}</Text>
                  </View>
                );
              })}
            </GlassCard>
          </View>
        )}

        {/* ── Intro (voice settling the user in) ── */}
        {phase === 'intro' && (
          <View style={styles.introWrap}>
            <Dumbbell size={56} color={ACCENT} strokeWidth={1.4} />
            <Text style={styles.settleText}>{scripts.breatheSettleIntro}</Text>
          </View>
        )}

        {/* ── Running ── */}
        {phase === 'running' && (
          <>
            <View style={styles.iconWrap}>
              <Animated.View style={[styles.iconRing, { borderColor: ACCENT }, ringStyle]} />
              <ZoneIcon size={56} color={ACCENT} strokeWidth={1.5} />
            </View>

            <Text style={[styles.zoneName, { color: ACCENT }]}>{zoneEn.label.toUpperCase()}</Text>

            <View style={styles.dots}>
              {ZONE_CLIPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i <= zoneIdx ? ACCENT : 'rgba(255,255,255,0.12)',
                    },
                    i === zoneIdx && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            <GlassCard style={styles.cueCard}>
              <Text style={[styles.phaseLabel, { color: sub === 'squeeze' ? '#FBBF24' : ACCENT }]}>
                {sub === 'squeeze' ? en.squeeze : en.release}
              </Text>
              <Text style={styles.cue}>
                {sub === 'squeeze' ? zoneEn.cue : en.releaseCue}
              </Text>

              <View style={styles.timerBar}>
                <Animated.View style={[styles.timerFill, { backgroundColor: ACCENT }, progressStyle]} />
              </View>
              <Text style={[styles.timerSecs, { color: ACCENT }]}>{secondsLeft}s</Text>
            </GlassCard>
          </>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <GlassCard style={styles.done}>
            <Leaf size={48} color={ACCENT} strokeWidth={1.5} />
            <Text style={styles.doneText}>{en.complete}</Text>
          </GlassCard>
        )}
      </View>

      {/* ── Buttons ── */}
      <View style={styles.btnArea}>
        {phase === 'idle' && (
          <GradientCTA
            label="BEGIN MUSCLE RELEASE"
            icon={<Play size={16} color="#fff" />}
            onPress={begin}
            colors={[ACCENT, ACCENT + 'cc']}
            glowColor={ACCENT + '88'}
            letterSpacing={1.2}
            style={styles.btn}
          />
        )}
        {phase === 'running' && (
          <View style={styles.runningBtns}>
            <TouchableOpacity style={[styles.skipBtn, { borderColor: ACCENT }]} onPress={skipNext} activeOpacity={0.8}>
              <Text style={[styles.skipBtnText, { color: ACCENT }]}>Skip →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={reset} activeOpacity={0.8}>
              <Text style={styles.stopBtnText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === 'done' && (
          <GradientCTA
            label="DONE"
            onPress={() => { reset(); router.back(); }}
            colors={[ACCENT, ACCENT + 'cc']}
            glowColor={ACCENT + '88'}
            letterSpacing={1.2}
            style={styles.btn}
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: { width: 36 },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle:  { ...typography.headingSmall, color: colors.text.primary },
  headerSub:    { ...typography.caption, color: colors.text.secondary },
  counterPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  counterText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },

  // Idle + intro
  introWrap:    { alignItems: 'center', gap: spacing.lg, width: '100%' },
  introTitle:   { ...typography.headingMedium, color: colors.text.primary },
  introSub:     { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  settleText:   {
    ...typography.bodyLarge, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 26, paddingHorizontal: spacing.md,
  },
  zoneList:     { width: '100%', gap: spacing.sm },
  zoneRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  zoneRowIcon:  { width: 26 },
  zoneRowLabel: { ...typography.body, color: colors.text.primary, flex: 1 },

  // Icon with ring
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 120, height: 120 },
  iconRing: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, opacity: 0.5,
  },

  zoneName: { fontSize: 13, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },

  // Dots
  dots: { flexDirection: 'row', gap: 8 },
  dot:  { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 20 },

  // Cue card
  cueCard:    { width: '100%', alignItems: 'center', gap: spacing.sm },
  phaseLabel: { ...typography.label, fontWeight: '800', letterSpacing: 2 },
  cue:        { ...typography.bodyLarge, color: colors.text.secondary, textAlign: 'center', lineHeight: 26 },
  timerBar:   {
    alignSelf: 'stretch', height: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden', marginTop: spacing.sm,
  },
  timerFill: { height: 3, borderRadius: 2 },
  timerSecs: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Buttons
  btnArea:     { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center', width: '100%' },
  btn:         { width: '100%' },
  runningBtns: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  skipBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: 100, borderWidth: 1.5,
  },
  skipBtnText: { ...typography.bodyLarge, fontWeight: '600' },
  stopBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  stopBtnText: { ...typography.bodyLarge, color: colors.text.secondary, fontWeight: '600' },

  // Done
  done:     { alignItems: 'center', gap: spacing.md, width: '100%' },
  doneText: { ...typography.bodyLarge, color: colors.text.secondary, textAlign: 'center', lineHeight: 26 },
});
