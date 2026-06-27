import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TENSION_SCRIPTS, type SessionLang } from '@/constants/sessionScripts';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLanguage } from '@/context/LanguageContext';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

// Zone icons (no emoji)
const ZONE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'hand-left-outline',
  'body-outline',
  'happy-outline',
  'fitness-outline',
  'walk-outline',
  'footsteps-outline',
];

const ZONE_COLORS = ['#90CAF9', '#CE93D8', '#FFE082', '#A5D6A7', '#4FC3F7', '#80CBC4'];

const SQUEEZE_SECONDS = 5;
const RELEASE_SECONDS = 4;

const RELAX_LANGS = LANGUAGES.filter(l => l.code !== 'ps');

function toSessLang(code: string): SessionLang {
  return (code === 'ps' ? 'ur' : code) as SessionLang;
}

export default function TensionReleaseScreen() {
  const router = useRouter();
  const { guide, stop } = useVoiceGuide();
  const { langCode, setLang } = useLanguage();

  const [phase, setPhase]      = useState<'idle' | 'running' | 'done'>('idle');
  const [zoneIdx, setZoneIdx]  = useState(0);
  const [sub, setSub]          = useState<'squeeze' | 'release'>('squeeze');
  const [secondsLeft, setSecs] = useState(SQUEEZE_SECONDS);

  const progressAnim = useSharedValue(0);
  const ringScale    = useSharedValue(1);
  const ringOpacity  = useSharedValue(0.5);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessLang = toSessLang(langCode);
  const en       = TENSION_SCRIPTS.en;
  const zoneEn   = en.zones[zoneIdx];
  const color    = ZONE_COLORS[zoneIdx];

  const langOpt = RELAX_LANGS.find(l => l.code === langCode) ?? RELAX_LANGS[0];

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function triggerPulse() {
    ringScale.value   = withSequence(withTiming(1.25, { duration: 300 }), withSpring(1, { damping: 8 }));
    ringOpacity.value = withSequence(withTiming(0.9, { duration: 200 }), withTiming(0.4, { duration: 600 }));
  }

  function runPhase(idx: number, nextSub: 'squeeze' | 'release') {
    const dur   = nextSub === 'squeeze' ? SQUEEZE_SECONDS : RELEASE_SECONDS;
    const voice = TENSION_SCRIPTS[sessLang];

    setZoneIdx(idx);
    setSub(nextSub);
    setSecs(dur);

    progressAnim.value = 0;
    progressAnim.value = withTiming(1, { duration: dur * 1000 });

    if (nextSub === 'squeeze') {
      triggerPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      guide(voice.zones[idx].cue, 200);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      guide(voice.releaseCue, 200);
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
          if (next >= ZONE_COLORS.length) {
            cancelAnimation(progressAnim);
            guide(TENSION_SCRIPTS[sessLang].complete, 200);
            setPhase('done');
          } else {
            runPhase(next, 'squeeze');
          }
        }
      }
    }, 1000);
  }

  function begin() {
    setPhase('running');
    runPhase(0, 'squeeze');
  }

  function skipNext() {
    clearTimer();
    cancelAnimation(progressAnim);
    const next = zoneIdx + 1;
    if (next >= ZONE_COLORS.length) {
      guide(TENSION_SCRIPTS[sessLang].complete, 200);
      setPhase('done');
    } else {
      runPhase(next, 'squeeze');
    }
  }

  function reset() {
    clearTimer();
    stop();
    cancelAnimation(progressAnim);
    setPhase('idle');
    setZoneIdx(0);
    setSub('squeeze');
    setSecs(SQUEEZE_SECONDS);
    progressAnim.value = 0;
  }

  function cycleLang() {
    const idx  = RELAX_LANGS.findIndex(l => l.code === langCode);
    const next = RELAX_LANGS[(idx + 1) % RELAX_LANGS.length];
    setLang(next.code);
  }

  useEffect(() => () => { clearTimer(); stop(); }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%` as `${number}%`,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
      {/* Custom header with language switcher */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { reset(); router.back(); }} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Muscle Release</Text>
          {phase === 'running' && (
            <Text style={styles.headerSub}>Zone {zoneIdx + 1} / {ZONE_COLORS.length}</Text>
          )}
        </View>
        <TouchableOpacity onPress={cycleLang} style={styles.langBtn} disabled={phase === 'running'}>
          <Text style={styles.langFlag}>{langOpt.flag}</Text>
          <Text style={[styles.langCode, phase === 'running' && { opacity: 0.4 }]}>
            {langOpt.code.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        {/* ── Idle ── */}
        {phase === 'idle' && (
          <View style={styles.introWrap}>
            <Ionicons name="barbell-outline" size={64} color={colors.accent.purple} />
            <Text style={styles.introTitle}>Muscle Release</Text>
            <Text style={styles.introSub}>
              Squeeze each muscle group tight, then let it go completely.{'\n'}
              A guided pace through 6 zones — no taps needed, just follow along.
            </Text>
            <View style={styles.zoneList}>
              {en.zones.map((z, i) => (
                <View key={z.label} style={styles.zoneRow}>
                  <Ionicons name={ZONE_ICONS[i]} size={20} color={ZONE_COLORS[i]} style={styles.zoneRowIcon} />
                  <Text style={styles.zoneRowLabel}>{z.label}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton label="Begin Muscle Release" onPress={begin} style={styles.startBtn} />
          </View>
        )}

        {/* ── Running ── */}
        {phase === 'running' && (
          <>
            <View style={styles.iconWrap}>
              <Animated.View style={[styles.iconRing, { borderColor: color }, ringStyle]} />
              <Ionicons name={ZONE_ICONS[zoneIdx]} size={60} color={color} />
            </View>

            <Text style={[styles.zoneName, { color }]}>{zoneEn.label.toUpperCase()}</Text>

            <View style={styles.dots}>
              {ZONE_COLORS.map((c, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < zoneIdx ? c : i === zoneIdx ? c : 'rgba(255,255,255,0.1)' },
                    i === zoneIdx && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            <GlassCard style={styles.cueCard}>
              <Text style={[styles.phaseLabel, { color: sub === 'squeeze' ? colors.status.warning : '#80CBC4' }]}>
                {sub === 'squeeze' ? en.squeeze : en.release}
              </Text>
              <Text style={styles.cue}>
                {sub === 'squeeze' ? zoneEn.cue : en.releaseCue}
              </Text>

              <View style={styles.timerBar}>
                <Animated.View style={[styles.timerFill, { backgroundColor: color }, progressStyle]} />
              </View>
              <Text style={[styles.timerSecs, { color }]}>{secondsLeft}s</Text>
            </GlassCard>
          </>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <GlassCard style={styles.done}>
            <Ionicons name="sparkles-outline" size={52} color="#80CBC4" />
            <Text style={styles.doneText}>{en.complete}</Text>
          </GlassCard>
        )}
      </View>

      {/* ── Buttons ── */}
      <View style={styles.btnArea}>
        {phase === 'running' && (
          <View style={styles.runningBtns}>
            <TouchableOpacity style={styles.skipBtn} onPress={skipNext} activeOpacity={0.8}>
              <Text style={styles.skipBtnText}>Skip →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={reset} activeOpacity={0.8}>
              <Text style={styles.stopBtnText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === 'done' && (
          <PrimaryButton label="Done" onPress={() => { reset(); router.back(); }} style={styles.btn} />
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
    backgroundColor: colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle:  { ...typography.headingSmall, color: colors.text.primary },
  headerSub:    { ...typography.caption, color: colors.text.secondary },
  langBtn:      { alignItems: 'center', gap: 2 },
  langFlag:     { fontSize: 18 },
  langCode:     { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },

  // Idle
  introWrap:    { alignItems: 'center', gap: spacing.lg, width: '100%' },
  introTitle:   { ...typography.headingMedium, color: colors.text.primary },
  introSub:     { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  zoneList:     {
    width: '100%', backgroundColor: colors.background.secondary,
    borderRadius: 16, padding: spacing.md, gap: spacing.sm,
  },
  zoneRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  zoneRowIcon:  { width: 28 },
  zoneRowLabel: { ...typography.body, color: colors.text.primary, flex: 1 },
  startBtn:     { width: '100%' },

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
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
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
  btnArea:     { paddingBottom: spacing.xl, alignItems: 'center', width: '100%' },
  btn:         { width: '100%' },
  runningBtns: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  skipBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: 100, borderWidth: 1.5, borderColor: colors.accent.purple,
  },
  skipBtnText: { ...typography.bodyLarge, color: colors.accent.purple, fontWeight: '600' },
  stopBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  stopBtnText: { ...typography.bodyLarge, color: colors.text.secondary, fontWeight: '600' },

  // Done
  done:     { alignItems: 'center', gap: spacing.md, width: '100%' },
  doneText: { ...typography.bodyLarge, color: colors.text.secondary, textAlign: 'center', lineHeight: 26 },
});
