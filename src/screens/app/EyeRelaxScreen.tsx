import { EyeScoreCard } from "@/components/eye/EyeScoreCard";
import {
  EyeRelaxIcon,
  eyeRelaxIconBg,
} from "@/components/eye/icons/EyeRelaxIcon";
import { recordLastFeature } from "@/components/home/ContinueJourney";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBreakdownCard } from "@/components/ui/ScoreBreakdownCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { EYE_GAMES, RECOVERY_SESSIONS, ROUTES } from "@/constants";
import { colors } from "@/constants/colors";
import type { EyeActivity } from "@/constants/eyeRelax";
import { spacing } from "@/constants/spacing";
import { useAuth } from "@/context/AuthContext";
import { useEyeBreakEnforcer } from "@/hooks/useEyeBreakEnforcer";
import { useEyeScore } from "@/hooks/useEyeScore";
import { useGameRecord } from "@/hooks/useGameRecord";
import { useEyeProgress } from "@/hooks/useEyeProgress";
import { useLastBreakTime } from "@/hooks/useLastBreakTime";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Eye,
  Timer,
  Zap,
  Check,
} from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

const EYE_ACCENT = "#22d3ee";

function ActivityCard({
  id,
  title,
  subtitle,
  onPress,
  badge,
  badgeColor = EYE_ACCENT,
  isPrimary,
  pb,
  completed,
}: {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
  badgeColor?: string;
  isPrimary?: boolean;
  pb?: string | null;
  completed?: boolean;
}) {
  const iconBg = eyeRelaxIconBg(id);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard
        simple
        noPadding
        style={[
          styles.activityCard,
          { borderColor: isPrimary ? "#F59E0B55" : EYE_ACCENT + "22" },
          isPrimary && styles.activityCardGold,
        ]}
      >
        <LinearGradient
          colors={
            isPrimary
              ? ["#F59E0B0E", "transparent"]
              : [EYE_ACCENT + "0E", "transparent"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.activityRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: iconBg,
                borderColor: "rgba(255,255,255,0.12)",
              },
            ]}
          >
            <EyeRelaxIcon id={id} size={26} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            {completed ? (
              <View style={styles.checkDot}>
                <Check size={14} color="#22c55e" strokeWidth={3} />
              </View>
            ) : badge ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: badgeColor + "1f",
                    borderColor: badgeColor + "40",
                  },
                ]}
              >
                <Text style={[styles.badgePillText, { color: badgeColor }]}>
                  {badge}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.arrowBtn,
                  {
                    backgroundColor: EYE_ACCENT + "18",
                    borderColor: EYE_ACCENT + "30",
                  },
                ]}
              >
                <ChevronRight size={17} color={EYE_ACCENT} strokeWidth={2.3} />
              </View>
            )}
            {pb ? <Text style={styles.pbText}>{pb}</Text> : null}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function EyeRelaxScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Record this feature for ContinueYourJourney on Home
  useEffect(() => {
    void recordLastFeature("eye-exercise");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    enabled: breakEnabled,
    loading: breakLoading,
    toggle: toggleBreak,
  } = useEyeBreakEnforcer(user?.uid);
  const eyeScore = useEyeScore(user?.uid);
  const hasAnySessions = eyeScore.hasAnySessions ?? false;
  const completedToday = eyeScore.completedToday ?? [];
  const { minutesAgo } = useLastBreakTime(user?.uid ?? undefined);
  const { streak: eyeStreak } = useEyeProgress(user?.uid);

  const { record: saccadeRecord } = useGameRecord(user?.uid, "saccade-sniper");
  const { record: focusRecord } = useGameRecord(user?.uid, "focus-sprint");

  function openActivity(item: EyeActivity) {
    if (item.id === "dichoptic-reaction") {
      router.push(ROUTES.appDichopticScreen as never);
      return;
    }
    if (item.kind === "game") {
      router.push(ROUTES.appEyeGame(item.id) as never);
    } else {
      router.push(ROUTES.appEyeExercise(item.id) as never);
    }
  }

  function getGamePB(id: string): string | null {
    if (id === "saccade-sniper" && saccadeRecord)
      return `PB ${saccadeRecord.value}ms`;
    if (id === "focus-sprint" && focusRecord) return `PB ${focusRecord.value}%`;
    return null;
  }

  return (
    <ScreenShell
      pillar="eyes"
      ambient={<AmbientBackground subtle />}
      contentStyle={{ paddingBottom: 120 }}
    >
      <ScreenTransition>
        <ScreenHeader
          title="Eye Training"
          subtitle="3 ways to care for your eyes"
        />

        {/* 1. Eye Score */}
        <EyeScoreCard
          result={eyeScore}
          loading={eyeScore.loading}
          hasAnySessions={hasAnySessions}
          streak={eyeStreak}
        />
        {!eyeScore.loading && hasAnySessions && (
          <ScoreBreakdownCard
            title="WHY THIS SCORE?"
            score={eyeScore.score}
            theme={eyeScore.theme}
            breakdown={eyeScore.breakdown}
            hideScoreHeader
          />
        )}

        {/* Hero card — full card for new users, compact banner for returning users */}
        {!eyeScore.loading && !hasAnySessions && (
          <GlassCard style={styles.heroCard}>
            <LinearGradient
              colors={[EYE_ACCENT + "12", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroIconWrap}>
                <Eye size={28} color={EYE_ACCENT} strokeWidth={2} />
              </View>
              <Text style={styles.heroTitle}>Welcome to Eye Training</Text>
              <Text style={styles.heroSubtitle}>
                Reduce strain and build healthier screen habits with guided
                exercises.
              </Text>
              <TouchableOpacity
                style={styles.heroButton}
                activeOpacity={0.85}
                onPress={() => router.push(ROUTES.appCvsProtocol as never)}
              >
                <LinearGradient
                  colors={['#06B6D4', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Zap size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.heroButtonText}>Start First Exercise</Text>
                <ChevronRight size={16} color="#ffffff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
        {/* Returning users: compact welcome-back banner */}
        {!eyeScore.loading && hasAnySessions && (
          <TouchableOpacity
            style={styles.welcomeBackBanner}
            activeOpacity={0.8}
            onPress={() => router.push(ROUTES.appCvsProtocol as never)}
          >
            <Eye size={16} color={EYE_ACCENT} strokeWidth={2} />
            <Text style={styles.welcomeBackText}>Start your daily eye exercise</Text>
            <ChevronRight size={14} color={EYE_ACCENT} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* 2. Break Enforcer + Quick Break — merged into one card */}
        <GlassCard style={styles.breakCard}>
          <View style={styles.breakTopRow}>
            <View style={styles.enforcerInfo}>
              <Timer
                size={18}
                color={breakEnabled ? EYE_ACCENT : colors.text.secondary}
                strokeWidth={2}
              />
              <View style={styles.enforcerTextCol}>
                <Text style={styles.enforcerTitle}>
                  Break reminders: {breakEnabled ? "On" : "Off"}
                </Text>
                <Text style={styles.enforcerSub}>
                  Get nudges to rest your eyes
                </Text>
              </View>
            </View>
            <Switch
              value={breakEnabled}
              onValueChange={toggleBreak}
              disabled={breakLoading}
              trackColor={{
                false: '#252542',
                true: EYE_ACCENT,
              }}
              thumbColor={breakEnabled ? "#FFFFFF" : colors.text.secondary}
            />
          </View>
          <TouchableOpacity
            style={styles.quickBreakInline}
            onPress={() => router.push(ROUTES.appEyeBreak as never)}
            activeOpacity={0.75}
          >
            <Eye size={16} color={EYE_ACCENT} strokeWidth={2} />
            <Text style={styles.quickBreakInlineLabel}>
              Take a Quick Eye Break
            </Text>
            <ChevronRight size={14} color={EYE_ACCENT} strokeWidth={2.5} style={{ marginRight: 16 }} />
          </TouchableOpacity>
        </GlassCard>

        {/* 3. Break reminder chip */}
        {minutesAgo !== null && (
          <View
            style={[
              styles.breakChip,
              { borderColor: minutesAgo < 20 ? "#6ee7b766" : "#f59e0b66" },
            ]}
          >
            {minutesAgo < 20 ? (
              <CheckCircle size={12} color="#6ee7b7" strokeWidth={2.5} />
            ) : (
              <AlertCircle size={12} color="#f59e0b" strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.breakChipText,
                { color: minutesAgo < 20 ? "#6ee7b7" : "#f59e0b" },
              ]}
            >
              {minutesAgo < 20
                ? `Last eye break ${minutesAgo}m ago — eyes resting ✓`
                : `Last break ${minutesAgo}m ago — break due soon`}
            </Text>
          </View>
        )}

        {/* 4. Recovery Sessions */}
        <SectionLabel>RECOVERY SESSIONS</SectionLabel>
        {(() => {
          // Dynamic gold border: first uncompleted recovery session gets "Start Here".
          let goldAssigned = false;
          return RECOVERY_SESSIONS.map((s) => {
            const route =
              s.id === "comet-trace"
                ? ROUTES.appEyeGame("comet-trace")
                : ROUTES.appCvsProtocol;
            const isCompleted = completedToday.includes(s.id);
            const isPrimary = !isCompleted && !goldAssigned;
            if (isPrimary) goldAssigned = true;
            return (
              <ActivityCard
                key={s.id}
                id={s.id}
                title={s.title}
                subtitle={s.subtitle}
                onPress={() => router.push(route as never)}
                badge={isCompleted ? undefined : isPrimary ? "Start Here" : "Exercise"}
                badgeColor={isPrimary ? "#F59E0B" : EYE_ACCENT}
                isPrimary={isPrimary}
                completed={isCompleted}
              />
            );
          });
        })()}

        {/* 5. Eye Games */}
        <SectionLabel>EYE GAMES</SectionLabel>
        {(() => {
          // Gold border moves to first Eye Game only when ALL recovery sessions
          // are completed today (or user is brand-new with no sessions at all).
          const allRecoveryDone = hasAnySessions &&
            RECOVERY_SESSIONS.every(s => completedToday.includes(s.id));
          return EYE_GAMES.map((item, idx) => (
            <ActivityCard
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => openActivity(item)}
              badge={(allRecoveryDone && idx === 0) ? "Start Here" : "Game"}
              badgeColor={(allRecoveryDone && idx === 0) ? "#F59E0B" : "#A78BFA"}
              isPrimary={allRecoveryDone && idx === 0}
              pb={getGamePB(item.id)}
            />
          ));
        })()}
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* Hero Card */
  heroCard: {
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  heroContent: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: EYE_ACCENT + "18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: EYE_ACCENT + "30",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f6f8fc",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: "rgba(245,247,251,0.55)",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: spacing.sm,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    overflow: "hidden",
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  /* Welcome-back compact banner */
  welcomeBackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
    backgroundColor: EYE_ACCENT + "12",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: EYE_ACCENT + "30",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  welcomeBackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: EYE_ACCENT,
  },

  /* Merged Break Card */
  breakCard: {
    marginBottom: spacing.md,
  },
  breakTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  enforcerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  enforcerTextCol: {
    flex: 1,
  },
  enforcerTitle: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: "600",
  },
  enforcerSub: { fontSize: 11, color: colors.text.secondary, marginTop: 1 },
  quickBreakInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  quickBreakInlineLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: EYE_ACCENT,
  },

  /* Break Chip */
  breakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  breakChipText: { fontSize: 12, fontWeight: "600" },

  /* Activity Cards */
  activityCard: {
    marginBottom: 10,
    borderWidth: 1,
  },
  activityCardGold: {
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.18,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 74,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardInfo: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: {
    fontSize: 16,
    color: "#f6f8fc",
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  cardSub: { fontSize: 12.5, color: "rgba(245,247,251,0.5)" },
  cardMeta: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 36,
    justifyContent: "center",
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgePillText: { fontSize: 8.5, fontWeight: "800", letterSpacing: 0.6 },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  checkDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#22c55e22",
    borderWidth: 1.5,
    borderColor: "#22c55e44",
    alignItems: "center",
    justifyContent: "center",
  },
  pbText: { fontSize: 10, color: "#FFD700", fontWeight: "700" },
});
