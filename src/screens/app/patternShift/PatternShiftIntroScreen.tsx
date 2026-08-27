import { useEffect, useState } from 'react';
import { ChevronRight, Info, X } from 'lucide-react-native';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SURFACE_TINT } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { freshPatternShiftProgress, xpForLevel, type PatternShiftProgress } from '@/engine/core/games/patternShift';
import { loadPatternShiftProgress } from '@/services/patternShiftPersistence';

export default function PatternShiftIntroScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [progress, setProgress] = useState<PatternShiftProgress>(freshPatternShiftProgress());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    void loadPatternShiftProgress(user?.uid).then(setProgress);
  }, [user?.uid]);

  const threshold = xpForLevel(progress.playerLevel);

  return <>
    <ScreenShell pillar="mind" ambient={<AmbientBackground subtle />} safeBottom>
      <ScreenHeader title="Pattern Shift" subtitle="Visual Discrimination" showBack />
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>OBSERVE · RECALL · ADAPT</Text>
          <Text style={styles.heroTitle}>Read the structure.</Text>
          <Text style={styles.description}>Spot subtle changes in connected patterns.</Text>
        </View>
        <View style={styles.heroArt}><Image source={require('@/assets/images/icons/pattren-shift .png')} resizeMode="contain" style={styles.heroImage} /></View>
      </View>
      <GlassCard simple tint={SURFACE_TINT.card} style={styles.progressCard}>
        <View style={styles.progressHeading}>
          <Text style={styles.level}>LEVEL {progress.playerLevel}</Text>
          <Text style={styles.levelXp}>{progress.xp} / {threshold} XP</Text>
        </View>
        <ProgressBar progress={progress.xp / threshold} fill={PILLAR_COLORS.mind} style={styles.bar} />
        <View style={styles.stats}>
          <CompactStat label="BEST" value={progress.bestScore ? String(progress.bestScore) : '—'} />
          <View style={styles.statDivider} />
          <CompactStat label="STREAK" value={progress.bestStreak ? String(progress.bestStreak) : '—'} />
          <View style={styles.statDivider} />
          <CompactStat label="TIER" value={String(progress.highestDifficulty)} />
        </View>
      </GlassCard>
      <GradientCTA label="Start Session" onPress={() => router.push(ROUTES.appPatternShiftGame as never)} style={styles.cta} />
      <Text style={styles.duration}>2–4 min</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="How to play Pattern Shift" onPress={() => setShowHelp(true)} style={styles.howPressable}>
        {({ pressed }) => <View style={[styles.howRow, pressed && styles.howRowPressed]}>
          <View style={styles.howIcon}><Info size={18} color="#7DEBFA" /></View>
          <View style={styles.howCopy}><Text style={styles.howLabel}>How to Play</Text><Text style={styles.howSub}>Learn the rules in 20 sec</Text></View>
          <ChevronRight size={18} color={colors.text.tertiary} />
        </View>}
      </Pressable>
      <View style={styles.overlayClearance} />
    </ScreenShell>
    <Modal visible={showHelp} transparent animationType="fade" onRequestClose={() => setShowHelp(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setShowHelp(false)}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalHeading}>
            <Text style={styles.modalTitle}>How to Play</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close instructions" hitSlop={12} onPress={() => setShowHelp(false)}><X size={21} color={colors.text.secondary} /></Pressable>
          </View>
          <HowStep number="1" title="Read the structure" copy="Look at nodes, paths, and direction." />
          <HowStep number="2" title="Tap the match" copy="Choose the structure you believe is correct." />
          <HowStep number="3" title="Rules evolve" copy="Later rounds add recall, mirrors, rotations, and missing elements." />
          <GradientCTA label="Got It" compact onPress={() => setShowHelp(false)} style={styles.gotIt} />
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

function HowStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <View style={styles.howStep}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{copy}</Text></View></View>;
}

const styles = StyleSheet.create({
  hero: { height: 164, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: 20, marginBottom: spacing.md, backgroundColor: 'rgba(24,21,45,.76)', borderWidth: 1, borderColor: 'rgba(169,139,255,.18)' },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.25, color: '#A98BFF' },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 21, color: '#fff', marginTop: 8 },
  description: { fontSize: 12.5, lineHeight: 18, color: colors.text.secondary, marginTop: 5 },
  heroArt: { width: '44%', height: '88%', alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
  progressCard: { paddingVertical: 16, marginBottom: spacing.md },
  progressHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#fff', letterSpacing: .5 },
  levelXp: { fontSize: 11, color: colors.text.secondary },
  bar: { marginTop: 12 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,.08)' },
  statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, color: colors.text.tertiary },
  statValue: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#fff' },
  cta: { marginTop: 2 },
  duration: { textAlign: 'center', fontSize: 11, color: colors.text.tertiary, marginTop: 8 },
  howPressable: { width: '100%', marginTop: 14, borderRadius: 20 },
  howRow: { width: '100%', minHeight: 68, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: 'rgba(24,25,47,.78)', borderWidth: 1, borderColor: 'rgba(169,139,255,.14)' },
  howRowPressed: { backgroundColor: 'rgba(32,35,61,.9)', borderColor: 'rgba(125,235,250,.24)', transform: [{ scale: .99 }] },
  howIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(125,235,250,.09)', borderWidth: 1, borderColor: 'rgba(125,235,250,.16)' },
  howCopy: { display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' },
  howLabel: { fontFamily: FONTS.headingSemi, fontSize: 14, color: colors.text.primary },
  howSub: { fontSize: 11, color: colors.text.tertiary, marginTop: 3 },
  overlayClearance: { height: 64 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 18, paddingBottom: 34, backgroundColor: 'rgba(4,5,15,.72)' },
  modalCard: { borderRadius: 24, padding: 21, backgroundColor: '#17182C', borderWidth: 1, borderColor: 'rgba(169,139,255,.2)' },
  modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 20, color: '#fff' },
  howStep: { flexDirection: 'row', gap: 12, marginTop: 17 },
  stepNumber: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(125,235,250,.09)', borderWidth: 1, borderColor: 'rgba(125,235,250,.18)' },
  stepNumberText: { fontSize: 11, fontWeight: '900', color: '#7DEBFA' },
  stepCopy: { flex: 1 },
  stepTitle: { fontFamily: FONTS.headingSemi, fontSize: 13.5, color: '#fff' },
  stepText: { fontSize: 11.5, lineHeight: 17, color: colors.text.secondary, marginTop: 2 },
  gotIt: { marginTop: 21 },
});
