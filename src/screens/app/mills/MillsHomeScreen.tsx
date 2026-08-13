import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lock,
  RotateCcw,
  Smartphone,
  Target,
  Users,
  Wifi,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FONTS } from '@/constants/designSystem';
import { MILLS_THEME as T } from '@/constants/millsTheme';
import { ROUTES } from '@/constants';
import { MillsBackground } from '@/components/games/mills/MillsBackground';
import type { GamePhase } from '@/engine/core/games/mills';
import { loadMillsMatch } from '@/services/millsPersistence';

interface SavedMatchMeta { phase: GamePhase; turnNumber: number }

export default function MillsHomeScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedMatchMeta | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadMillsMatch().then(state => {
      if (!active) return;
      setSaved(state ? { phase: state.phase, turnNumber: state.turnNumber } : null);
    });
    return () => { active = false; };
  }, []));

  return (
    <View style={styles.safe}>
      <MillsBackground />

      <SafeAreaView style={styles.safeInner}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <ArrowLeft color={T.text} size={20} />
          </Pressable>

          <View style={styles.hero}>
            <Text style={styles.kicker}>THE CLASSIC STRATEGY GAME</Text>
            <Text style={styles.title}>MILLS</Text>
            <Text style={styles.subtitle}>Choose how you want to play</Text>
          </View>

          {/* Section A — Solo Missions (disabled / roadmap) */}
          <View accessibilityState={{ disabled: true }} style={styles.soloCard}>
            <Lock color={T.textMuted} size={13} style={styles.soloLock} />
            <View style={styles.soloIcon}><Target color={T.textMuted} size={21} /></View>
            <View style={styles.modeCopy}>
              <View style={styles.titleRow}>
                <Text style={styles.soloTitle}>Solo Missions</Text>
                <Badge label="COMING SOON" tone="soon" icon={Clock} />
              </View>
              <Text style={styles.modeDescription}>Quick tactical Morris challenges</Text>
              <Text style={styles.modeMeta}>20–60 sec missions</Text>
            </View>
          </View>

          {/* Section B — Two Player (featured) */}
          <View style={styles.featuredCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.twoPlayerIcon}><Users color={T.p1} size={22} /></View>
              <View style={styles.modeCopy}>
                <Text style={styles.modeTitle}>Two Player</Text>
                <Text style={styles.modeDescription}>Classic Nine Men&apos;s Morris</Text>
              </View>
              <View style={styles.featuredTag}><Text style={styles.featuredTagText}>FEATURED</Text></View>
            </View>

            <View style={styles.divider} />

            <Pressable
              accessibilityLabel="Local Match, available"
              onPress={() => router.push(ROUTES.appMillsSetup as never)}
              style={styles.localMatch}
            >
              <View style={styles.localIcon}><Smartphone color={T.p1} size={19} /></View>
              <View style={styles.modeCopy}>
                <Text style={styles.localTitle}>Local Match</Text>
                <Text style={styles.optionDescription}>Play with another person on this device</Text>
              </View>
              <View style={styles.playButton}><ArrowRight color="#071316" size={16} /></View>
            </Pressable>

            {saved && (
              <Pressable
                accessibilityLabel="Resume unfinished local match"
                onPress={() => router.push({ pathname: ROUTES.appMillsMatch, params: { continue: 'true' } } as never)}
                style={styles.resumeStrip}
              >
                <View style={styles.resumeIcon}><RotateCcw color={T.p1} size={14} /></View>
                <View style={styles.modeCopy}>
                  <Text style={styles.resumeTitle}>Resume Local Match</Text>
                  <Text style={styles.resumeMeta}>
                    {saved.phase === 'placement' ? 'Placement phase' : 'Movement phase'} · Turn {saved.turnNumber + 1}
                  </Text>
                </View>
                <ArrowRight color={T.textMuted} size={14} />
              </Pressable>
            )}

            <View style={styles.optionDivider} />

            <View accessibilityState={{ disabled: true }} style={styles.onlineMatch}>
              <View style={styles.optionIcon}><Wifi color={T.textMuted} size={18} /></View>
              <View style={styles.modeCopy}>
                <View style={styles.titleRow}>
                  <Text style={styles.optionTitle}>Online Match</Text>
                  <Badge label="COMING LATER" tone="soon" icon={Clock} />
                </View>
                <Text style={styles.optionDescription}>Play with friends or opponents online</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Badge({ label, tone, icon: Icon }: { label: string; tone: 'available' | 'soon'; icon: LucideIcon }) {
  const color = tone === 'available' ? T.p1 : T.soon;
  return (
    <View style={[styles.badge, { borderColor: `${color}4D`, backgroundColor: `${color}14`, shadowColor: color }]}>
      <Icon color={color} size={9} strokeWidth={2.6} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  safeInner: { flex: 1 },
  container: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceSoft, borderWidth: 1, borderColor: T.border },

  hero: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  kicker: { fontFamily: FONTS.bodySemi, fontSize: 10, letterSpacing: 2.4, color: T.p1 },
  title: { fontFamily: FONTS.heading, fontSize: 48, letterSpacing: 6, color: T.text, marginTop: 6 },
  subtitle: { fontFamily: FONTS.body, color: T.textMuted, fontSize: 13, marginTop: 4 },

  /* Solo Missions — compact, muted, roadmap treatment */
  soloCard: { flexDirection: 'row', gap: 13, padding: 15, borderRadius: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, opacity: 0.82 },
  soloLock: { position: 'absolute', top: 12, right: 13 },
  soloIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceSoft, borderWidth: 1, borderColor: T.border },
  soloTitle: { color: T.textMuted, fontFamily: FONTS.headingSemi, fontSize: 16 },
  modeCopy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modeTitle: { color: T.text, fontFamily: FONTS.headingSemi, fontSize: 18 },
  modeDescription: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 13, marginTop: 4 },
  modeMeta: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 10, marginTop: 7, letterSpacing: 0.3 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 6 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 8.5, letterSpacing: 0.8 },

  /* Two Player — featured card */
  featuredCard: { marginTop: 16, padding: 18, borderRadius: 22, backgroundColor: T.surface, borderWidth: 1, borderColor: 'rgba(55,231,224,0.28)', shadowColor: T.p1, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  twoPlayerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(55,213,208,0.13)', borderWidth: 1, borderColor: 'rgba(55,213,208,0.3)' },
  featuredTag: { borderRadius: 20, backgroundColor: 'rgba(55,213,208,0.14)', borderWidth: 1, borderColor: 'rgba(55,213,208,0.32)', paddingHorizontal: 8, paddingVertical: 4 },
  featuredTagText: { color: T.p1, fontFamily: FONTS.bodyBold, fontSize: 8.5, letterSpacing: 0.8 },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 15 },

  localMatch: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 10, backgroundColor: 'rgba(55,213,208,0.07)', borderWidth: 1, borderColor: 'rgba(55,213,208,0.18)' },
  localIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(55,213,208,0.14)' },
  localTitle: { color: T.text, fontFamily: FONTS.bodyBold, fontSize: 15 },
  optionDescription: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 11, lineHeight: 16, marginTop: 3 },
  playButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: T.p1 },

  resumeStrip: { minHeight: 46, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(55,213,208,0.05)', borderWidth: 1, borderColor: 'rgba(55,213,208,0.16)' },
  resumeIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(55,213,208,0.13)' },
  resumeTitle: { color: T.p1, fontFamily: FONTS.bodySemi, fontSize: 11.5 },
  resumeMeta: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 10, marginTop: 1 },

  optionDivider: { height: 1, backgroundColor: T.border, marginVertical: 13 },
  onlineMatch: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 8, opacity: 0.55 },
  optionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { color: T.text, fontFamily: FONTS.bodyBold, fontSize: 14 },
});
