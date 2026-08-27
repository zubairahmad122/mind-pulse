import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, Info, X } from 'lucide-react-native';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SURFACE_TINT } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { loadSchulteState, type SchultePersistedState } from '@/services/schultePersistence';

export default function SchulteNexusOverviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<SchultePersistedState | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => { void loadSchulteState(user?.uid).then(setState); }, [user?.uid]);
  const level = state?.levelState.currentLevel ?? 1;
  const progress = state?.levelState.levelProgress ?? 0;
  const completed = state?.profile.completedSignatures.length ?? 0;
  const rating = state?.profile.rating ?? 0;
  const tier = rating >= 650 ? 'EXPERT' : rating >= 450 ? 'ADVANCED' : rating >= 300 ? 'SHARP' : rating >= 150 ? 'STEADY' : 'STARTER';

  return <>
    <ScreenShell pillar="mind" ambient={<AmbientBackground subtle />} safeBottom>
      <ScreenHeader title="Schulte Nexus" subtitle="Visual Attention" showBack />
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>SCAN · FIND · ADVANCE</Text>
          <Text style={styles.heroTitle}>Find the next number.</Text>
          <Text style={styles.description}>Move through each sequence with speed and precision.</Text>
        </View>
        <View style={styles.art}><Image source={require('@/assets/images/icons/schulte-nexus.webp')} resizeMode="contain" style={styles.heroImage} /></View>
      </View>
      <GlassCard simple tint={SURFACE_TINT.card} style={styles.progressCard}>
        <View style={styles.progressHeading}><Text style={styles.level}>LEVEL {level}</Text><Text style={styles.xp}>{progress} / 100</Text></View>
        <ProgressBar progress={progress / 100} fill={PILLAR_COLORS.mind} style={styles.bar} />
        <View style={styles.stats}>
          <Stat label="MISSIONS" value={String(completed)} /><View style={styles.divider} />
          <Stat label="RATING" value={String(rating)} /><View style={styles.divider} />
          <Stat label="TIER" value={tier} small />
        </View>
      </GlassCard>
      <GradientCTA label="Start Challenge" onPress={() => router.push(ROUTES.appSchulteNexusGame as never)} style={styles.cta} />
      <Text style={styles.duration}>1–3 min</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="How to play Schulte Nexus" onPress={() => setHelp(true)} style={styles.howPressable}>
        {({ pressed }) => <View style={[styles.how, pressed && styles.howPressed]}>
          <View style={styles.info}><Info size={18} color="#72E8F6" /></View>
          <View style={styles.howCopy}><Text style={styles.howTitle}>How to Play</Text><Text style={styles.howSub}>Learn the rules in 20 sec</Text></View>
          <ChevronRight size={18} color={colors.text.tertiary} />
        </View>}
      </Pressable>
      <View style={styles.clearance} />
    </ScreenShell>
    <Modal visible={help} transparent animationType="fade" onRequestClose={() => setHelp(false)}>
      <Pressable style={styles.backdrop} onPress={() => setHelp(false)}><Pressable style={styles.sheet} onPress={() => undefined}>
        <View style={styles.sheetHead}><Text style={styles.sheetTitle}>How to Play</Text><Pressable accessibilityRole="button" accessibilityLabel="Close instructions" hitSlop={12} onPress={() => setHelp(false)}><X size={21} color={colors.text.secondary} /></Pressable></View>
        <Step n="1" title="Read the mission" copy="Check the order and target range before starting." />
        <Step n="2" title="Scan the grid" copy="Find and tap each number in the required sequence." />
        <Step n="3" title="Stay accurate" copy="Finish before time runs out and avoid mistakes." />
        <GradientCTA label="Got It" compact onPress={() => setHelp(false)} style={styles.gotIt} />
      </Pressable></Pressable>
    </Modal>
  </>;
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, small && styles.statSmall]}>{value}</Text></View>; }
function Step({ n, title, copy }: { n: string; title: string; copy: string }) { return <View style={styles.step}><View style={styles.number}><Text style={styles.numberText}>{n}</Text></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{copy}</Text></View></View>; }

const styles = StyleSheet.create({
  hero: { height: 164, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: 20, marginBottom: 16, backgroundColor: 'rgba(24,21,45,.76)', borderWidth: 1, borderColor: 'rgba(169,139,255,.18)' },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.25, color: '#A98BFF' }, heroTitle: { fontFamily: FONTS.heading, fontSize: 21, lineHeight: 27, color: '#fff', marginTop: 8 }, description: { fontSize: 12.5, lineHeight: 18, color: colors.text.secondary, marginTop: 5 }, art: { width: '44%', height: '88%' }, heroImage: { width: '100%', height: '100%' },
  progressCard: { paddingVertical: 16, marginBottom: 16 }, progressHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, level: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#fff' }, xp: { fontSize: 11, color: colors.text.secondary }, bar: { marginTop: 12 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 15 }, stat: { flex: 1, alignItems: 'center', gap: 3 }, divider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,.08)' }, statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, color: colors.text.tertiary }, statValue: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#fff' }, statSmall: { fontSize: 10 },
  cta: { marginTop: 2 }, duration: { textAlign: 'center', fontSize: 11, color: colors.text.tertiary, marginTop: 8 }, howPressable: { width: '100%', marginTop: 14, borderRadius: 20 },
  how: { width: '100%', minHeight: 68, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(24,25,47,.78)', borderWidth: 1, borderColor: 'rgba(169,139,255,.14)' }, howPressed: { backgroundColor: 'rgba(32,35,61,.9)', borderColor: 'rgba(114,232,246,.24)', transform: [{ scale: .99 }] },
  info: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(114,232,246,.09)', borderWidth: 1, borderColor: 'rgba(114,232,246,.16)' }, howCopy: { flex: 1 }, howTitle: { fontFamily: FONTS.headingSemi, fontSize: 14, color: colors.text.primary }, howSub: { fontSize: 11, color: colors.text.tertiary, marginTop: 3 }, clearance: { height: 64 },
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: 18, paddingBottom: 34, backgroundColor: 'rgba(4,5,15,.72)' }, sheet: { borderRadius: 24, padding: 21, backgroundColor: '#17182C', borderWidth: 1, borderColor: 'rgba(169,139,255,.2)' }, sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { fontFamily: FONTS.heading, fontSize: 20, color: '#fff' },
  step: { flexDirection: 'row', gap: 12, marginTop: 17 }, number: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(114,232,246,.09)', borderWidth: 1, borderColor: 'rgba(114,232,246,.18)' }, numberText: { fontSize: 11, fontWeight: '900', color: '#72E8F6' }, stepCopy: { flex: 1 }, stepTitle: { fontFamily: FONTS.headingSemi, fontSize: 13.5, color: '#fff' }, stepText: { fontSize: 11.5, lineHeight: 17, color: colors.text.secondary, marginTop: 2 }, gotIt: { marginTop: 21 },
});
