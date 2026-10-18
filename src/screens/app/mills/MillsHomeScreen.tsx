import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Info, RotateCcw } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { FONTS, SURFACE_TINT } from '@/constants/designSystem';
import { ROUTES } from '@/constants';
import type { GamePhase } from '@/engine/core/games/mills';
import { loadMillsMatch } from '@/services/millsPersistence';

interface SavedMatchMeta { phase: GamePhase; turnNumber: number }

export default function MillsHomeScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedMatchMeta | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadMillsMatch().then(state => {
      if (active) setSaved(state ? { phase: state.phase, turnNumber: state.turnNumber } : null);
    });
    return () => { active = false; };
  }, []));

  return <ScreenShell pillar="mind" ambient={<AmbientBackground subtle />} safeBottom>
    <ScreenHeader title="Mills" subtitle="Strategic Reasoning" showBack />
    <View style={styles.hero}>
      <View style={styles.heroCopy}>
        <Text style={styles.eyebrow}>PLACE · ALIGN · CAPTURE</Text>
        <Text style={styles.heroTitle}>Think three moves ahead.</Text>
        <Text style={styles.description}>Build mills, control the board, and outlast your opponent.</Text>
      </View>
      <View style={styles.art}><Image source={require('@/assets/images/icons/mills.webp')} resizeMode="contain" style={styles.heroImage} /></View>
    </View>
    <GlassCard simple tint={SURFACE_TINT.card} style={styles.modeCard}>
      <View style={styles.modeHeading}>
        <View><Text style={styles.modeKicker}>LOCAL MATCH</Text><Text style={styles.modeTitle}>Two Player</Text></View>
        <View style={styles.available}><Text style={styles.availableText}>READY</Text></View>
      </View>
      <View style={styles.rule} />
      <View style={styles.stats}>
        <Stat label="PLAYERS" value="2" /><View style={styles.divider} />
        <Stat label="PIECES" value="9" /><View style={styles.divider} />
        <Stat label="FORM" value="3 IN ROW" small />
      </View>
      {saved && <Pressable accessibilityRole="button" accessibilityLabel="Resume unfinished local match" onPress={() => router.push({ pathname: ROUTES.appMillsMatch, params: { continue: 'true' } } as never)} style={styles.resume}>
        <View style={styles.resumeIcon}><RotateCcw size={14} color="#4DE1C1" /></View>
        <View style={styles.resumeCopy}><Text style={styles.resumeTitle}>Resume Match</Text><Text style={styles.resumeSub}>{saved.phase === 'placement' ? 'Placement phase' : 'Movement phase'} · Turn {saved.turnNumber + 1}</Text></View>
        <ChevronRight size={17} color={colors.text.tertiary} />
      </Pressable>}
    </GlassCard>
    <GradientCTA label="Set Up Match" onPress={() => router.push(ROUTES.appMillsSetup as never)} style={styles.cta} />
    <Text style={styles.duration}>10–20 min</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="How to play Mills" onPress={() => router.push(ROUTES.appMillsRules as never)} style={styles.howPressable}>
      {({ pressed }) => <View style={[styles.how, pressed && styles.howPressed]}>
        <View style={styles.info}><Info size={18} color="#4DE1C1" /></View>
        <View style={styles.howCopy}><Text style={styles.howTitle}>How to Play</Text><Text style={styles.howSub}>Learn the rules step by step</Text></View>
        <ChevronRight size={18} color={colors.text.tertiary} />
      </View>}
    </Pressable>
    <View style={styles.clearance} />
  </ScreenShell>;
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, small && styles.statValueSmall]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { height: 164, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: 20, marginBottom: 16, backgroundColor: 'rgba(24,21,45,.76)', borderWidth: 1, borderColor: 'rgba(164,139,255,.18)' },
  heroCopy: { flex: 1, zIndex: 1 }, eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.25, color: '#A48BFF' },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 21, lineHeight: 27, color: '#fff', marginTop: 8 }, description: { fontSize: 12.5, lineHeight: 18, color: colors.text.secondary, marginTop: 5 }, art: { width: '44%', height: '88%' }, heroImage: { width: '100%', height: '100%' },
  modeCard: { paddingVertical: 16, marginBottom: 16 }, modeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeKicker: { fontSize: 8, fontWeight: '900', letterSpacing: 1, color: colors.text.tertiary }, modeTitle: { fontFamily: FONTS.headingSemi, fontSize: 17, color: '#fff', marginTop: 3 },
  available: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(77,225,193,.08)', borderWidth: 1, borderColor: 'rgba(77,225,193,.18)' }, availableText: { color: '#4DE1C1', fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,.07)', marginTop: 13 }, stats: { flexDirection: 'row', alignItems: 'center', marginTop: 14 }, stat: { flex: 1, alignItems: 'center', gap: 3 },
  statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, color: colors.text.tertiary }, statValue: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#fff' }, statValueSmall: { fontSize: 11 }, divider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,.08)' },
  resume: { minHeight: 48, marginTop: 14, paddingHorizontal: 11, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(77,225,193,.055)', borderWidth: 1, borderColor: 'rgba(77,225,193,.13)' },
  resumeIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,225,193,.09)' }, resumeCopy: { flex: 1 }, resumeTitle: { color: '#4DE1C1', fontFamily: FONTS.headingSemi, fontSize: 11.5 }, resumeSub: { color: colors.text.tertiary, fontSize: 9.5, marginTop: 1 },
  cta: { marginTop: 2 }, duration: { textAlign: 'center', fontSize: 11, color: colors.text.tertiary, marginTop: 8 }, howPressable: { width: '100%', marginTop: 14, borderRadius: 20 },
  how: { width: '100%', minHeight: 68, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(27,22,66,.78)', borderWidth: 1, borderColor: 'rgba(164,139,255,.14)' },
  howPressed: { backgroundColor: 'rgba(36,30,84,.9)', borderColor: 'rgba(77,225,193,.24)', transform: [{ scale: .99 }] }, info: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,225,193,.09)', borderWidth: 1, borderColor: 'rgba(77,225,193,.16)' },
  howCopy: { flex: 1, justifyContent: 'center' }, howTitle: { fontFamily: FONTS.headingSemi, fontSize: 14, color: colors.text.primary }, howSub: { fontSize: 11, color: colors.text.tertiary, marginTop: 3 }, clearance: { height: 64 },
});
