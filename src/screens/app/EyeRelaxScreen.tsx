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
import {
  EYE_BREAK_INTERVAL_OPTIONS,
  type EyeBreakScheduleMode,
} from "@/services/eyeBreakReminderPreferences";
import { spacing } from "@/constants/spacing";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useEyeBreakEnforcer } from "@/hooks/useEyeBreakEnforcer";
import { useEyeBreakReminderSummary } from "@/hooks/useEyeBreakReminderSummary";
import { useEyeComfortSummary } from "@/hooks/useEyeComfortSummary";
import { useEyeProgress } from "@/hooks/useEyeProgress";
import { useEyeScore } from "@/hooks/useEyeScore";
import { useGameRecord } from "@/hooks/useGameRecord";
import { useEyeGameProgress } from "@/hooks/useEyeGameProgress";
import { getEyeWeeklyRecommendation } from "@/utils/eyeWeeklyRecommendation";
import { saveEyeSymptomRecord } from "@/services/eyeSymptomPersistence";
import {
  saveScreenHabitRecord,
  type ScreenSessionContext,
  type ScreenSessionMinutes,
} from "@/services/eyeScreenHabitPersistence";
import {
  getEyeSymptomGuidance,
  type EyeSymptomId,
} from "@/utils/eyeSymptomGuidance";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Eye,
  Gamepad2,
  Info,
  Lock,
  Monitor,
  Play,
  Timer,
  Trophy,
} from "lucide-react-native";
import { useEffect, useState } from "react";
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
const REMINDER_SCHEDULE_OPTIONS: {
  mode: EyeBreakScheduleMode;
  label: string;
}[] = [
  { mode: "anytime", label: "Anytime" },
  { mode: "weekdays", label: "Weekdays 9–5" },
  { mode: "daily", label: "Daily 9–5" },
  { mode: "custom", label: "Custom" },
];
const REMINDER_DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];
const START_HOURS = [7, 8, 9, 10, 12];
const END_HOURS = [16, 17, 18, 20, 22];
const EYE_SYMPTOM_OPTIONS: { id: EyeSymptomId; label: string }[] = [
  { id: "dryness", label: "Dry or burning" },
  { id: "tired", label: "Tired or sore" },
  { id: "headache", label: "Headache" },
  { id: "blurred", label: "Blurred vision" },
  { id: "double", label: "Double vision" },
  { id: "pain", label: "Eye pain" },
  { id: "sudden-change", label: "Sudden change" },
  { id: "after-injury", label: "After injury" },
];
const SCREEN_CONTEXTS: { id: ScreenSessionContext; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "study", label: "Study" },
  { id: "gaming", label: "Gaming" },
  { id: "reading", label: "Reading" },
  { id: "other", label: "Other" },
];
const SCREEN_DURATIONS: ScreenSessionMinutes[] = [20, 40, 60, 90];

