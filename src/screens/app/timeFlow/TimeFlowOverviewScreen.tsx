import { useEffect, useState } from "react";
import { ChevronRight, Info, X } from "lucide-react-native";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors } from "@/constants/colors";
import { FONTS, PILLAR_COLORS, SURFACE_TINT } from "@/constants/designSystem";
import { ROUTES } from "@/constants/routes";
import { spacing } from "@/constants/spacing";
import { useAuth } from "@/context/AuthContext";
import {
  freshTimeFlowProgress,
  xpForLevel,
  type TimeFlowProgress,
} from "@/engine/core/games/timeFlow";
import { loadTimeFlowProgress } from "@/services/timeFlowPersistence";
export default function TimeFlowOverviewScreen() {
  const router = useRouter(),
    { user } = useAuth(),
    [progress, setProgress] = useState<TimeFlowProgress>(
      freshTimeFlowProgress(),
    ),
    [help, setHelp] = useState(false);
  useEffect(() => {
    void loadTimeFlowProgress(user?.uid).then(setProgress);
  }, [user?.uid]);
  const threshold = xpForLevel(progress.level);
  return (
    <>
      <ScreenShell
        pillar="mind"
        ambient={<AmbientBackground subtle />}
        safeBottom
      >
        <ScreenHeader title="TimeFlow" subtitle="Working Memory" showBack />
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>WATCH · HOLD · RECALL</Text>
            <Text style={styles.heroTitle}>Remember the flow.</Text>
            <Text style={styles.description}>
              Recall what happened and in what order.
            </Text>
          </View>
          <View style={styles.art}>
            <Image source={require('@/assets/images/icons/time-flow.webp')} resizeMode="contain" style={styles.heroImage} />
          </View>
        </View>
        <GlassCard simple tint={SURFACE_TINT.card} style={styles.progress}>
          <View style={styles.levelRow}>
            <Text style={styles.level}>LEVEL {progress.level}</Text>
            <Text style={styles.xp}>
              {progress.xp} / {threshold} XP
            </Text>
          </View>
          <ProgressBar
            progress={progress.xp / threshold}
            fill={PILLAR_COLORS.mind}
            style={styles.bar}
          />
          <View style={styles.stats}>
            <Stat
              label="BEST"
              value={progress.bestScore ? String(progress.bestScore) : "—"}
            />
            <View style={styles.divider} />
            <Stat
              label="STREAK"
              value={progress.bestStreak ? String(progress.bestStreak) : "—"}
            />
            <View style={styles.divider} />
            <Stat label="TIER" value={String(progress.highestTier)} />
          </View>
        </GlassCard>
        <GradientCTA
          label="Start Session"
          onPress={() => router.push(ROUTES.appTimeFlowGame as never)}
          style={styles.cta}
        />
        <Text style={styles.duration}>2–3 min</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How to play TimeFlow"
          onPress={() => setHelp(true)}
          style={styles.howPressable}
        >
          {({ pressed }) => (
            <View style={[styles.how, pressed && styles.howPressed]}>
              <View style={styles.info}>
                <Info size={18} color="#72E8F6" />
              </View>
              <View style={styles.howCopy}>
                <Text style={styles.howTitle}>How to Play</Text>
                <Text style={styles.howSub}>Learn the rules in 20 sec</Text>
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} />
            </View>
          )}
        </Pressable>
        <View style={styles.clearance} />
      </ScreenShell>
      <Modal
        visible={help}
        transparent
        animationType="fade"
        onRequestClose={() => setHelp(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setHelp(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>How to Play</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close instructions"
                hitSlop={12}
                onPress={() => setHelp(false)}
              >
                <X size={21} color={colors.text.secondary} />
              </Pressable>
            </View>
            <Step
              n="1"
              title="Watch"
              copy="Follow the sequence as signals move."
            />
            <Step n="2" title="Remember" copy="Keep the order in mind." />
            <Step n="3" title="Recall" copy="Answer what happened and when." />
            <Step
              n="4"
              title="Adapt"
              copy="Higher levels add reverse recall, updating, and dual flows."
            />
            <GradientCTA
              label="Got It"
              compact
              onPress={() => setHelp(false)}
              style={styles.gotIt}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function Step({ n, title, copy }: { n: string; title: string; copy: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepCopy}>{copy}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    height: 164,
    borderRadius: 26,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    marginBottom: spacing.md,
    backgroundColor: "rgba(24,21,45,.76)",
    borderWidth: 1,
    borderColor: "rgba(169,139,255,.18)",
  },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.25,
    color: "#A98BFF",
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
    color: "#fff",
    marginTop: 8,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: 5,
  },
  art: { width: "44%", height: "88%", alignItems: "center" },
  heroImage: { width: "100%", height: "100%" },
  progress: { paddingVertical: 16, marginBottom: spacing.md },
  levelRow: { flexDirection: "row", justifyContent: "space-between" },
  level: { fontFamily: FONTS.headingSemi, fontSize: 16, color: "#fff" },
  xp: { fontSize: 11, color: colors.text.secondary },
  bar: { marginTop: 12 },
  stats: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  divider: { height: 25, width: 1, backgroundColor: "rgba(255,255,255,.08)" },
  statLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.text.tertiary,
  },
  statValue: { fontFamily: FONTS.headingSemi, fontSize: 15, color: "#fff" },
  cta: { marginTop: 2 },
  duration: {
    textAlign: "center",
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  howPressable: {
    width: "100%",
    marginTop: 14,
    borderRadius: 20,
  },
  how: {
    width: "100%",
    minHeight: 68,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(24,25,47,.78)",
    borderWidth: 1,
    borderColor: "rgba(169,139,255,.14)",
  },
  howPressed: {
    backgroundColor: "rgba(32,35,61,.9)",
    borderColor: "rgba(114,232,246,.24)",
    transform: [{ scale: 0.99 }],
  },
  info: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(114,232,246,.09)",
    borderWidth: 1,
    borderColor: "rgba(114,232,246,.16)",
  },
  howCopy: { flex: 1, justifyContent: "center" },
  howTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
    color: colors.text.primary,
  },
  howSub: { fontSize: 11, color: colors.text.tertiary, marginTop: 3 },
  clearance: { height: 64 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
    paddingBottom: 34,
    backgroundColor: "rgba(4,5,15,.72)",
  },
  sheet: {
    borderRadius: 24,
    padding: 21,
    backgroundColor: "#17182C",
    borderWidth: 1,
    borderColor: "rgba(169,139,255,.2)",
  },
  sheetHead: { flexDirection: "row", justifyContent: "space-between" },
  sheetTitle: { fontFamily: FONTS.heading, fontSize: 20, color: "#fff" },
  step: { flexDirection: "row", gap: 12, marginTop: 17 },
  number: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(114,232,246,.09)",
    borderWidth: 1,
    borderColor: "rgba(114,232,246,.18)",
  },
  numberText: { fontSize: 11, fontWeight: "900", color: "#72E8F6" },
  stepTitle: { fontFamily: FONTS.headingSemi, fontSize: 13.5, color: "#fff" },
  stepCopy: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: 2,
  },
  gotIt: { marginTop: 21 },
});
