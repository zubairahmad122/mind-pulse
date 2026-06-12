import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BODY_SCAN_SCRIPTS, type SessionLang } from '@/constants/sessionScripts';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLanguage } from '@/context/LanguageContext';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

// ─── Zone icons (Ionicons — no emoji) ─────────────────────────────────────────
const ZONE_ICONS = [
  'happy-outline',
  'body-outline',
  'heart-outline',
  'hand-left-outline',
  'fitness-outline',
  'walk-outline',
] as const;

const ZONE_COLORS = [
  '#CE93D8',
  '#90CAF9',
  '#4FC3F7',
  '#A5D6A7',
  '#FFE082',
  '#80CBC4',
];

const ZONE_DURATIONS = [18, 18, 18, 15, 18, 18];

// EN/HI/UR only — Pashto users fall back to Urdu
const RELAX_LANGS = LANGUAGES.filter(l => l.code !== 'ps');

function toSessionLang(code: string): SessionLang {
  return (code === 'ps' ? 'ur' : code) as SessionLang;
}

export default function BodyScanScreen() {
  const router = useRouter();
  const { guide, stop } = useVoiceGuide();
  const { langCode, setLang } = useLanguage();

  const [phase, setPhase]       = useState<'idle' | 'running' | 'done'>('idle');
  const [zoneIdx, setZoneIdx]   = useState(0);
  const [secondsLeft, setSecs]  = useState(ZONE_DURATIONS[0]);

  const progressAnim = useSharedValue(0);
  const cardOpacity  = useSharedValue(1);
  const cardScale    = useSharedValue(1);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function startZone(idx: number) {
    const lang  = toSessionLang(langCode);
    const zData = BODY_SCAN_SCRIPTS[lang].zones[idx];
    const dur   = ZONE_DURATIONS[idx];

    setZoneIdx(idx);
    setSecs(dur);

    cardOpacity.value = 0;
    cardScale.value   = 0.94;
    cardOpacity.value = withTiming(1, { duration: 400 });
    cardScale.value   = withSpring(1, { damping: 16, stiffness: 140 });

    progressAnim.value = 0;
    progressAnim.value = withTiming(1, { duration: dur * 1000 });

    guide(zData.script, 300);

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
          guide(BODY_SCAN_SCRIPTS[toSessionLang(langCode)].complete, 200);
          setPhase('done');
        } else {
          startZone(next);
        }
      }
    }, 1000);
  }

  function begin() {
    setPhase('running');
    guide(BODY_SCAN_SCRIPTS[toSessionLang(langCode)].intro, 200);
    introTimerRef.current = setTimeout(() => startZone(0), 2200);
  }

  function skipNext() {
    clearTimer();
    cancelAnimation(progressAnim);
    const next = zoneIdx + 1;
    if (next >= ZONE_DURATIONS.length) {
      guide(BODY_SCAN_SCRIPTS[toSessionLang(langCode)].complete, 200);
      setPhase('done');
    } else {
      startZone(next);
    }
  }

  function reset() {
    clearTimer();
    stop();
    cancelAnimation(progressAnim);
    setPhase('idle');
    setZoneIdx(0);
    setSecs(ZONE_DURATIONS[0]);
    progressAnim.value = 0;
  }

  function cycleLang() {
    const idx  = RELAX_LANGS.findIndex(l => l.code === langCode);
    const next = RELAX_LANGS[(idx + 1) % RELAX_LANGS.length];
    setLang(next.code);
  }

  useEffect(() => {
    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      clearTimer();
      stop();
    };
  }, []);

  const langOpt      = RELAX_LANGS.find(l => l.code === langCode) ?? RELAX_LANGS[0];
  const en           = BODY_SCAN_SCRIPTS.en;
  const zoneData     = en.zones[zoneIdx];
  const zoneColor    = ZONE_COLORS[zoneIdx];
  const zoneIcon     = ZONE_ICONS[zoneIdx];

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%` as `${number}%`,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { reset(); router.back(); }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Body Scan</Text>
          {phase === 'running' && (
            <Text style={styles.zoneCount}>{zoneIdx + 1} / {ZONE_DURATIONS.length}</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={cycleLang}
          style={styles.langBtn}
          disabled={phase === 'running'}
        >
          <Text style={styles.langFlag}>{langOpt.flag}</Text>
          <Text style={[styles.langCode, phase === 'running' && { opacity: 0.4 }]}>
            {langOpt.code.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Zone progress strip ── */}
      {phase === 'running' && (
        <View style={styles.zoneStrip}>
          {ZONE_COLORS.map((c, i) => (
            <View
              key={i}
              style={[
                styles.zoneChip,
                {
                  backgroundColor:
                    i < zoneIdx ? c : i === zoneIdx ? c + '44' : 'rgba(255,255,255,0.06)',
                  borderColor: i === zoneIdx ? c : 'transparent',
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
            <Ionicons name="body-outline" size={64} color={colors.accent.purple} />
            <Text style={styles.idleTitle}>Body Scan Meditation</Text>
            <Text style={styles.idleSub}>
              A guided journey through 6 body zones.{'\n'}
              Voice guide leads you to release tension zone by zone.{'\n'}
              Find a quiet place and get comfortable.
            </Text>
            <View style={styles.zoneList}>
              {en.zones.map((z, i) => (
                <View key={z.label} style={styles.zoneRow}>
                  <Ionicons name={ZONE_ICONS[i]} size={20} color={ZONE_COLORS[i]} style={styles.zoneRowIcon} />
                  <Text style={styles.zoneRowLabel}>{z.label}</Text>
                  <Text style={styles.zoneRowDur}>{ZONE_DURATIONS[i]}s</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Running ── */}
        {phase === 'running' && (
          <Animated.View style={[styles.zoneCard, { borderColor: zoneColor + '55' }, cardStyle]}>
            <Ionicons name={zoneIcon} size={56} color={zoneColor} />
            <Text style={[styles.zoneLabel, { color: zoneColor }]}>
              {zoneData.label.toUpperCase()}
            </Text>
            <Text style={styles.zoneScript}>{zoneData.script}</Text>

            <View style={styles.timerBar}>
              <Animated.View
                style={[styles.timerFill, { backgroundColor: zoneColor }, progressStyle]}
              />
            </View>
            <Text style={[styles.timerSecs, { color: zoneColor }]}>{secondsLeft}s</Text>
          </Animated.View>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <View style={styles.doneWrap}>
            <Ionicons name="leaf-outline" size={64} color="#80CBC4" />
            <Text style={styles.doneTitle}>You are here, now.</Text>
            <Text style={styles.doneSub}>
              Your body has been heard. Notice how much lighter and quieter you feel.
            </Text>
          </View>
        )}
      </View>

      {/* ── Buttons ── */}
      <View style={styles.btnArea}>
        {phase === 'idle' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={begin} activeOpacity={0.85}>
            <Ionicons name="play" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Begin Body Scan</Text>
          </TouchableOpacity>
        )}
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
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { reset(); router.back(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        )}
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
  zoneCount:    { ...typography.caption, color: colors.text.secondary },
  langBtn:      { alignItems: 'center', gap: 2 },
  langFlag:     { fontSize: 18 },
  langCode:     { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.5 },

  // Zone strip
  zoneStrip: {
    flexDirection: 'row', gap: 6, marginBottom: spacing.md, justifyContent: 'center',
  },
  zoneChip: { width: 28, height: 6, borderRadius: 3, borderWidth: 1 },

  // Content
  content: { flex: 1, justifyContent: 'center' },

  // Idle
  idleWrap:     { alignItems: 'center', gap: spacing.lg },
  idleTitle:    { ...typography.headingMedium, color: colors.text.primary },
  idleSub:      { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  zoneList:     {
    alignSelf: 'stretch', backgroundColor: colors.background.secondary,
    borderRadius: 16, padding: spacing.md, gap: spacing.sm,
  },
  zoneRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  zoneRowIcon:  { width: 28 },
  zoneRowLabel: { ...typography.body, color: colors.text.primary, flex: 1 },
  zoneRowDur:   { ...typography.caption, color: colors.text.secondary },

  // Running card
  zoneCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24, borderWidth: 1, padding: spacing.xl,
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
  doneWrap:  { alignItems: 'center', gap: spacing.lg },
  doneTitle: { ...typography.headingMedium, color: colors.text.primary },
  doneSub:   { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },

  // Buttons
  btnArea: { paddingBottom: spacing.xl, alignItems: 'center' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.accent.purple,
    paddingHorizontal: spacing.xl * 1.5, paddingVertical: spacing.md, borderRadius: 100,
  },
  primaryBtnText: { ...typography.bodyLarge, color: '#FFF', fontWeight: '700' },
  runningBtns:    { flexDirection: 'row', gap: spacing.md },
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
});
