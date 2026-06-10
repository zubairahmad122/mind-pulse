import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GROUNDING_SCRIPTS, type SessionLang } from '@/constants/sessionScripts';
import { LANGUAGES } from '@/constants/languages';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLanguage } from '@/context/LanguageContext';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

// Sense icons per step (5 SEE, 4 TOUCH, 3 HEAR, 2 SMELL, 1 TASTE)
const STEP_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'eye-outline',
  'hand-right-outline',
  'volume-medium-outline',
  'flower-outline',
  'water-outline',
];

const STEP_COLORS = ['#4FC3F7', '#A5D6A7', '#FFE082', '#CE93D8', '#80CBC4'];
const STEP_COUNTS = [5, 4, 3, 2, 1];

const RELAX_LANGS = LANGUAGES.filter(l => l.code !== 'ps');

function toSessLang(code: string): SessionLang {
  return (code === 'ps' ? 'ur' : code) as SessionLang;
}

export default function GroundingScreen() {
  const router          = useRouter();
  const { guide, stop } = useVoiceGuide();
  const { langCode, setLang } = useLanguage();

  const [step, setStep]                 = useState(0);
  const [running, setRunning]           = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);

  const sessLang = toSessLang(langCode);
  const en       = GROUNDING_SCRIPTS.en;
  const done     = step >= en.steps.length;
  const current  = en.steps[step];

  const langOpt = RELAX_LANGS.find(l => l.code === langCode) ?? RELAX_LANGS[0];

  function cycleLang() {
    const idx  = RELAX_LANGS.findIndex(l => l.code === langCode);
    const next = RELAX_LANGS[(idx + 1) % RELAX_LANGS.length];
    setLang(next.code);
  }

  useEffect(() => {
    if (!running || introPlaying) return;
    const voice = GROUNDING_SCRIPTS[sessLang];
    if (done) {
      guide(voice.complete);
    } else {
      guide(voice.steps[step].prompt);
    }
  }, [step, done, running, introPlaying, sessLang]);

  useEffect(() => () => stop(), []);

  function begin() {
    setRunning(true);
    setIntroPlaying(true);
    guide(GROUNDING_SCRIPTS[sessLang].intro, 200);
    setTimeout(() => setIntroPlaying(false), 2200);
  }

  function advance() {
    if (done) { router.back(); return; }
    setStep(s => s + 1);
  }

  const accentColor = done ? '#80CBC4' : STEP_COLORS[step];

  return (
    <ScreenShell scroll={false} safeBottom>
      {/* Custom header with language button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stop(); router.back(); }} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>5-4-3-2-1 Grounding</Text>
          <Text style={styles.headerSub}>Come back to the present</Text>
        </View>
        <TouchableOpacity onPress={cycleLang} style={styles.langBtn} disabled={running}>
          <Text style={styles.langFlag}>{langOpt.flag}</Text>
          <Text style={[styles.langCode, running && { opacity: 0.4 }]}>
            {langOpt.code.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        {!running ? (
          /* ── Intro ── */
          <View style={styles.introWrap}>
            <Ionicons name="leaf-outline" size={64} color={colors.accent.purple} />
            <Text style={styles.introTitle}>5-4-3-2-1 Technique</Text>
            <Text style={styles.introSub}>
              Anchor yourself in the present moment by engaging your five senses — one step at a time.
            </Text>
            <View style={styles.stepPreview}>
              {en.steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <Ionicons name={STEP_ICONS[i]} size={18} color={STEP_COLORS[i]} style={styles.stepRowIcon} />
                  <Text style={styles.stepRowLabel}>{s.sense}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton label="Begin Grounding" onPress={begin} style={styles.startBtn} />
          </View>
        ) : done ? (
          /* ── Done ── */
          <>
            <GlassCard style={styles.doneCard}>
              <Ionicons name="leaf-outline" size={52} color="#80CBC4" />
              <Text style={styles.doneTitle}>You are here, now.</Text>
              <Text style={styles.doneBody}>{en.complete}</Text>
            </GlassCard>
            <PrimaryButton label="Finish" onPress={() => router.back()} style={styles.btn} />
          </>
        ) : (
          /* ── Active step ── */
          <>
            <View style={styles.stepBadge}>
              <Text style={[styles.stepCount, { color: accentColor }]}>
                {STEP_COUNTS[step]} · {current.sense}
              </Text>
            </View>
            <Ionicons name={STEP_ICONS[step]} size={72} color={accentColor} />
            <GlassCard style={styles.promptCard}>
              <Text style={styles.prompt}>{current.prompt}</Text>
            </GlassCard>
            <Text style={styles.progress}>Step {step + 1} of {en.steps.length}</Text>
            <PrimaryButton
              label={step === en.steps.length - 1 ? 'Complete' : 'Next'}
              onPress={advance}
              style={styles.btn}
            />
          </>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  // Custom header
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

  // Intro
  introWrap:    { alignItems: 'center', gap: spacing.lg, width: '100%' },
  introTitle:   { ...typography.headingMedium, color: colors.text.primary },
  introSub:     { ...typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  stepPreview:  { width: '100%', backgroundColor: colors.background.secondary, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepRowIcon:  { width: 28 },
  stepRowLabel: { ...typography.body, color: colors.text.primary },
  startBtn:     { width: '100%' },

  // Active
  stepBadge:  { alignItems: 'center' },
  stepCount:  { ...typography.headingLarge, textAlign: 'center' },
  promptCard: { width: '100%' },
  prompt:     { ...typography.bodyLarge, color: colors.text.secondary, lineHeight: 26, textAlign: 'center' },
  progress:   { ...typography.caption, color: colors.text.tertiary },
  btn:        { width: '100%' },

  // Done
  doneCard:  { alignItems: 'center', gap: spacing.md, width: '100%' },
  doneTitle: { ...typography.headingMedium, color: colors.text.primary },
  doneBody:  { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});
