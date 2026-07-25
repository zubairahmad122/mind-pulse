import { useRouter } from 'expo-router';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Brain,
  Footprints,
  Hand,
  Heart,
  Leaf,
  PersonStanding,
  Play,
  Wind,
  X,
} from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { BODY_SCAN_SCRIPTS } from '@/constants/sessionScripts';
import { colors } from '@/constants/colors';
import { PILLAR_COLORS } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { AudioClipId } from '@/constants/audioGuide';
import { useAudioGuide } from '@/hooks/useAudioGuide';

// One accent across the whole Relax feature — matches RelaxSessionPlayer.
// Same accent as the Relax tab / session player — one color for the feature
// (was a stale green predating the frozen spec's blue Relax accent).
const ACCENT = PILLAR_COLORS.relax;

// Zone icons (lucide, matching the app's icon set)
const ZONE_ICONS = [Brain, PersonStanding, Heart, Hand, Wind, Footprints] as const;

// Recorded zone narration is 17–28s; each zone then rests in silence
// (~60s of quiet awareness) before the next area — spa-session pacing.
const ZONE_DURATIONS = [80, 80, 80, 80, 80, 80];

// Pre-recorded voice clip per zone (order matches BODY_SCAN_SCRIPTS zones).
const ZONE_CLIPS: AudioClipId[] = [
  'bodyscan/head',
  'bodyscan/neck',
  'bodyscan/chest',
  'bodyscan/arms',
  'bodyscan/stomach',
  'bodyscan/legs',
];

