import { useEffect, useMemo, useState } from "react";
import { Flame, Gauge, Grid3X3, Route } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { colors } from "@/constants/colors";
import { FONTS, PILLAR_COLORS, SURFACE_TINT } from "@/constants/designSystem";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import {
  freshTimeFlowProgress,
  xpForLevel,
  type TimeFlowProgress,
  type TimeFlowSessionRecord,
} from "@/engine/core/games/timeFlow";
import { loadTimeFlowProgress } from "@/services/timeFlowPersistence";
import { useSessionCompleteMonetization } from "@/services/ads/useSessionCompleteMonetization";
export default function TimeFlowResultsScreen() {
  const router = useRouter(),
    { id } = useLocalSearchParams<{ id: string }>(),
    { user } = useAuth(),
    [progress, setProgress] = useState<TimeFlowProgress>(
      freshTimeFlowProgress(),
    );
  useEffect(() => {
    void loadTimeFlowProgress(user?.uid).then(setProgress);
  }, [user?.uid]);
  const { maybeShow } = useSessionCompleteMonetization();
  useEffect(() => {
    void maybeShow();
  }, [maybeShow]);
  const record =
      progress.sessionHistory.find((r) => r.id === id) ??
      progress.sessionHistory.at(-1),
    comparison = useMemo(() => {
      if (!record) return;
      const prior = progress.recentPerformance.slice(0, -1);
      if (!prior.length) return;
      const average = prior.reduce((s, r) => s + r.accuracy, 0) / prior.length,
        delta = Math.round((record.accuracy - average) * 100);
      return delta > 0 ? `Accuracy +${delta}% vs recent average` : undefined;
    }, [progress, record]);
  if (!record)
    return (
      <ScreenShell scroll={false}>
        <View style={styles.center}>
          <Text style={styles.muted}>Loading your results…</Text>
        </View>
      </ScreenShell>
    );
  const threshold = xpForLevel(progress.level),
    levelUp = record.levelAfter > record.levelBefore;
  return (
    <ScreenShell bannerAd
      pillar="mind"
      ambient={<AmbientBackground subtle />}
      safeBottom
    >
      <View style={styles.hero}>
        <Text style={styles.score}>{record.score}</Text>
        <Text style={styles.scoreLabel}>FINAL SCORE</Text>
        <Text style={styles.xp}>+{record.xpEarned} XP</Text>
      </View>
      <GlassCard simple tint={SURFACE_TINT.card} style={styles.levelCard}>
        {levelUp ? (
          <>
            <Text style={styles.levelUp}>LEVEL UP</Text>
            <Text style={styles.unlock}>
              Level {record.levelAfter} unlocked
            </Text>
          </>
        ) : (
          <View style={styles.levelRow}>
            <Text style={styles.level}>LEVEL {progress.level}</Text>
            <Text style={styles.levelXp}>
              {progress.xp} / {threshold} XP
            </Text>
          </View>
        )}
        <ProgressBar
          progress={progress.xp / threshold}
          fill={PILLAR_COLORS.mind}
          style={styles.bar}
        />
      </GlassCard>
      <View style={styles.grid}>
        <Metric
          icon={<Route size={16} color="#4DE1C1" />}
          value={`${Math.round(record.accuracy * 100)}%`}
          label="ACCURACY"
        />
        <Metric
          icon={<Grid3X3 size={16} color="#4DE1C1" />}
          value={`${record.highestGridColumns ?? 3}×${record.highestGridRows ?? 3}`}
          label="HIGHEST GRID"
        />
        <Metric
          icon={<Flame size={16} color="#4DE1C1" />}
          value={String(record.bestStreak)}
          label="BEST STREAK"
        />
        <Metric
          icon={<Gauge size={16} color="#4DE1C1" />}
          value={String(record.highestSequenceLength)}
          label="LONGEST FLOW"
        />
      </View>
      <View style={styles.insight}>
        <Text style={styles.insightTitle}>{heading(record, progress)}</Text>
        {comparison && <Text style={styles.comparison}>{comparison}</Text>}
        <Text style={styles.tip}>{tip(record)}</Text>
      </View>
      <GradientCTA
        label="Play Again"
        onPress={() => router.replace(ROUTES.appTimeFlowGame as never)}
      />
      <GradientCTA
        label="Back to Mind"
        variant="secondary"
        onPress={() => router.replace(ROUTES.appMind as never)}
        style={styles.back}
      />
      <View style={{ height: 64 }} />
    </ScreenShell>
  );
}
function heading(record: TimeFlowSessionRecord, progress: TimeFlowProgress) {
  const priorLongest = Math.max(
    3,
    ...progress.sessionHistory
      .filter((session) => session.id !== record.id)
      .map((session) => session.highestSequenceLength),
  );
  if (record.highestSequenceLength > priorLongest)
    return `New longest flow: ${record.highestSequenceLength}`;
  if (progress.completedSessions > 1 && record.score === progress.bestScore)
    return "New personal best";
  if (record.accuracy < 0.5) return "Keep practicing";
  if (record.accuracy < 0.8) return "Good focus";
  return "Sharp recall";
}
function tip(record: TimeFlowSessionRecord) {
  if (record.accuracy < 0.5) return "Focus on event order before exact timing.";
  if (record.accuracy >= 0.75 && record.averageRecallMs > 6000)
    return "Accuracy is strong. Recognize the overall flow first.";
  if (record.accuracy >= 0.8) return "You're ready for longer sequences.";
  return "Anchor the first and last events before filling the middle.";
}
function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.metric}>
      <View style={styles.metricInner}>
        {icon}
        <View>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
      </View>
    </GlassCard>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.text.secondary },
  hero: { alignItems: "center", paddingTop: 30, paddingBottom: 24 },
  score: {
    fontFamily: FONTS.heading,
    fontSize: 52,
    lineHeight: 58,
    color: "#fff",
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: colors.text.tertiary,
  },
  xp: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
    color: "#4DE1C1",
    marginTop: 12,
  },
  levelCard: { paddingVertical: 15, marginBottom: 12 },
  levelRow: { flexDirection: "row", justifyContent: "space-between" },
  level: { fontFamily: FONTS.headingSemi, fontSize: 15, color: "#fff" },
  levelXp: { fontSize: 11, color: colors.text.secondary },
  levelUp: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#4DE1C1",
  },
  unlock: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
    color: "#fff",
    marginTop: 4,
  },
  bar: { marginTop: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48%", flexGrow: 1 },
  metricInner: {
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metricValue: { fontFamily: FONTS.headingSemi, fontSize: 17, color: "#fff" },
  metricLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  insight: { alignItems: "center", padding: 18 },
  insightTitle: { fontFamily: FONTS.headingSemi, fontSize: 17, color: "#fff" },
  comparison: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78E4B0",
    marginTop: 5,
  },
  tip: {
    textAlign: "center",
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: 7,
  },
  back: { marginTop: 9 },
});