function formatHour(hour: number): string {
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

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
    intervalMinutes,
    schedule: breakSchedule,
    permissionDenied,
    toggle: toggleBreak,
    changeInterval,
    changeScheduleMode,
    changeSchedule,
  } = useEyeBreakEnforcer(user?.uid);
  const eyeScore = useEyeScore(user?.uid);
  const hasAnySessions = eyeScore.hasAnySessions ?? false;
  const completedToday = eyeScore.completedToday ?? [];
  const { weekDots } = useEyeProgress(user?.uid);
  const { summary: comfortSummary, loading: comfortLoading } =
    useEyeComfortSummary(user?.uid);
  const { summary: reminderSummary, loading: reminderSummaryLoading } =
    useEyeBreakReminderSummary(user?.uid);
  const gameProgress = useEyeGameProgress(user?.uid);
  const [selectedSymptoms, setSelectedSymptoms] = useState<EyeSymptomId[]>([]);
  const [symptomGuidance, setSymptomGuidance] = useState<ReturnType<
    typeof getEyeSymptomGuidance
  > | null>(null);
  const [screenContext, setScreenContext] =
    useState<ScreenSessionContext>("work");
  const [screenMinutes, setScreenMinutes] =
    useState<ScreenSessionMinutes>(40);
  const [screenHabitSaved, setScreenHabitSaved] = useState(false);

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
        {breakEnabled && (
          <View style={styles.reminderOptions}>
            <Text style={styles.reminderOptionsLabel}>REMIND ME EVERY</Text>
            <View style={styles.reminderChips}>
              {EYE_BREAK_INTERVAL_OPTIONS.map((minutes) => {
                const selected = intervalMinutes === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    onPress={() => void changeInterval(minutes)}
                    activeOpacity={0.8}
                    style={[
                      styles.reminderChip,
                      selected && styles.reminderChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        selected && styles.reminderChipTextSelected,
                      ]}
                    >
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.reminderOptionsLabel}>ACTIVE SCHEDULE</Text>
            <View style={styles.reminderScheduleChips}>
              {REMINDER_SCHEDULE_OPTIONS.map(option => {
                const selected = breakSchedule.mode === option.mode;
                return (
                  <TouchableOpacity
                    key={option.mode}
                    onPress={() => void changeScheduleMode(option.mode)}
                    activeOpacity={0.8}
                    style={[
                      styles.reminderScheduleChip,
                      selected && styles.reminderChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        selected && styles.reminderChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {breakSchedule.mode === "custom" && (
              <View style={styles.customSchedule}>
                <Text style={styles.reminderOptionsLabel}>ACTIVE DAYS</Text>
                <View style={styles.reminderDayRow}>
                  {REMINDER_DAYS.map(day => {
                    const selected = breakSchedule.activeDays.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        onPress={() => {
                          const activeDays = selected
                            ? breakSchedule.activeDays.filter(value => value !== day.value)
                            : [...breakSchedule.activeDays, day.value];
                          if (activeDays.length > 0) {
                            void changeSchedule({ ...breakSchedule, activeDays });
                          }
                        }}
                        style={[
                          styles.reminderDayChip,
                          selected && styles.reminderChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.reminderChipText,
                            selected && styles.reminderChipTextSelected,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.reminderOptionsLabel}>START TIME</Text>
                <View style={styles.reminderScheduleChips}>
                  {START_HOURS.map(hour => (
                    <TouchableOpacity
                      key={hour}
                      onPress={() => void changeSchedule({
                        ...breakSchedule,
                        startHour: hour,
                        endHour: Math.max(breakSchedule.endHour, hour + 1),
                      })}
                      style={[
                        styles.reminderScheduleChip,
                        breakSchedule.startHour === hour && styles.reminderChipSelected,
                      ]}
                    >
                      <Text style={[
                        styles.reminderChipText,
                        breakSchedule.startHour === hour && styles.reminderChipTextSelected,
                      ]}>
                        {formatHour(hour)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.reminderOptionsLabel}>END TIME</Text>
                <View style={styles.reminderScheduleChips}>
                  {END_HOURS.filter(hour => hour > breakSchedule.startHour).map(hour => (
                    <TouchableOpacity
                      key={hour}
                      onPress={() => void changeSchedule({ ...breakSchedule, endHour: hour })}
                      style={[
                        styles.reminderScheduleChip,
                        breakSchedule.endHour === hour && styles.reminderChipSelected,
                      ]}
                    >
                      <Text style={[
                        styles.reminderChipText,
                        breakSchedule.endHour === hour && styles.reminderChipTextSelected,
                      ]}>
                        {formatHour(hour)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {breakSchedule.mode !== "anytime" && (
              <Text style={styles.reminderScheduleHint}>
                Reminders pause outside {formatHour(breakSchedule.startHour)}–
                {formatHour(breakSchedule.endHour)}
                {breakSchedule.mode === "weekdays" ? " and on weekends." : "."}
              </Text>
            )}
          </View>
        )}
        {permissionDenied && (
          <View style={styles.reminderError}>
            <AlertCircle size={15} color={STATUS_COLORS.warning} />
            <Text style={styles.reminderErrorText}>
              Notifications are disabled. Allow them in device settings to use
              automatic eye breaks.
            </Text>
          </View>
        )}
        {!reminderSummaryLoading && reminderSummary.interactions > 0 && (
          <View style={styles.reminderSummary}>
            <View style={styles.reminderSummaryTop}>
              <Text style={styles.reminderSummaryLabel}>7-DAY FOLLOW-THROUGH</Text>
              <Text style={styles.reminderSummaryRate}>
                {reminderSummary.completionRate ?? 0}%
              </Text>
            </View>
            <Text style={styles.reminderSummaryText}>
              {reminderSummary.completed} completed · {reminderSummary.snoozed}{" "}
              snoozed · {reminderSummary.abandoned} left early
            </Text>
          </View>
        )}

        <GlassCard style={styles.symptomCard} tint={SURFACE_TINT.card}>
          <View style={styles.symptomHeader}>
            <View>
              <Text style={styles.symptomEyebrow}>OPTIONAL CHECK-IN</Text>
              <Text style={styles.symptomTitle}>How do your eyes feel?</Text>
            </View>
            <Text style={styles.symptomPrivacy}>Stored privately</Text>
          </View>
          <View style={styles.symptomChips}>
            {EYE_SYMPTOM_OPTIONS.map(option => {
              const selected = selectedSymptoms.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => {
                    setSymptomGuidance(null);
                    setSelectedSymptoms(current =>
                      selected
                        ? current.filter(id => id !== option.id)
                        : [...current, option.id],
                    );
                  }}
                  style={[
                    styles.symptomChip,
                    selected && styles.symptomChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.symptomChipText,
                      selected && styles.symptomChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.symptomSave}
            onPress={() => {
              const guidance = getEyeSymptomGuidance(selectedSymptoms);
              setSymptomGuidance(guidance);
              void saveEyeSymptomRecord(user?.uid, selectedSymptoms);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.symptomSaveText}>
              {selectedSymptoms.length === 0 ? "Record feeling comfortable" : "Save check-in"}
            </Text>
          </TouchableOpacity>
          {symptomGuidance && (
            <View
              style={[
                styles.symptomGuidance,
                symptomGuidance.level === "urgent" && styles.symptomGuidanceUrgent,
              ]}
            >
              <AlertCircle
                size={15}
                color={
                  symptomGuidance.level === "urgent"
                    ? STATUS_COLORS.warning
                    : EYE_COLOR
                }
              />
              <Text style={styles.symptomGuidanceText}>
                {symptomGuidance.message}
              </Text>
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.screenHabitCard} tint={SURFACE_TINT.card}>
          <Text style={styles.symptomEyebrow}>SCREEN SESSION CHECK-IN</Text>
          <Text style={styles.symptomTitle}>What were you doing?</Text>
          <View style={styles.symptomChips}>
            {SCREEN_CONTEXTS.map(option => (
              <TouchableOpacity
                key={option.id}
                onPress={() => {
                  setScreenContext(option.id);
                  setScreenHabitSaved(false);
                }}
                style={[
                  styles.symptomChip,
                  screenContext === option.id && styles.symptomChipSelected,
                ]}
              >
                <Text style={[
                  styles.symptomChipText,
                  screenContext === option.id && styles.symptomChipTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.screenHabitPrompt}>Longest continuous screen block</Text>
          <View style={styles.symptomChips}>
            {SCREEN_DURATIONS.map(minutes => (
              <TouchableOpacity
                key={minutes}
                onPress={() => {
                  setScreenMinutes(minutes);
                  setScreenHabitSaved(false);
                }}
                style={[
                  styles.symptomChip,
                  screenMinutes === minutes && styles.symptomChipSelected,
                ]}
              >
                <Text style={[
                  styles.symptomChipText,
                  screenMinutes === minutes && styles.symptomChipTextSelected,
                ]}>
                  {minutes === 90 ? "90+ min" : `${minutes} min`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.symptomSave}
            onPress={() => {
              void saveScreenHabitRecord(user?.uid, {
                context: screenContext,
                continuousMinutes: screenMinutes,
              });
              setScreenHabitSaved(true);
            }}
          >
            <Text style={styles.symptomSaveText}>
              {screenHabitSaved ? "Saved ✓" : "Save screen session"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.screenHabitNote}>
            Manually reported; MindPulse does not read device-wide screen time.
          </Text>
        </GlassCard>

        <TouchableOpacity
          style={styles.companionCard}
          onPress={() => router.push(ROUTES.appEyeCompanion as never)}
          activeOpacity={0.8}
        >
          <View style={styles.companionIcon}>
            <Monitor size={18} color={EYE_COLOR} />
          </View>
          <View style={styles.companionCopy}>
            <Text style={styles.companionTitle}>Desktop Eye Companion</Text>
            <Text style={styles.companionSub}>
              Open a browser-friendly screen-session timer
            </Text>
          </View>
          <ArrowRight size={16} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* ── Recovery Sessions ─────────────────────────────────────── */}
        <SectionLabel>RECOVERY SESSIONS</SectionLabel>
        {(() => {
          const primaryRecoveryId = RECOVERY_SESSIONS.find(
            (session) => !completedToday.includes(session.id),
          )?.id;
          return RECOVERY_SESSIONS.map((s) => {
            const route =
              s.id === "comet-trace"
                ? ROUTES.appEyeGame("comet-trace")
                : ROUTES.appCvsProtocol;
            const isCompleted = completedToday.includes(s.id);
            const isPrimary = s.id === primaryRecoveryId;
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
        <GlassCard
          simple
          noPadding
          tint={SURFACE_TINT.card}
          style={styles.gameProgressCard}
        >
          <View style={styles.gameProgressInner}>
            <View style={styles.gameProgressIcon}>
              <Trophy size={19} color={PRO_GOLD} strokeWidth={2.2} />
            </View>
            <View style={styles.gameProgressInfo}>
              <View style={styles.gameProgressTop}>
                <Text style={styles.gameProgressTitle}>
                  {gameProgress.loading
                    ? "Loading game progress…"
                    : `${gameProgress.badge} Level ${gameProgress.level} · ${gameProgress.title}`}
                </Text>
                {!gameProgress.loading && (
                  <Text style={styles.gameProgressXp}>
                    {gameProgress.xpIntoLevel}/100 XP
                  </Text>
                )}
              </View>
              <ProgressBar
                progress={gameProgress.loading ? 0 : gameProgress.progress}
                fill={PRO_GOLD}
              />
              <Text style={styles.gameProgressSub}>
                {gameProgress.loading
                  ? " "
                  : gameProgress.roundsCompleted === 0
                    ? "Complete a game round to earn XP."
                    : gameProgress.nextMilestone
                      ? `${gameProgress.roundsCompleted} round${gameProgress.roundsCompleted === 1 ? "" : "s"} · Unlock ${gameProgress.nextMilestone.badge} ${gameProgress.nextMilestone.cosmetic} at level ${gameProgress.nextMilestone.level}`
                      : `${gameProgress.roundsCompleted} rounds completed · ${gameProgress.cosmetic} unlocked`}
              </Text>
            </View>
          </View>
        </GlassCard>
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

        <GlassCard style={styles.comfortInsightCard} tint={SURFACE_TINT.card}>
          <View style={styles.comfortInsightHeader}>
            <View style={styles.comfortInsightIcon}>
              <Info size={16} color={EYE_COLOR} strokeWidth={2.2} />
            </View>
            <View style={styles.comfortInsightHeading}>
              <Text style={styles.comfortInsightLabel}>7-DAY COMFORT CHECK</Text>
              <Text style={styles.comfortInsightTitle}>
                {comfortLoading
                  ? "Loading your check-ins…"
                  : comfortSummary.sessions === 0
                    ? "No check-ins yet"
                    : `${comfortSummary.sessions} Eye Reset${comfortSummary.sessions === 1 ? "" : "s"} recorded`}
              </Text>
            </View>
          </View>

          {!comfortLoading && comfortSummary.comparedSessions > 0 ? (
            <>
              <View style={styles.comfortStatsRow}>
                <View style={styles.comfortStat}>
                  <Text style={styles.comfortStatValue}>
                    {comfortSummary.improvedSessions}
                  </Text>
                  <Text style={styles.comfortStatLabel}>Felt better</Text>
                </View>
                <View style={styles.comfortStatDivider} />
                <View style={styles.comfortStat}>
                  <Text style={styles.comfortStatValue}>
                    {comfortSummary.sameSessions}
                  </Text>
                  <Text style={styles.comfortStatLabel}>No change</Text>
                </View>
                <View style={styles.comfortStatDivider} />
                <View style={styles.comfortStat}>
                  <Text
                    style={[
                      styles.comfortStatValue,
                      comfortSummary.worsenedSessions > 0 && {
                        color: STATUS_COLORS.warning,
                      },
                    ]}
                  >
                    {comfortSummary.worsenedSessions}
                  </Text>
                  <Text style={styles.comfortStatLabel}>Felt worse</Text>
                </View>
              </View>
              <Text style={styles.comfortInsightCopy}>
                {comfortSummary.improvedSessions >
                comfortSummary.worsenedSessions
                  ? "Your check-ins more often showed improved comfort after Eye Reset."
                  : comfortSummary.worsenedSessions > 0
                    ? "Some sessions ended with more discomfort. Stop activities that worsen symptoms and consider professional eye care if this persists."
                    : "Your check-ins show stable comfort so far. Keep tracking to discover a clearer pattern."}
              </Text>
            </>
          ) : !comfortLoading ? (
            <Text style={styles.comfortInsightCopy}>
              Complete optional before-and-after check-ins during Eye Reset to
              understand your comfort pattern.
            </Text>
          ) : null}
          {!comfortLoading && !reminderSummaryLoading && (
            <View style={styles.weeklyRecommendation}>
              <Text style={styles.weeklyRecommendationLabel}>ONE STEP FOR THIS WEEK</Text>
              <Text style={styles.weeklyRecommendationText}>
                {getEyeWeeklyRecommendation(comfortSummary, reminderSummary)}
              </Text>
            </View>
          )}
        </GlassCard>
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
    marginBottom: spacing.sm,
  },
  reminderLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },
  reminderOptions: {
    marginBottom: spacing.lg,
    paddingHorizontal: 2,
    gap: 8,
  },
  reminderOptionsLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  reminderChips: { flexDirection: "row", gap: 8 },
  reminderScheduleChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderChip: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  reminderChipSelected: {
    borderColor: REMINDER_COLOR + "88",
    backgroundColor: REMINDER_COLOR + "18",
  },
  reminderChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  reminderChipTextSelected: { color: REMINDER_COLOR },
  reminderScheduleChip: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  reminderScheduleHint: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.text.tertiary,
  },
  customSchedule: { gap: 8 },
  reminderDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
  },
  reminderDayChip: {
    flex: 1,
    minWidth: 34,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  reminderError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: STATUS_COLORS.warning + "10",
    borderWidth: 1,
    borderColor: STATUS_COLORS.warning + "35",
  },
  reminderErrorText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  reminderSummary: {
    marginBottom: spacing.lg,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: EYE_COLOR + "0C",
    borderWidth: 1,
    borderColor: EYE_COLOR + "24",
    gap: 4,
  },
  symptomCard: { marginBottom: spacing.lg },
  screenHabitCard: { marginBottom: spacing.lg, gap: spacing.sm },
  screenHabitPrompt: {
    marginTop: spacing.xs,
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  screenHabitNote: {
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: "center",
    color: colors.text.tertiary,
  },
  companionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: 13,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: EYE_COLOR + "28",
    backgroundColor: EYE_COLOR + "0A",
  },
  companionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "14",
  },
  companionCopy: { flex: 1, gap: 2 },
  companionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.text.primary,
  },
  companionSub: { fontSize: 10.5, color: colors.text.tertiary },
  symptomHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  symptomEyebrow: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
    color: EYE_COLOR,
  },
  symptomTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  symptomPrivacy: { fontSize: 9.5, color: colors.text.tertiary },
  symptomChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  symptomChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  symptomChipSelected: {
    borderColor: EYE_COLOR + "70",
    backgroundColor: EYE_COLOR + "14",
  },
  symptomChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  symptomChipTextSelected: { color: EYE_COLOR },
  symptomSave: {
    alignItems: "center",
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_COLOR + "18",
  },
  symptomSaveText: { fontSize: 11.5, fontWeight: "800", color: EYE_COLOR },
  symptomGuidance: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 11,
    backgroundColor: EYE_COLOR + "0C",
  },
  symptomGuidanceUrgent: {
    backgroundColor: STATUS_COLORS.warning + "10",
    borderWidth: 1,
    borderColor: STATUS_COLORS.warning + "35",
  },
  symptomGuidanceText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.text.secondary,
  },
  reminderSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderSummaryLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.15,
    color: colors.text.tertiary,
  },
  reminderSummaryRate: {
    fontSize: 15,
    fontWeight: "800",
    color: EYE_COLOR,
  },
  reminderSummaryText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.text.secondary,
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

  /* Persistent eye-game progression */
  gameProgressCard: { marginBottom: 10 },
  gameProgressInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  gameProgressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRO_GOLD + "14",
    borderWidth: 1,
    borderColor: PRO_GOLD + "35",
  },
  gameProgressInfo: { flex: 1, gap: 7 },
  gameProgressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gameProgressTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text.primary,
  },
  gameProgressXp: { fontSize: 11, fontWeight: "800", color: PRO_GOLD },
  gameProgressSub: {
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.text.tertiary,
  },

  /* Seven-day self-reported comfort insight */
  comfortInsightCard: { marginBottom: spacing.xl },
  weeklyRecommendation: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  weeklyRecommendationLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
    color: EYE_COLOR,
  },
  weeklyRecommendationText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.text.secondary,
  },
  comfortInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  comfortInsightIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "16",
    borderWidth: 1,
    borderColor: EYE_COLOR + "30",
  },
  comfortInsightHeading: { flex: 1, gap: 2 },
  comfortInsightLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: EYE_COLOR,
  },
  comfortInsightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  comfortStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  comfortStat: { flex: 1, alignItems: "center", gap: 3 },
  comfortStatValue: { fontSize: 20, fontWeight: "800", color: EYE_COLOR },
  comfortStatLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  comfortStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  comfortInsightCopy: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text.secondary,
  },
});
