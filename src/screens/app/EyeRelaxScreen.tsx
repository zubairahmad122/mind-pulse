import { EyeRelaxIcon } from "@/components/eye/icons/EyeRelaxIcon";
import { recordLastFeature } from "@/components/home/ContinueJourney";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { HeroCard } from "@/components/ui/HeroCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QuickActionTile } from "@/components/ui/QuickActionTile";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WeeklyProgressRow } from "@/components/ui/WeeklyProgressRow";
import { EYE_GAMES, RECOVERY_SESSIONS, ROUTES } from "@/constants";
import { colors } from "@/constants/colors";
import {
  FONTS,
  PILLAR_COLORS,
  PRO_GOLD,
  RADIUS,
  SHADOWS,
  STATUS_COLORS,
  SURFACE_TINT,
  TYPOGRAPHY,
} from "@/constants/designSystem";
import { ENTITLEMENTS } from "@/constants/entitlements";
import type { EyeActivity } from "@/constants/eyeRelax";
import { spacing } from "@/constants/spacing";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useEyeBreakEnforcer } from "@/hooks/useEyeBreakEnforcer";
import { useEyeProgress } from "@/hooks/useEyeProgress";
import { useEyeScore } from "@/hooks/useEyeScore";
import { useGameRecord } from "@/hooks/useGameRecord";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Eye,
  Gamepad2,
  Lock,
  Play,
  Timer,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// One accent for the whole screen (spec: "only one accent color per
// screen") — cyan everywhere: quick actions, session card icons, start
// pills, weekly progress. Reminder toggle keeps its own color since it's a
// settings affordance, not a pillar/category identity.
const EYE_COLOR = PILLAR_COLORS.eye;
const REMINDER_COLOR = PILLAR_COLORS.challenge;

/** Score bands the bar is divided into — same thresholds already used for
 * the bar's segment marks, reused here to compute a real "next milestone". */
const MILESTONES = [25, 50, 75, 100];

