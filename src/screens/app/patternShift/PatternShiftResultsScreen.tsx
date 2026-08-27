import { useEffect, useMemo, useState } from 'react';
import { Clock3, Crosshair, Flame, Gauge } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SURFACE_TINT } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { freshPatternShiftProgress, xpForLevel, type PatternShiftProgress, type PatternShiftSessionRecord } from '@/engine/core/games/patternShift';
import { loadPatternShiftProgress } from '@/services/patternShiftPersistence';

export default function PatternShiftResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [progress, setProgress] = useState<PatternShiftProgress>(freshPatternShiftProgress());

  useEffect(() => {
    void loadPatternShiftProgress(user?.uid).then(setProgress);
  }, [user?.uid]);

  const record = progress.sessionHistory.find(item => item.id === id) ?? progress.sessionHistory.at(-1);
  const comparison = useMemo(() => {
    if (!record) return undefined;
    const prior = progress.recentPerformance.slice(0, -1);
    if (!prior.length) return undefined;
    const average = prior.reduce((sum, item) => sum + item.accuracy, 0) / prior.length;
    const delta = Math.round((record.accuracy - average) * 100);
    return delta > 0 ? `Accuracy +${delta}% vs recent average` : undefined;
  }, [progress, record]);

  if (!record) return <ScreenShell scroll={false}><View style={styles.center}><Text style={styles.muted}>Loading your results…</Text></View></ScreenShell>;

  const threshold = xpForLevel(progress.playerLevel);
  const didLevelUp = record.playerLevelAfter > record.playerLevelBefore;
  const heading = performanceHeading(record, progress);
  const tip = performanceTip(record);

  return <ScreenShell pillar="mind" ambient={<AmbientBackground subtle />} safeBottom>
    <View style={styles.hero}>
      <Text style={styles.score}>{record.score}</Text>
      <Text style={styles.scoreLabel}>FINAL SCORE</Text>
      <Text style={styles.xp}>+{record.xpEarned} XP</Text>
    </View>

    <GlassCard simple tint={SURFACE_TINT.card} style={styles.levelCard}>
      {didLevelUp ? <>
        <Text style={styles.levelUp}>LEVEL UP</Text>
        <Text style={styles.unlock}>Level {record.playerLevelAfter} unlocked</Text>
      </> : <View style={styles.levelRow}>
        <Text style={styles.level}>LEVEL {progress.playerLevel}</Text>
        <Text style={styles.levelXp}>{progress.xp} / {threshold} XP</Text>
      </View>}
      <ProgressBar progress={progress.xp / threshold} fill={PILLAR_COLORS.mind} style={styles.bar} />
    </GlassCard>

    <View style={styles.grid}>
      <Metric icon={<Crosshair size={16} color="#74E6F5" />} value={`${Math.round(record.accuracy * 100)}%`} label="ACCURACY" />
      <Metric icon={<Clock3 size={16} color="#74E6F5" />} value={`${(record.averageResponseMs / 1000).toFixed(1)}s`} label="AVG RESPONSE" />
      <Metric icon={<Flame size={16} color="#74E6F5" />} value={String(record.bestStreak)} label="BEST STREAK" />
      <Metric icon={<Gauge size={16} color="#74E6F5" />} value={`Tier ${record.highestDifficulty}`} label="HIGHEST" />
    </View>

    <View style={styles.insight}>
      <Text style={styles.insightTitle}>{heading}</Text>
      {comparison && <Text style={styles.comparison}>{comparison}</Text>}
      <Text style={styles.tip}>{tip}</Text>
    </View>

    <GradientCTA label="Play Again" onPress={() => router.replace(ROUTES.appPatternShiftGame as never)} style={styles.play} />
    <GradientCTA label="Back to Mind" variant="secondary" onPress={() => router.replace(ROUTES.appMind as never)} style={styles.back} />
    <View style={styles.overlayClearance} />
  </ScreenShell>;
}

function performanceHeading(record: PatternShiftSessionRecord, progress: PatternShiftProgress) {
  const hasPriorSession = progress.completedSessions > 1;
  if (hasPriorSession && record.score === progress.bestScore) return 'New personal best';
  if (record.accuracy < .5) return 'Keep practicing';
  if (record.accuracy < .8) return 'Good focus';
  return 'Sharp session';
}

function performanceTip(record: PatternShiftSessionRecord) {
  if (record.accuracy < .5) return 'Tip: Trace the main connections first, then compare endpoints.';
  if (record.accuracy >= .75 && record.averageResponseMs > 6000) return 'Accuracy is strong. Scan the overall structure before individual nodes.';
  if (record.accuracy >= .8) return "You're ready for more similar structures.";
  return 'Compare the main silhouette before checking terminal details.';
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.metric}><View style={styles.metricInner}>{icon}<View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View></GlassCard>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.secondary },
  hero: { alignItems: 'center', paddingTop: 30, paddingBottom: 24 },
  score: { fontFamily: FONTS.heading, fontSize: 52, lineHeight: 58, color: '#fff' },
  scoreLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, color: colors.text.tertiary, marginTop: 2 },
  xp: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#7DEBFA', marginTop: 12 },
  levelCard: { paddingVertical: 15, marginBottom: 12 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#fff', letterSpacing: .5 },
  levelXp: { fontSize: 11, color: colors.text.secondary },
  levelUp: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#7DEBFA' },
  unlock: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#fff', marginTop: 4 },
  bar: { marginTop: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48%', flexGrow: 1 },
  metricInner: { minHeight: 62, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricValue: { fontFamily: FONTS.headingSemi, fontSize: 17, color: '#fff' },
  metricLabel: { fontSize: 8, fontWeight: '900', letterSpacing: .8, color: colors.text.tertiary, marginTop: 2 },
  insight: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 18 },
  insightTitle: { fontFamily: FONTS.headingSemi, fontSize: 17, color: '#fff' },
  comparison: { fontSize: 11, fontWeight: '700', color: '#78E4B0', marginTop: 5 },
  tip: { textAlign: 'center', fontSize: 12.5, lineHeight: 18, color: colors.text.secondary, marginTop: 7 },
  play: { marginTop: 2 },
  back: { marginTop: 9 },
  overlayClearance: { height: 64 },
});