export default function BodyScanScreen() {
  const router = useRouter();
  const { play, stop } = useAudioGuide();

  const [phase, setPhase]       = useState<'idle' | 'intro' | 'running' | 'done'>('idle');
  const [zoneIdx, setZoneIdx]   = useState(0);
  const [secondsLeft, setSecs]  = useState(ZONE_DURATIONS[0]);

  const progressAnim = useSharedValue(0);
  const cardOpacity  = useSharedValue(1);
  const cardScale    = useSharedValue(1);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zonesStartedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function startZone(idx: number) {
    const dur = ZONE_DURATIONS[idx];

    setPhase('running');
    setZoneIdx(idx);
    setSecs(dur);

    cardOpacity.value = 0;
    cardScale.value   = 0.94;
    cardOpacity.value = withTiming(1, { duration: 400 });
    cardScale.value   = withSpring(1, { damping: 16, stiffness: 140 });

    progressAnim.value = 0;
    progressAnim.value = withTiming(1, { duration: dur * 1000 });

    play(ZONE_CLIPS[idx], 300);

    clearTimer();
    let secs = dur;
    timerRef.current = setInterval(() => {
      secs -= 1;
      setSecs(secs);
      if (secs <= 0) {
        clearTimer();
        const next = idx + 1;
        if (next >= ZONE_DURATIONS.length) {
          cancelAnimation(progressAnim);
          play('bodyscan/complete', 400);
          setPhase('done');
        } else {
          startZone(next);
        }
      }
    }, 1000);
  }

  function begin() {
    setPhase('intro');
    zonesStartedRef.current = false;
    const startFirstZone = () => {
      if (zonesStartedRef.current) return;
      zonesStartedRef.current = true;
      startZone(0);
    };
    // Intro narration (~30s) plays in full; first zone follows a beat after it
    // ends. Fallback timer keeps the session moving if audio can't play.
    play('bodyscan/intro', 200, 1, {
      protect: true,
      onDone: () => setTimeout(startFirstZone, 1200),
    });
    introTimerRef.current = setTimeout(startFirstZone, 45000);
  }

  function skipIntro() {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    if (zonesStartedRef.current) return;
    zonesStartedRef.current = true;
    startZone(0);
  }

  function skipNext() {
    clearTimer();
    cancelAnimation(progressAnim);
    zonesStartedRef.current = true;
    const next = zoneIdx + 1;
    if (next >= ZONE_DURATIONS.length) {
      play('bodyscan/complete', 400);
      setPhase('done');
    } else {
      startZone(next);
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
    setSecs(ZONE_DURATIONS[0]);
    progressAnim.value = 0;
  }

  useEffect(() => {
    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      clearTimer();
      stop();
    };
  }, []);

  const en        = BODY_SCAN_SCRIPTS.en;
  const zoneData  = en.zones[zoneIdx];
  const ZoneIcon  = ZONE_ICONS[zoneIdx];

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%` as `${number}%`,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { reset(); router.back(); }}
          style={styles.closeBtn}
        >
          <X size={18} color={colors.text.secondary} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Body Scan</Text>
          <Text style={styles.headerSub}>Release tension, zone by zone</Text>
        </View>

        {phase === 'running' ? (
          <View style={[styles.counterPill, { borderColor: ACCENT + '30' }]}>
            <Text style={[styles.counterText, { color: ACCENT }]}>
              {zoneIdx + 1}/{ZONE_DURATIONS.length}
            </Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* ── Zone progress strip ── */}
      {phase === 'running' && (
        <View style={styles.zoneStrip}>
          {ZONE_DURATIONS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.zoneChip,
                {
                  backgroundColor:
                    i < zoneIdx ? ACCENT : i === zoneIdx ? ACCENT + '44' : 'rgba(255,255,255,0.06)',
                  borderColor: i === zoneIdx ? ACCENT : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.content}>
        {/* ── Idle ── */}
        {phase === 'idle' && (
          <View style={styles.idleWrap}>
            <PersonStanding size={56} color={ACCENT} strokeWidth={1.4} />
            <Text style={styles.idleTitle}>Body Scan Meditation</Text>
            <Text style={styles.idleSub}>
              A guided journey through 6 body zones.{'\n'}
              Voice guide leads you to release tension zone by zone.{'\n'}
              Find a quiet place and get comfortable.
            </Text>
            <GlassCard style={styles.zoneList}>
              {en.zones.map((z, i) => {
                const RowIcon = ZONE_ICONS[i];
                return (
                  <View key={z.label} style={styles.zoneRow}>
                    <RowIcon size={18} color={ACCENT} strokeWidth={1.8} style={styles.zoneRowIcon} />
                    <Text style={styles.zoneRowLabel}>{z.label}</Text>
                    <Text style={styles.zoneRowDur}>{ZONE_DURATIONS[i]}s</Text>
                  </View>
                );
              })}
            </GlassCard>
          </View>
        )}

        {/* ── Intro narration ── */}
        {phase === 'intro' && (
          <View style={styles.idleWrap}>
            <PersonStanding size={56} color={ACCENT} strokeWidth={1.4} />
            <Text style={styles.settleText}>{en.intro}</Text>
            <TouchableOpacity style={[styles.ghostBtn, { borderColor: ACCENT }]} onPress={skipIntro} activeOpacity={0.8}>
              <Text style={[styles.ghostBtnText, { color: ACCENT }]}>Skip intro →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Running ── */}
        {phase === 'running' && (
          <Animated.View style={cardStyle}>
            <GlassCard style={styles.zoneCard}>
              <ZoneIcon size={52} color={ACCENT} strokeWidth={1.5} />
              <Text style={[styles.zoneLabel, { color: ACCENT }]}>
                {zoneData.label.toUpperCase()}
              </Text>
              <Text style={styles.zoneScript}>{zoneData.script}</Text>

              <View style={styles.timerBar}>
                <Animated.View
                  style={[styles.timerFill, { backgroundColor: ACCENT }, progressStyle]}
                />
              </View>
              <Text style={[styles.timerSecs, { color: ACCENT }]}>{secondsLeft}s</Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <GlassCard style={styles.doneWrap}>
            <Leaf size={52} color={ACCENT} strokeWidth={1.5} />
            <Text style={styles.doneTitle}>You are here, now.</Text>
            <Text style={styles.doneSub}>
              Your body has been heard. Notice how much lighter and quieter you feel.
            </Text>
          </GlassCard>
        )}
      </View>

      {/* ── Buttons ── */}
      <View style={styles.btnArea}>
        {phase === 'idle' && (
          <GradientCTA
            label="BEGIN BODY SCAN"
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
    justifyContent: 'space-between', paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: { width: 36 },
  headerCenter: { alignItems: 'center', gap: 2 },
  title:        { ...typography.headingSmall, color: colors.text.primary },
  headerSub:    { ...typography.caption, color: colors.text.secondary },
  counterPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  counterText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Zone strip
  zoneStrip: {
    flexDirection: 'row', gap: 6, marginBottom: spacing.md, justifyContent: 'center',
  },
  zoneChip: { width: 28, height: 6, borderRadius: 3, borderWidth: 1 },

  // Content
  content: { flex: 1, justifyContent: 'center' },

  // Idle + intro
  idleWrap:     { alignItems: 'center', gap: spacing.lg },
  idleTitle:    { ...typography.headingMedium, color: colors.text.primary },
  idleSub:      { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  settleText:   {
    ...typography.bodyLarge, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 26, paddingHorizontal: spacing.md,
  },
  zoneList:     { alignSelf: 'stretch', gap: spacing.sm },
  zoneRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  zoneRowIcon:  { width: 26 },
  zoneRowLabel: { ...typography.body, color: colors.text.primary, flex: 1 },
  zoneRowDur:   { ...typography.caption, color: colors.text.secondary },

  // Ghost (skip intro)
  ghostBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2,
    borderRadius: 100, borderWidth: 1.5,
  },
  ghostBtnText: { ...typography.body, fontWeight: '600' },

  // Running card
  zoneCard: {
    alignItems: 'center', gap: spacing.md,
  },
  zoneLabel:  { fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  zoneScript: { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 24 },
  timerBar:   {
    alignSelf: 'stretch', height: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden', marginTop: spacing.sm,
  },
  timerFill:  { height: 3, borderRadius: 2 },
  timerSecs:  { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Done
  doneWrap:  { alignItems: 'center', gap: spacing.md },
  doneTitle: { ...typography.headingMedium, color: colors.text.primary },
  doneSub:   { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },

  // Buttons
  btnArea: { paddingBottom: spacing.xl, alignItems: 'center' },
  btn:     { alignSelf: 'stretch' },
  runningBtns: { flexDirection: 'row', gap: spacing.md },
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
});