function ActivityCard({
  id,
  title,
  subtitle,
  onPress,
  meta,
  isPrimary,
  pb,
  completed,
  locked,
}: {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  meta?: string;
  isPrimary?: boolean;
  pb?: string | null;
  completed?: boolean;
  locked?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard
        simple
        noPadding
        tint={SURFACE_TINT.card}
        style={[
          styles.activityCard,
          { borderColor: EYE_COLOR + (isPrimary ? "55" : "22") },
          isPrimary && styles.activityCardHighlight,
        ]}
      >
        <LinearGradient
          colors={[EYE_COLOR + "0E", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.activityRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: EYE_COLOR + "1F",
                borderColor: EYE_COLOR + "28",
              },
            ]}
          >
            <EyeRelaxIcon id={id} size={26} color={EYE_COLOR} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.cardSubRow}>
              <Text style={styles.cardSub} numberOfLines={1}>
                {subtitle}
              </Text>
              {meta && (
                <>
                  <View style={styles.metaDot} />
                  <Text style={styles.cardMetaText}>{meta}</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.cardMeta}>
            {locked ? (
              <View
                style={[
                  styles.statePill,
                  {
                    backgroundColor: PRO_GOLD + "1F",
                    borderColor: PRO_GOLD + "55",
                  },
                ]}
              >
                <Lock size={11} color={PRO_GOLD} strokeWidth={2.3} />
                <Text style={[styles.statePillText, { color: PRO_GOLD }]}>
                  Pro
                </Text>
              </View>
            ) : completed ? (
              <View style={styles.statePill}>
                <Check
                  size={12}
                  color={STATUS_COLORS.success}
                  strokeWidth={3}
                />
                <Text
                  style={[
                    styles.statePillText,
                    { color: STATUS_COLORS.success },
                  ]}
                >
                  Done
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.statePill,
                  {
                    backgroundColor: "rgba(0,224,255,0.12)",
                    borderColor: "rgba(0,224,255,0.35)",
                  },
                ]}
              >
                <Play size={11} color={EYE_COLOR} fill={EYE_COLOR} />
                <Text style={[styles.statePillText, { color: EYE_COLOR }]}>
                  {isPrimary ? "Start Here" : "Start"}
                </Text>
              </View>
            )}
            {!locked && pb ? <Text style={styles.pbText}>{pb}</Text> : null}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function EyeRelaxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  // Record this feature for ContinueYourJourney on Home
  useEffect(() => {
    void recordLastFeature("eye-exercise");
  }, []);

  const {
    enabled: breakEnabled,
    loading: breakLoading,
    toggle: toggleBreak,
  } = useEyeBreakEnforcer(user?.uid);
  const eyeScore = useEyeScore(user?.uid);
  const hasAnySessions = eyeScore.hasAnySessions ?? false;
  const completedToday = eyeScore.completedToday ?? [];
  const { weekDots } = useEyeProgress(user?.uid);

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
      return `🏆 PB ${saccadeRecord.value}ms`;
    if (id === "focus-sprint" && focusRecord)
      return `🏆 PB ${focusRecord.value}%`;
    return null;
  }

  const nextMilestone = MILESTONES.find((m) => m > eyeScore.score) ?? null;
  const heroMessage = !hasAnySessions
    ? "Complete one activity to start your comfort and habits score."
    : nextMilestone
      ? `${nextMilestone - eyeScore.score} points from your next milestone.`
      : "Great consistency — you've completed today's eye-care habits.";

  // "Today's Goal" — built straight from the same breakdown that computes
  // the score, so the checklist and the number always agree. `reminders` is
  // a settings toggle, not a daily action, so it's excluded from the list.
  const goalItems = eyeScore.breakdown.filter((b) => b.key !== "reminders");
  const remainingReward = goalItems
    .filter((b) => !b.positive)
    .reduce((sum, b) => sum + b.maxPoints, 0);

  const firstGame = EYE_GAMES[0];
  const daysActiveThisWeek = weekDots.filter(Boolean).length;

  return (
    <ScreenShell pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader
          title="Eye Comfort"
          subtitle="Breaks, recovery, and visual activities"
        />

        {/* ── Hero — one card, one action, same shape as Home's Today's Journey ── */}
        <HeroCard style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroLabel}>TODAY&apos;S EYE JOURNEY</Text>
              <View style={styles.heroScoreRow}>
                <Eye size={14} color={EYE_COLOR} strokeWidth={2.2} />
                <Text style={styles.heroScore}>
                  {eyeScore.loading ? "–" : eyeScore.score}
                  <Text style={styles.heroScoreMax}>/100</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.heroMessage}>
              {eyeScore.loading ? "Loading today’s score…" : heroMessage}
            </Text>

            <ProgressBar
              progress={Math.max(eyeScore.score / 100, 0.04)}
              fill={EYE_COLOR}
              style={styles.trackGlow}
            />

            <View style={{ marginTop: spacing.md }}>
              <GradientCTA
                label={hasAnySessions ? "Continue Eye Care" : "Start Eye Reset"}
                icon={
                  <ArrowRight size={17} color="#03212C" strokeWidth={2.5} />
                }
                textColor="#03212C"
                onPress={() => router.push(ROUTES.appCvsProtocol as never)}
              />
            </View>
          </View>
        </HeroCard>

        {/* ── Today's Goal — the same score breakdown, framed as actions ── */}
        {!eyeScore.loading && goalItems.length > 0 && (
          <GlassCard noPadding style={styles.goalCard} tint={SURFACE_TINT.card}>
            <View style={styles.goalInner}>
              <Text style={styles.goalLabel}>TODAY&apos;S GOAL</Text>
              {goalItems.map((g) => (
                <View key={g.key} style={styles.goalRow}>
                  {g.positive ? (
                    <CheckCircle2
                      size={18}
                      color={STATUS_COLORS.success}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <View style={styles.goalCheckboxEmpty} />
                  )}
                  <Text
                    style={[
                      styles.goalRowText,
                      g.positive && styles.goalRowTextDone,
                    ]}
                    numberOfLines={1}
                  >
                    {g.label}
                  </Text>
                  {!g.positive && (
                    <Text style={styles.goalPoints}>+{g.maxPoints}</Text>
                  )}
                </View>
              ))}
              {remainingReward > 0 && (
                <View style={styles.goalRewardRow}>
                  <Text style={styles.goalRewardText}>
                    Reward: +{remainingReward} habit points
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        )}

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <SectionLabel first>QUICK ACTIONS</SectionLabel>
        <View style={styles.quickActionsRow}>
          <QuickActionTile
            label="Exercise"
            accent={EYE_COLOR}
            icon={Eye}
            onPress={() => router.push(ROUTES.appCvsProtocol as never)}
          />
          <QuickActionTile
            label="Break"
            accent={EYE_COLOR}
            icon={Timer}
            onPress={() => router.push(ROUTES.appEyeBreak as never)}
          />
          <QuickActionTile
            label="Games"
            accent={EYE_COLOR}
            icon={Gamepad2}
            onPress={() =>
              router.push(ROUTES.appEyeGame(firstGame.id) as never)
            }
          />
        </View>

        {/* Compact reminder toggle — no longer its own full card */}
        <View style={styles.reminderRow}>
          <Bell
            size={16}
            color={breakEnabled ? REMINDER_COLOR : colors.text.tertiary}
            strokeWidth={2}
          />
          <Text style={styles.reminderLabel}>Break Reminder</Text>
          <Switch
            value={breakEnabled}
            onValueChange={toggleBreak}
            disabled={breakLoading}
            trackColor={{ false: "#252542", true: REMINDER_COLOR }}
            thumbColor={breakEnabled ? "#FFFFFF" : colors.text.secondary}
          />
        </View>

        {/* ── Recovery Sessions ─────────────────────────────────────── */}
        <SectionLabel>RECOVERY SESSIONS</SectionLabel>
        {(() => {
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
                isPrimary={isPrimary}
                completed={isCompleted}
              />
            );
          });
        })()}

        {/* ── Eye Games ─────────────────────────────────────────────── */}
        <SectionLabel>EYE GAMES</SectionLabel>
        {(() => {
          // Gold border moves to first Eye Game only when ALL recovery sessions
          // are completed today (or user is brand-new with no sessions at all).
          const allRecoveryDone =
            hasAnySessions &&
            RECOVERY_SESSIONS.every((s) => completedToday.includes(s.id));
          return EYE_GAMES.map((item, idx) => {
            const locked =
              !isPremium &&
              !!item.featureId &&
              ENTITLEMENTS[item.featureId] === "pro";
            return (
              <ActivityCard
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={item.subtitle}
                meta={`${item.durationSeconds} sec`}
                onPress={() => openActivity(item)}
                isPrimary={!locked && allRecoveryDone && idx === 0}
                pb={getGamePB(item.id)}
                locked={locked}
              />
            );
          });
        })()}

        {/* ── Weekly Progress — real days-active count, shared component ── */}
        <SectionLabel>WEEKLY PROGRESS</SectionLabel>
        <View style={{ marginBottom: spacing.md }}>
          <WeeklyProgressRow
            icon={<Eye size={13} color={EYE_COLOR} strokeWidth={2.4} />}
            label="Weekly Eye Care"
            value={`${daysActiveThisWeek}/7 days`}
            percent={(daysActiveThisWeek / 7) * 100}
            accentColor={EYE_COLOR}
            onPress={() => router.push(ROUTES.appReport as never)}
          />
        </View>
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* Hero card */
  heroCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  trackGlow: {
    marginTop: 8,
  },
  heroInner: {
    padding: 20,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: "rgba(255,255,255,0.5)",
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroScore: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: EYE_COLOR,
  },
  heroScoreMax: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  heroMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.primary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  /* Today's Goal */
  goalCard: {
    marginBottom: spacing.lg,
    borderRadius: RADIUS.card,
    ...SHADOWS.medium,
  },
  goalInner: {
    padding: 18,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.42)",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  goalCheckboxEmpty: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  goalRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  goalRowTextDone: {
    color: colors.text.secondary,
    textDecorationLine: "line-through",
  },
  goalPoints: {
    fontSize: 12,
    fontWeight: "800",
    color: STATUS_COLORS.success,
  },
  goalRewardRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  goalRewardText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "rgba(251,191,36,0.9)",
  },

  /* Quick Actions */
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },

  /* Compact reminder row */
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.button,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: spacing.lg,
  },
  reminderLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },

  /* Activity Cards */
  activityCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: RADIUS.card,
  },
  activityCardHighlight: {
    shadowColor: EYE_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.25,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingLeft: 14,
    paddingRight: 18,
    minHeight: 74,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardInfo: { flex: 1, gap: 4, minWidth: 0, marginRight: 8 },
  cardTitle: {
    fontSize: TYPOGRAPHY.cardTitle.fontSize,
    color: "#f6f8fc",
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  cardSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  cardSub: { fontSize: 12.5, color: "rgba(245,247,251,0.5)", flexShrink: 1 },
  cardMetaText: {
    fontSize: 12,
    color: "rgba(245,247,251,0.4)",
    fontWeight: "600",
    flexShrink: 0,
  },
  metaDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    flexShrink: 0,
    backgroundColor: "rgba(245,247,251,0.4)",
  },
  cardMeta: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
    justifyContent: "center",
  },
  statePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    backgroundColor: "rgba(50,213,131,0.10)",
    borderColor: "rgba(50,213,131,0.28)",
  },
  statePillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0,
  },
  pbText: { fontSize: 11.5, color: PRO_GOLD, fontWeight: "700", marginTop: 4 },
});
