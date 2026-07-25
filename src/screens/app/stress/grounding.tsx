import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Cherry, Ear, Eye, Flower2, Hand, Leaf, Play, X } from 'lucide-react-native';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { GROUNDING_SCRIPTS } from '@/constants/sessionScripts';
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

// Sense icons per step (5 SEE, 4 TOUCH, 3 HEAR, 2 SMELL, 1 TASTE)
const STEP_ICONS = [Eye, Hand, Ear, Flower2, Cherry] as const;
const STEP_COUNTS = [5, 4, 3, 2, 1];

// Pre-recorded voice clip per sense step (order matches GROUNDING_SCRIPTS steps).
const STEP_CLIPS: AudioClipId[] = [
  'grounding/see',
  'grounding/touch',
  'grounding/hear',
  'grounding/smell',
  'grounding/taste',
];

export default function GroundingScreen() {
  const router         = useRouter();
  const { play, stop } = useAudioGuide();

  const [step, setStep]                 = useState(0);
  const [running, setRunning]           = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const en      = GROUNDING_SCRIPTS.en;
  const done    = step >= en.steps.length;
  const current = en.steps[step];
  const StepIcon = done ? Leaf : STEP_ICONS[step];

  // Each step's clip REPLACES whatever is speaking (including a lingering
  // intro), so the voice always matches the step on screen.
  useEffect(() => {
    if (!running || introPlaying) return;
    if (done) {
      play('grounding/complete', 300);
    } else {
      play(STEP_CLIPS[step], 300);
    }
  }, [step, done, running, introPlaying, play]);

  useEffect(() => {
    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      stop();
    };
  }, []);

  function begin() {
    setRunning(true);
    setIntroPlaying(true);
    // Intro narration (~25s) plays in full, then the first sense step follows.
    // Fallback timer keeps the session moving if audio can't play.
    play('grounding/intro', 200, 1, {
      protect: true,
      onDone: () => setTimeout(() => setIntroPlaying(false), 800),
    });
    introTimerRef.current = setTimeout(() => setIntroPlaying(false), 35000);
  }

  // Cuts the intro short: flipping introPlaying triggers the step effect,
  // whose clip replaces the intro narration.
  function skipIntro() {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    setIntroPlaying(false);
  }

  function advance() {
    if (done) { router.back(); return; }
    setStep(s => s + 1);
  }

  return (
    <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stop(); router.back(); }} style={styles.closeBtn}>
          <X size={18} color={colors.text.secondary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>5-4-3-2-1 Grounding</Text>
          <Text style={styles.headerSub}>Come back to the present</Text>
        </View>
        {running && !done && !introPlaying ? (
          <View style={[styles.counterPill, { borderColor: ACCENT + '30' }]}>
            <Text style={[styles.counterText, { color: ACCENT }]}>
              {step + 1}/{en.steps.length}
            </Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.center}>
        {!running ? (
          /* ── Idle ── */
          <View style={styles.introWrap}>
            <Leaf size={56} color={ACCENT} strokeWidth={1.4} />
            <Text style={styles.introTitle}>5-4-3-2-1 Technique</Text>
            <Text style={styles.introSub}>
              Anchor yourself in the present moment by engaging your five senses — one step at a time.
            </Text>
            <GlassCard style={styles.stepPreview}>
              {en.steps.map((s, i) => {
                const RowIcon = STEP_ICONS[i];
                return (
                  <View key={i} style={styles.stepRow}>
                    <RowIcon size={17} color={ACCENT} strokeWidth={1.8} style={styles.stepRowIcon} />
                    <Text style={styles.stepRowLabel}>{s.sense}</Text>
                  </View>
                );
              })}
            </GlassCard>
            <GradientCTA
              label="BEGIN GROUNDING"
              icon={<Play size={16} color="#fff" />}
              onPress={begin}
              colors={[ACCENT, ACCENT + 'cc']}
              glowColor={ACCENT + '88'}
              letterSpacing={1.2}
              style={styles.btn}
            />
          </View>
        ) : introPlaying ? (
          /* ── Intro narration ── */
          <View style={styles.introWrap}>
            <Leaf size={56} color={ACCENT} strokeWidth={1.4} />
            <Text style={styles.settleText}>{en.intro}</Text>
            <TouchableOpacity style={[styles.ghostBtn, { borderColor: ACCENT }]} onPress={skipIntro} activeOpacity={0.8}>
              <Text style={[styles.ghostBtnText, { color: ACCENT }]}>Skip intro →</Text>
            </TouchableOpacity>
          </View>
        ) : done ? (
          /* ── Done ── */
          <>
            <GlassCard style={styles.doneCard}>
              <Leaf size={48} color={ACCENT} strokeWidth={1.5} />
              <Text style={styles.doneTitle}>You are here, now.</Text>
              <Text style={styles.doneBody}>{en.complete}</Text>
            </GlassCard>
            <GradientCTA
              label="FINISH"
              onPress={() => router.back()}
              colors={[ACCENT, ACCENT + 'cc']}
              glowColor={ACCENT + '88'}
              letterSpacing={1.2}
              style={styles.btn}
            />
          </>
        ) : (
          /* ── Active step ── */
          <>
            <View style={styles.stepBadge}>
              <Text style={[styles.stepCount, { color: ACCENT }]}>
                {STEP_COUNTS[step]} · {current.sense}
              </Text>
            </View>
            <StepIcon size={64} color={ACCENT} strokeWidth={1.4} />
            <GlassCard style={styles.promptCard}>
              <Text style={styles.prompt}>{current.prompt}</Text>
            </GlassCard>
            <View style={styles.dots}>
              {en.steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i <= step ? ACCENT : 'rgba(255,255,255,0.12)' },
                    i === step && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <GradientCTA
              label={step === en.steps.length - 1 ? 'COMPLETE' : 'NEXT'}
              onPress={advance}
              colors={[ACCENT, ACCENT + 'cc']}
              glowColor={ACCENT + '88'}
              letterSpacing={1.2}
              style={styles.btn}
            />
          </>
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
  stepPreview:  { width: '100%', gap: spacing.sm },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepRowIcon:  { width: 26 },
  stepRowLabel: { ...typography.body, color: colors.text.primary },

  // Active
  stepBadge:  { alignItems: 'center' },
  stepCount:  { ...typography.headingLarge, textAlign: 'center' },
  promptCard: { width: '100%' },
  prompt:     { ...typography.bodyLarge, color: colors.text.secondary, lineHeight: 26, textAlign: 'center' },
  dots:       { flexDirection: 'row', gap: 8 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotActive:  { width: 20 },
  btn:        { width: '100%' },

  // Ghost (skip intro)
  ghostBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2,
    borderRadius: 100, borderWidth: 1.5,
  },
  ghostBtnText: { ...typography.body, fontWeight: '600' },

  // Done
  doneCard:  { alignItems: 'center', gap: spacing.md, width: '100%' },
  doneTitle: { ...typography.headingMedium, color: colors.text.primary },
  doneBody:  { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});
