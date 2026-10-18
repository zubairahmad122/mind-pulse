import { useDailyActivityProgress } from "@/hooks/useActivity";
import { CompanionActivitySheet } from "@/components/eye/CompanionActivitySheet";
import { CompanionSettingsSheet } from "@/components/eye/CompanionSettingsSheet";
import { EyeCheckinSheet, type CheckinMode } from "@/components/eye/EyeCheckinSheet";
import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { HeroCard } from "@/components/ui/HeroCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StaggerItem } from "@/components/ui/StaggerItem";
import { ROUTES } from "@/constants";
import {
  EYE_BREAK_ACTIVITY,
  formatActivityDuration,
  getEyeActivity,
  getRecoverySession,
} from "@/constants/eyeRelax";
import { colors } from "@/constants/colors";
import {
  FONTS,
  PILLAR_COLORS,
  RADIUS,
  STATUS_COLORS,
  SURFACE_TINT,
  TYPOGRAPHY,
} from "@/constants/designSystem";
import {} from "@/services/eyeBreakReminderPreferences";
import {
  companionBreakLabel,
  COMPANION_BREAK_OPTIONS,
  COMPANION_INTERVAL_PRESETS,
  CUSTOM_MAX_MINUTES,
  CUSTOM_MIN_MINUTES,
  type DesktopCompanionPrefs,
} from "@/services/desktopCompanion";
import { spacing } from "@/constants/spacing";
import { useAuth } from "@/context/AuthContext";
import { useDesktopCompanion } from "@/hooks/useDesktopCompanion";
import { useEyeBreakEnforcer } from "@/hooks/useEyeBreakEnforcer";
import { useEyeProgress } from "@/hooks/useEyeProgress";
import { useEyeScore } from "@/hooks/useEyeScore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Eye,
  Flame,
  Focus,
  Minus,
  Monitor,
  Pause,
  Play,
  Plus,
  Settings,
  Timer,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// One accent for the whole screen — cyan everywhere.
const EYE_COLOR = PILLAR_COLORS.eye;
const REMINDER_COLOR = PILLAR_COLORS.challenge;

/** The three daily activities that make up "Today: X/3". */
const DAILY_ACTIVITIES = 3;

/** Monday-start day labels for the weekly activity chart — matches `weekDots`. */
const WEEK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDurationMinutes(totalSeconds: number): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
}

/** A tiny always-on decorative pulse for the Visual Flow card — deliberately
 * NOT the full exercise engine (no tick loop, no haptics), just a cheap
 * UI-thread opacity/scale breathing animation. */
function FlowPreviewDot() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(0, { duration: 1400 }),
      ),
      -1,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.5,
    transform: [{ scale: 1 + pulse.value * 0.2 }],
  }));

  return (
    <View style={styles.flowPreviewWrap}>
      <View style={styles.flowPreviewRing} />
      <Animated.View style={[styles.flowPreviewCore, dotStyle]} />
    </View>
  );
}

function QuickActionCard({
  label,
  icon: Icon,
  accent,
  onPress,
}: {
  label: string;
  icon: typeof Eye;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.qaCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[accent + "0F", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.qaIcon,
          { backgroundColor: accent + "16", borderColor: accent + "2E" },
        ]}
      >
        <Icon size={20} color={accent} strokeWidth={1.9} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Compact 7-day activity chart — real data from `weekDots` (has an eye
 * session been recorded that day). No fake values: an empty week (or the
 * no-data state) renders every bar at the same muted, minimal height.
 */
function WeeklyActivityChart({
  weekDots,
  todayIndex,
  empty,
}: {
  weekDots: boolean[];
  todayIndex: number;
  empty?: boolean;
}) {
  return (
    <View>
      <Text style={styles.weekChartEyebrow}>7-DAY ACTIVITY</Text>
      <View style={styles.weekChartRow}>
        {WEEK_DAY_LABELS.map((label, i) => {
          const done = !empty && weekDots[i];
          const isToday = i === todayIndex;
          return (
            <View key={label} style={styles.weekChartCol}>
              <View style={styles.weekChartTrack}>
                <View
                  style={[
                    styles.weekChartBar,
                    {
                      height: done ? "100%" : "20%",
                      backgroundColor: !done
                        ? "rgba(255,255,255,0.08)"
                        : isToday
                          ? EYE_COLOR
                          : "rgba(123,92,255,0.55)",
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.weekChartLabel,
                  isToday && styles.weekChartLabelToday,
                ]}
              >
                {isToday ? "Today" : label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Compact Desktop Companion card — collapsed by default.
 * Collapsed: icon, title, status, description, interval/break summary, reminder toggle, CTA.
 * Expanded: full controls, How it works, Start Session.
 */
function DesktopCompanionCard({
  prefs,
  active,
  paused,
  elapsedSeconds,
  nextBreakInSeconds,
  intervalMinutes,
  notificationDenied,
  lastSavedLabel,
  expanded,
  breakEnabled,
  breakLoading,
  onToggleBreak,
  onToggleExpand,
  onOpenSettings,
  onSelectInterval,
  onToggleCustom,
  onChangeCustomMinutes,
  onSelectBreak,
  onToggleRepeat,
  onStart,
  onTakeBreak,
  onPause,
  onResume,
  onEnd,
}: {
  prefs: DesktopCompanionPrefs;
  active: boolean;
  paused: boolean;
  elapsedSeconds: number;
  nextBreakInSeconds: number;
  intervalMinutes: number;
  notificationDenied: boolean;
  lastSavedLabel: string | null;
  expanded: boolean;
  breakEnabled: boolean;
  breakLoading: boolean;
  onToggleBreak: () => void;
  onToggleExpand: () => void;
  onOpenSettings: () => void;
  onSelectInterval: (minutes: number) => void;
  onToggleCustom: () => void;
  onChangeCustomMinutes: (minutes: number) => void;
  onSelectBreak: (seconds: number) => void;
  onToggleRepeat: (value: boolean) => void;
  onStart: () => void;
  onTakeBreak: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  const cycleProgress =
    (elapsedSeconds % (intervalMinutes * 60)) / (intervalMinutes * 60);

  // Get selected interval label
  const intervalLabel = prefs.custom
    ? `${prefs.customMinutes} min`
    : `${prefs.intervalMinutes} min`;

  // Get selected break label
  const breakLabel = companionBreakLabel(prefs.breakSeconds);

  return (
    <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.companionHero}>
      <LinearGradient
        colors={[EYE_COLOR + (active ? "14" : "08"), "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.companionHeroInner}>
        {/* Header row — icon + title + status pill + settings */}
        <View style={styles.companionHeaderRow}>
          <View style={styles.companionHeroIcon}>
            <Monitor size={19} color={EYE_COLOR} strokeWidth={1.8} />
          </View>
          <Text style={styles.companionHeroTitle} numberOfLines={1}>
            {active ? "Desktop Session" : "Desktop Eye Companion"}
          </Text>
          <View style={styles.companionStatusPill}>
            <Circle
              size={7}
              color={
                active
                  ? paused
                    ? STATUS_COLORS.warning
                    : EYE_COLOR
                  : colors.text.tertiary
              }
              fill={
                active
                  ? paused
                    ? STATUS_COLORS.warning
                    : EYE_COLOR
                  : colors.text.tertiary
              }
              strokeWidth={0}
            />
            <Text style={styles.companionStatusText}>
              {active ? (paused ? "Paused" : "Active") : "Idle"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.companionGear}
            onPress={onOpenSettings}
            activeOpacity={0.7}
            hitSlop={10}
          >
            <Settings size={16} color="rgba(255,255,255,0.5)" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={styles.companionHeroBenefit} numberOfLines={1}>
          {active
            ? `Reminder every ${intervalMinutes} minutes`
            : "Break reminders while you work on your computer."}
        </Text>

        {/* Collapsed state — compact summary + reminder toggle + CTA */}
        {!active && !expanded && (
          <>
            {/* Summary row — interval + break + Set Up pill */}
            <View style={styles.companionSummaryRow}>
              <View style={styles.companionSummaryItem}>
                <Text style={styles.companionSummaryLabel}>INTERVAL</Text>
                <Text style={styles.companionSummaryValue}>{intervalLabel}</Text>
              </View>
              <View style={styles.companionSummaryDivider} />
              <View style={styles.companionSummaryItem}>
                <Text style={styles.companionSummaryLabel}>BREAK</Text>
                <Text style={styles.companionSummaryValue}>{breakLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.companionSetUpPill}
                onPress={onToggleExpand}
                activeOpacity={0.8}
              >
                <Text style={styles.companionSetUpPillText}>Set Up</Text>
                <ChevronDown size={12} color={EYE_COLOR} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Reminder toggle */}
            <View style={styles.companionReminderRow}>
              <Bell
                size={15}
                color={breakEnabled ? REMINDER_COLOR : colors.text.tertiary}
                strokeWidth={2}
              />
              <Text style={styles.companionReminderLabel}>Break reminders</Text>
              <Switch
                value={breakEnabled}
                onValueChange={onToggleBreak}
                disabled={breakLoading}
                trackColor={{ false: "#2A2460", true: REMINDER_COLOR }}
                thumbColor={breakEnabled ? "#FFFFFF" : colors.text.secondary}
              />
            </View>

            {notificationDenied && (
              <View style={styles.companionNotifWarn}>
                <AlertCircle size={13} color={STATUS_COLORS.warning} />
                <Text style={styles.companionNotifWarnText}>
                  Notifications are off — the session runs, but breaks won&apos;t
                  be announced.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Active session stats */}
        {active && (
          <>
            <View style={styles.companionStatsRow}>
              <View style={styles.companionStat}>
                <Text style={styles.companionStatValue}>
                  {formatDurationMinutes(elapsedSeconds)}
                </Text>
                <Text style={styles.companionStatLabel}>Working for</Text>
              </View>
              <View style={styles.companionStatDivider} />
              <View style={styles.companionStat}>
                <Text style={styles.companionStatValue}>
                  in {Math.max(1, Math.ceil(nextBreakInSeconds / 60))} min
                </Text>
                <Text style={styles.companionStatLabel}>Next break</Text>
              </View>
            </View>
            <ProgressBar
              progress={Math.max(cycleProgress, 0.04)}
              fill={EYE_COLOR}
              style={styles.companionCycleBar}
            />
            <View style={styles.companionActionsRow}>
              <View style={styles.companionTakeBreakWrap}>
                <GradientCTA
                  label="Take Break Now"
                  icon={<Eye size={15} color="#03212C" strokeWidth={2.4} />}
                  textColor="#03212C"
                  compact
                  height={48}
                  onPress={onTakeBreak}
                />
              </View>
              <TouchableOpacity
                style={styles.companionPauseBtn}
                onPress={paused ? onResume : onPause}
                activeOpacity={0.8}
                hitSlop={8}
              >
                {paused ? (
                  <Play size={15} color={EYE_COLOR} fill={EYE_COLOR} />
                ) : (
                  <Pause size={15} color={EYE_COLOR} fill={EYE_COLOR} />
                )}
                <Text style={styles.companionPauseText}>
                  {paused ? "Resume" : "Pause"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.companionEndFull}
              onPress={onEnd}
              activeOpacity={0.8}
              hitSlop={8}
            >
              <Text style={styles.companionEndFullText}>End Session</Text>
            </TouchableOpacity>
            {notificationDenied && (
              <View style={styles.companionNotifWarn}>
                <AlertCircle size={13} color={STATUS_COLORS.warning} />
                <Text style={styles.companionNotifWarnText}>
                  Notifications are off — breaks won&apos;t be announced.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Expanded state — full controls */}
        {expanded && !active && (
          <>
            {/* Reminder toggle */}
            <View style={styles.companionReminderRow}>
              <Bell
                size={15}
                color={breakEnabled ? REMINDER_COLOR : colors.text.tertiary}
                strokeWidth={2}
              />
              <Text style={styles.companionReminderLabel}>Break reminders</Text>
              <Switch
                value={breakEnabled}
                onValueChange={onToggleBreak}
                disabled={breakLoading}
                trackColor={{ false: "#2A2460", true: REMINDER_COLOR }}
                thumbColor={breakEnabled ? "#FFFFFF" : colors.text.secondary}
              />
            </View>

            {/* Interval controls */}
            <Text style={styles.companionConfigLabel}>REMINDER INTERVAL</Text>
            <View style={styles.companionChips}>
              {COMPANION_INTERVAL_PRESETS.map(minutes => {
                const selected =
                  !prefs.custom && prefs.intervalMinutes === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    onPress={() => onSelectInterval(minutes)}
                    activeOpacity={0.8}
                    style={[
                      styles.companionChip,
                      styles.companionChipThird,
                      selected && styles.companionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companionChipText,
                        selected && styles.companionChipTextSelected,
                      ]}
                    >
                      {minutes} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={onToggleCustom}
                activeOpacity={0.8}
                style={[
                  styles.companionChip,
                  styles.companionChipThird,
                  prefs.custom && styles.companionChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.companionChipText,
                    prefs.custom && styles.companionChipTextSelected,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {prefs.custom && (
              <View style={styles.companionCustomBlock}>
                <Text style={styles.companionConfigLabel}>REMIND ME EVERY</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() =>
                      onChangeCustomMinutes(
                        Math.max(CUSTOM_MIN_MINUTES, prefs.customMinutes - 5),
                      )
                    }
                    disabled={prefs.customMinutes <= CUSTOM_MIN_MINUTES}
                    activeOpacity={0.7}
                  >
                    <Minus
                      size={16}
                      color={
                        prefs.customMinutes <= CUSTOM_MIN_MINUTES
                          ? "rgba(255,255,255,0.25)"
                          : EYE_COLOR
                      }
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>
                    {prefs.customMinutes} minutes
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() =>
                      onChangeCustomMinutes(
                        Math.min(CUSTOM_MAX_MINUTES, prefs.customMinutes + 5),
                      )
                    }
                    disabled={prefs.customMinutes >= CUSTOM_MAX_MINUTES}
                    activeOpacity={0.7}
                  >
                    <Plus
                      size={16}
                      color={
                        prefs.customMinutes >= CUSTOM_MAX_MINUTES
                          ? "rgba(255,255,255,0.25)"
                          : EYE_COLOR
                      }
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.repeatRow}>
                  <Text style={styles.repeatLabel}>Repeat reminders</Text>
                  <Switch
                    value={prefs.repeatOn}
                    onValueChange={onToggleRepeat}
                    trackColor={{ false: "#2A2460", true: EYE_COLOR }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            )}

            {/* Break duration controls */}
            <Text style={styles.companionConfigLabel}>BREAK DURATION</Text>
            <View style={styles.companionChips}>
              {COMPANION_BREAK_OPTIONS.map(seconds => {
                const selected = prefs.breakSeconds === seconds;
                return (
                  <TouchableOpacity
                    key={seconds}
                    onPress={() => onSelectBreak(seconds)}
                    activeOpacity={0.8}
                    style={[
                      styles.companionChip,
                      selected && styles.companionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.companionChipText,
                        selected && styles.companionChipTextSelected,
                      ]}
                    >
                      {companionBreakLabel(seconds)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* How it works */}
            <View style={styles.companionHowSteps}>
              <View style={styles.companionHowStep}>
                <View style={styles.companionHowStepNum}>
                  <Text style={styles.companionHowStepNumText}>1</Text>
                </View>
                <Text style={styles.companionHowStepText}>
                  Pick an activity, then start a session while you work.
                </Text>
              </View>
              <View style={styles.companionHowStep}>
                <View style={styles.companionHowStepNum}>
                  <Text style={styles.companionHowStepNumText}>2</Text>
                </View>
                <Text style={styles.companionHowStepText}>
                  You&apos;ll get a reminder when it&apos;s time for an eye break.
                </Text>
              </View>
              <View style={styles.companionHowStep}>
                <View style={styles.companionHowStepNum}>
                  <Text style={styles.companionHowStepNumText}>3</Text>
                </View>
                <Text style={styles.companionHowStepText}>
                  Take your break — your eyes reset and you keep going.
                </Text>
              </View>
            </View>

            {/* Start Session — compact primary button */}
            <View style={styles.companionExpandedCTARow}>
              <TouchableOpacity
                style={styles.companionStartBtn}
                onPress={onStart}
                activeOpacity={0.8}
              >
                <Play size={14} color="#03212C" fill="#03212C" />
                <Text style={styles.companionStartBtnText}>Start Session</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onToggleExpand}
                activeOpacity={0.7}
                style={styles.companionDoneBtn}
                hitSlop={8}
              >
                <Text style={styles.companionDoneText}>Done</Text>
                <ChevronUp size={14} color={EYE_COLOR} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {notificationDenied && (
              <View style={styles.companionNotifWarn}>
                <AlertCircle size={13} color={STATUS_COLORS.warning} />
                <Text style={styles.companionNotifWarnText}>
                  Notifications are off — the session runs, but breaks won&apos;t
                  be announced.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Last saved label */}
        {lastSavedLabel && (
          <View style={styles.companionSaved}>
            <Check size={13} color={STATUS_COLORS.success} strokeWidth={3} />
            <Text style={styles.companionSavedText}>{lastSavedLabel}</Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

export default function EyeRelaxScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const {
    enabled: breakEnabled,
    loading: breakLoading,
    toggle: toggleBreak,
  } = useEyeBreakEnforcer(user?.uid);
  const eyeScore = useEyeScore(user?.uid);
  const hasAnySessions = eyeScore.hasAnySessions ?? false;
  const { weekDots, streak: eyeStreak } = useEyeProgress(user?.uid);

  const [checkinMode, setCheckinMode] = useState<CheckinMode | null>(null);
  const [checkinSession, setCheckinSession] = useState(0);
  const openCheckin = (mode: CheckinMode) => {
    setCheckinMode(mode);
    setCheckinSession(s => s + 1);
  };

  // ── Desktop Eye Companion ──
  const companion = useDesktopCompanion(user?.uid);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [companionExpanded, setCompanionExpanded] = useState(false);

  // "Today: X/3 activities completed"
  const goalItems = eyeScore.breakdown.filter((b) => b.key !== "reminders");
  const activitiesDone = goalItems.filter((b) => b.positive).length;

  // Recommendation — avoid duplicating the hero's activity.
  // Hero always shows Eye Reset (cvs-protocol) or Focus Switch.
  // Recommended Recovery shows 20-20-20 Eye Break if not done today,
  // otherwise Focus Switch, otherwise "all caught up".
  // Eye Breaks and Focus Switch rounds live in the unified activity log —
  // `completedToday` (eye sessions) only ever holds Eye Reset.
  const { types: activityTypesToday } = useDailyActivityProgress();
  const eyeBreakDone = activityTypesToday.includes("EYE_BREAK_COMPLETED");
  const focusSwitchDone = activityTypesToday.includes("EYE_GAME_COMPLETED");
  const recommended = eyeBreakDone
    ? focusSwitchDone
      ? null
      : getEyeActivity("focus-sprint")
    : EYE_BREAK_ACTIVITY;
  const allCaughtUp = !recommended;

  const daysActiveThisWeek = weekDots.filter(Boolean).length;
  const todayDotIndex = (new Date().getDay() + 6) % 7; // Monday-start index, matching weekDots

  return (
    <ScreenShell pillar="eye" ambient={<AmbientBackground subtle />} bannerAd>
      <ScreenTransition>
        <ScreenHeader
          title="Eye Comfort"
          subtitle="Breaks, recovery, and visual activities"
        />

        {/* ── 1. Today's Eye Care — hero card ── */}
        <StaggerItem index={0}>
          <HeroCard style={styles.heroCard}>
            <View style={styles.heroInner}>
              <Text style={styles.heroLabel}>TODAY&apos;S EYE CARE</Text>

              <TouchableOpacity
                onPress={() =>
                  router.push(ROUTES.appCvsProtocol as never)
                }
                activeOpacity={0.85}
                style={styles.heroTitleRow}
              >
                <View
                  style={[
                    styles.heroIcon,
                    {
                      borderColor: EYE_COLOR + "40",
                      backgroundColor: EYE_COLOR + "18",
                    },
                  ]}
                >
                  <Eye size={17} color={EYE_COLOR} strokeWidth={2} />
                </View>
                <Text style={styles.heroTitleText} numberOfLines={1}>
                  Eye Reset
                </Text>
              </TouchableOpacity>

              <Text style={styles.heroMeta}>
                {formatActivityDuration(
                  getRecoverySession("cvs-protocol")!.durationSeconds,
                )}
              </Text>

              <Text style={styles.heroMessage} numberOfLines={2}>
                {allCaughtUp
                  ? "You've completed today's eye-care routine."
                  : "Guided relaxation for screen-weary eyes"}
              </Text>

              <View style={styles.heroActivitiesRow}>
                <Text style={styles.heroActivitiesText}>
                  {eyeScore.loading
                    ? "–"
                    : `${activitiesDone}/${DAILY_ACTIVITIES}`}{" "}
                  activities completed
                </Text>
              </View>
              <ProgressBar
                progress={
                  eyeScore.loading
                    ? 0
                    : Math.max(activitiesDone / DAILY_ACTIVITIES, 0.04)
                }
                fill={EYE_COLOR}
                style={styles.heroBar}
              />

              <View style={{ marginTop: spacing.sm }}>
                <GradientCTA
                  label={
                    hasAnySessions ? "Continue Eye Reset" : "Start Eye Reset"
                  }
                  icon={
                    <ArrowRight size={17} color="#03212C" strokeWidth={2.5} />
                  }
                  textColor="#03212C"
                  onPress={() =>
                    router.push(ROUTES.appCvsProtocol as never)
                  }
                />
              </View>
            </View>
          </HeroCard>
        </StaggerItem>

        {/* ── 2. Quick Actions ── */}
        <StaggerItem index={1}>
          <SectionLabel spacingTop={0}>QUICK ACTIONS</SectionLabel>
          <View style={styles.qaRow}>
            <QuickActionCard
              label="Take Break"
              icon={Timer}
              accent={EYE_COLOR}
              onPress={() => router.push(ROUTES.appEyeBreak as never)}
            />
            <QuickActionCard
              label="Exercise"
              icon={Eye}
              accent={EYE_COLOR}
              onPress={() => router.push(ROUTES.appEyeExercises as never)}
            />
            <QuickActionCard
              label="Focus Switch"
              icon={Focus}
              accent={PILLAR_COLORS.mind}
              onPress={() => router.push(ROUTES.appEyeGame('focus-sprint') as never)}
            />
          </View>
        </StaggerItem>

        {/* ── Visual Flow — one premium card, not a six-tile library ── */}
        <StaggerItem index={2}>
          <SectionLabel spacingTop={0}>VISUAL FLOW</SectionLabel>
          <GlassCard tint={SURFACE_TINT.card} style={styles.flowCard}>
            <View style={styles.flowCardTop}>
              <FlowPreviewDot />
              <View style={styles.flowCardInfo}>
                <View style={styles.flowCardTitleRow}>
                  <Text style={styles.flowCardTitle}>Guided Visual Flow</Text>
                  <Text style={styles.flowCardDuration}>3 min</Text>
                </View>
                <Text style={styles.flowCardSub}>4 calm visual activities</Text>
                <Text style={styles.flowCardList}>Infinity · Wave · Switch · Sweep</Text>
              </View>
            </View>
            <View style={styles.flowCardActions}>
              <GradientCTA
                label="Start Flow"
                textColor="#03212C"
                onPress={() => router.push(ROUTES.appVisualFlow as never)}
                style={styles.flowStartCta}
              />
              <TouchableOpacity
                style={styles.flowExploreBtn}
                onPress={() => router.push(ROUTES.appVisualFlowExplore as never)}
                activeOpacity={0.75}
              >
                <Text style={styles.flowExploreText}>Explore</Text>
                <ChevronRight size={14} color={EYE_COLOR} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </StaggerItem>

        {/* ── 3. Desktop Eye Companion — compact card ── */}
        <StaggerItem index={3}>
          <DesktopCompanionCard
            prefs={companion.prefs}
            active={companion.sessionActive}
            paused={companion.paused}
            elapsedSeconds={companion.elapsedSeconds}
            nextBreakInSeconds={companion.nextBreakInSeconds}
            intervalMinutes={companion.intervalMinutes}
            notificationDenied={companion.notificationDenied}
            lastSavedLabel={companion.lastSavedLabel}
            expanded={companionExpanded}
            breakEnabled={breakEnabled}
            breakLoading={breakLoading}
            onToggleBreak={() => void toggleBreak(!breakEnabled)}
            onToggleExpand={() => setCompanionExpanded(o => !o)}
            onOpenSettings={() => setSettingsSheetOpen(true)}
            onSelectInterval={minutes =>
              companion.update({ intervalMinutes: minutes, custom: false })
            }
            onToggleCustom={() =>
              companion.update({ custom: !companion.prefs.custom })
            }
            onChangeCustomMinutes={minutes =>
              companion.update({ customMinutes: minutes })
            }
            onSelectBreak={seconds =>
              companion.update({ breakSeconds: seconds })
            }
            onToggleRepeat={value => companion.update({ repeatOn: value })}
            onStart={() => setActivitySheetOpen(true)}
            onTakeBreak={() =>
              router.push({
                pathname: ROUTES.appEyeBreak,
                params: { duration: String(companion.prefs.breakSeconds) },
              } as never)
            }
            onPause={() => void companion.pause()}
            onResume={() => void companion.resume()}
            onEnd={() => void companion.end()}
          />
        </StaggerItem>

        {/* ── 4. Recommended Recovery ── */}
        <StaggerItem index={4}>
          <SectionLabel spacingTop={0}>RECOMMENDED RECOVERY</SectionLabel>
          {allCaughtUp ? (
            <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.recommendedCard}>
              <View style={styles.caughtUp}>
                <View style={styles.caughtUpIcon}>
                  <Check size={16} color={STATUS_COLORS.success} strokeWidth={3} />
                </View>
                <Text style={styles.caughtUpText}>
                  All caught up — you&apos;ve completed today&apos;s eye-care routine.
                </Text>
              </View>
            </GlassCard>
          ) : recommended ? (
            <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.recommendedCard}>
              <TouchableOpacity
                style={styles.recommendedRow}
                onPress={() => router.push(recommended.route as never)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[EYE_COLOR + "0E", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.recommendedIcon}>
                  <Text style={styles.recommendedEmoji}>{recommended.emoji}</Text>
                </View>
                <View style={styles.recommendedInfo}>
                  <Text style={styles.recommendedTitle} numberOfLines={1}>
                    {recommended.title}
                  </Text>
                  <Text style={styles.recommendedSub} numberOfLines={1}>
                    {recommended.subtitle} · {formatActivityDuration(recommended.durationSeconds)}
                  </Text>
                </View>
                <ChevronRight size={18} color={EYE_COLOR} strokeWidth={2.4} />
              </TouchableOpacity>
            </GlassCard>
          ) : null}
        </StaggerItem>

        {/* ── 5. Weekly Eye Care ── */}
        <StaggerItem index={5}>
          <SectionLabel spacingTop={0}>WEEKLY EYE CARE</SectionLabel>
          <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.weekCard}>
            <View style={styles.weekInner}>
              {hasAnySessions ? (
                <>
                  <View style={styles.weekStatsRow}>
                    <View style={styles.weekStat}>
                      <Text style={styles.weekValue}>
                        {daysActiveThisWeek}/7
                      </Text>
                      <Text style={styles.weekLabel}>Active days</Text>
                    </View>
                    <View style={styles.weekDivider} />
                    <View style={styles.weekStat}>
                      <View style={styles.weekStreakValueRow}>
                        <Flame
                          size={13}
                          color={
                            eyeStreak > 0
                              ? PILLAR_COLORS.challenge
                              : "rgba(245,247,251,0.35)"
                          }
                          fill={
                            eyeStreak > 0
                              ? PILLAR_COLORS.challenge
                              : "transparent"
                          }
                          strokeWidth={1.8}
                        />
                        <Text
                          style={[
                            styles.weekValue,
                            eyeStreak === 0 && styles.weekValueEmpty,
                          ]}
                        >
                          {eyeStreak} {eyeStreak === 1 ? "day" : "days"}
                        </Text>
                      </View>
                      <Text style={styles.weekLabel}>Current streak</Text>
                    </View>
                  </View>

                  <View style={styles.weekChartWrap}>
                    <WeeklyActivityChart
                      weekDots={weekDots}
                      todayIndex={todayDotIndex}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.weekInsights}
                    onPress={() => router.push(ROUTES.appReport as never)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.weekInsightsText}>View insights</Text>
                    <ChevronRight size={14} color={EYE_COLOR} strokeWidth={2.4} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.weekEmptyHeadline}>No eye-care activity yet</Text>
                  <Text style={styles.weekEmptyText}>
                    Your weekly activity will appear after your first session.
                  </Text>
                  <View style={styles.weekDashWrap}>
                    <Text style={styles.weekChartEyebrow}>7-DAY ACTIVITY</Text>
                    <View style={styles.weekDashRow}>
                      {WEEK_DAY_LABELS.map(label => (
                        <View key={label} style={styles.weekDashCol}>
                          <Text style={styles.weekChartLabel}>{label[0]}</Text>
                          <View style={styles.weekDashMark} />
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </GlassCard>
        </StaggerItem>

        {/* ── 6. Eye check-in ── */}
        <StaggerItem index={6}>
          <SectionLabel spacingTop={0}>EYE CHECK-IN</SectionLabel>
          <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.checkinCard}>
            <TouchableOpacity
              style={styles.checkinRow}
              onPress={() => openCheckin("symptoms")}
              activeOpacity={0.75}
            >
              <View style={styles.checkinIcon}>
                <Eye size={16} color={EYE_COLOR} strokeWidth={2} />
              </View>
              <Text style={styles.checkinText}>How do your eyes feel right now?</Text>
              <View style={styles.checkinAction}>
                <Text style={styles.checkinActionText}>Check in</Text>
                <ChevronRight size={14} color={EYE_COLOR} strokeWidth={2.2} />
              </View>
            </TouchableOpacity>
          </GlassCard>
        </StaggerItem>

        {/* ── Companion bottom sheets ── */}
        <CompanionActivitySheet
          visible={activitySheetOpen}
          initialActivity={companion.prefs.lastActivity}
          onSelect={activity => {
            setActivitySheetOpen(false);
            void companion.start(activity);
          }}
          onClose={() => setActivitySheetOpen(false)}
        />
        <CompanionSettingsSheet
          visible={settingsSheetOpen}
          prefs={companion.prefs}
          onChange={companion.update}
          onClose={() => setSettingsSheetOpen(false)}
        />

        <EyeCheckinSheet
          key={`${checkinMode ?? "closed"}-${checkinSession}`}
          visible={checkinMode !== null}
          mode={checkinMode ?? "symptoms"}
          onClose={() => setCheckinMode(null)}
          uid={user?.uid}
        />
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /* ── Desktop Eye Companion ── */
  companionHero: {
    marginTop: 0,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: EYE_COLOR + "22",
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },
  companionHeroInner: {
    padding: 12,
    gap: 6,
    alignItems: "stretch",
  },
  companionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  companionHeroIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "12",
    borderWidth: 1,
    borderColor: EYE_COLOR + "28",
  },
  companionHeroTitle: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 14.5,
    fontWeight: "700",
    color: "#f6f8fc",
    textAlign: "left",
  },
  companionHeroBenefit: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: "left",
    color: "rgba(245,247,251,0.72)",
    paddingRight: 2,
  },
  companionStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.button,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  companionStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  companionGear: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  /* Compact summary row */
  companionSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.button,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  companionSummaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  companionSummaryLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  companionSummaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  companionSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  /* Reminder row inside companion */
  companionReminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: RADIUS.button,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  companionReminderLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.text.primary,
  },
  /* Compact Set Up pill in summary row */
  companionSetUpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: EYE_COLOR + "45",
    backgroundColor: EYE_COLOR + "10",
    minHeight: 36,
  },
  companionSetUpPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  /* Active session stats */
  companionStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    width: "100%",
  },
  companionStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  companionStatValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  companionStatLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  companionCycleBar: {
    marginTop: 8,
  },
  companionStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  companionActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  companionTakeBreakWrap: { flex: 1 },
  companionPauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: EYE_COLOR + "45",
    backgroundColor: EYE_COLOR + "0E",
  },
  companionPauseText: {
    fontSize: 13,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  companionEndFull: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 8,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  companionEndFullText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  /* Expanded controls */
  companionConfigLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.text.tertiary,
  },
  companionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  companionChip: {
    minHeight: 48,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  companionChipThird: {
    flexBasis: "31%",
    flexGrow: 1,
    alignItems: "center",
  },
  companionChipSelected: {
    borderColor: EYE_COLOR + "99",
    backgroundColor: EYE_COLOR + "1A",
  },
  companionChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  companionChipTextSelected: { color: EYE_COLOR, fontWeight: "800" },
  companionCustomBlock: {
    alignSelf: "stretch",
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.card,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: EYE_COLOR + "2A",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f6f8fc",
    minWidth: 96,
    textAlign: "center",
  },
  repeatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  repeatLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.text.primary,
  },
  companionHowSteps: {
    alignSelf: "stretch",
    gap: 6,
    padding: 10,
    borderRadius: RADIUS.card,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  companionHowStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  companionHowStepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "16",
  },
  companionHowStepNumText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: EYE_COLOR,
  },
  companionHowStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
  },
  /* Expanded CTA row */
  companionExpandedCTARow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  companionStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: RADIUS.button,
    backgroundColor: EYE_COLOR,
    width: "65%",
  },
  companionStartBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#03212C",
  },
  companionDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: RADIUS.button,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  companionDoneText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  companionNotifWarn: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    alignSelf: "stretch",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: STATUS_COLORS.warning + "10",
    borderWidth: 1,
    borderColor: STATUS_COLORS.warning + "35",
  },
  companionNotifWarnText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.text.secondary,
  },
  companionSaved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: STATUS_COLORS.success + "0F",
    borderWidth: 1,
    borderColor: STATUS_COLORS.success + "30",
  },
  companionSavedText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: STATUS_COLORS.success,
  },

  /* ── Hero card ── */
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroInner: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: "rgba(255,255,255,0.5)",
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  heroIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  heroTitleText: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 19,
    color: colors.text.primary,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.tertiary,
    marginTop: 4,
  },
  heroMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  heroBar: {
    marginTop: 8,
  },
  heroActivitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  heroActivitiesText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "rgba(245,247,251,0.65)",
  },

  /* ── Quick Actions ── */
  qaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.lg,
  },
  qaCard: {
    flex: 1,
    aspectRatio: 1.2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: EYE_COLOR + "26",
    backgroundColor: "rgba(255,255,255,0.035)",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  qaIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "16",
    borderWidth: 1,
    borderColor: EYE_COLOR + "2E",
  },
  qaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(245,247,251,0.85)",
    textAlign: "center",
  },

  /* ── Visual Flow — one premium card ── */
  flowCard: {
    marginBottom: spacing.lg,
    gap: 16,
  },
  flowCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  flowPreviewWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  flowPreviewRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: EYE_COLOR + "30",
  },
  flowPreviewCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: EYE_COLOR,
  },
  flowCardInfo: { flex: 1, gap: 3, minWidth: 0 },
  flowCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flowCardTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#f6f8fc",
  },
  flowCardDuration: {
    fontSize: 12.5,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  flowCardSub: {
    fontSize: 12.5,
    color: "rgba(245,247,251,0.68)",
  },
  flowCardList: {
    fontSize: 11.5,
    color: "rgba(245,247,251,0.5)",
  },
  flowCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flowStartCta: { flex: 1 },
  flowExploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  flowExploreText: {
    fontSize: 13,
    fontWeight: "600",
    color: EYE_COLOR,
  },

  /* ── Recommended for you ── */
  recommendedCard: {
    marginBottom: spacing.lg,
    borderRadius: RADIUS.card,
  },
  recommendedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 16,
    minHeight: 72,
    overflow: "hidden",
  },
  recommendedIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "16",
    borderWidth: 1,
    borderColor: EYE_COLOR + "30",
    flexShrink: 0,
  },
  recommendedEmoji: { fontSize: 24 },
  recommendedInfo: { flex: 1, gap: 3, minWidth: 0 },
  recommendedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f6f8fc",
  },
  recommendedSub: {
    fontSize: 12,
    color: "rgba(245,247,251,0.68)",
  },
  caughtUp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 15,
  },
  caughtUpIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: STATUS_COLORS.success + "14",
    borderWidth: 1,
    borderColor: STATUS_COLORS.success + "38",
  },
  caughtUpText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.text.secondary,
  },


  /* ── This week ── */
  weekCard: {
    marginBottom: 20,
    borderRadius: RADIUS.card,
  },
  weekInner: {
    padding: 14,
    gap: 10,
  },
  weekStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  weekValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  weekValueEmpty: {
    color: "rgba(245,247,251,0.35)",
  },
  weekStreakValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weekLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  weekDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  weekInsights: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  weekInsightsText: {
    fontSize: 12,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  weekEmptyHeadline: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.primary,
  },
  weekEmptyText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
    color: "rgba(245,247,251,0.72)",
  },
  weekDashWrap: {
    marginTop: 2,
  },
  weekDashRow: {
    flexDirection: "row",
    gap: 6,
  },
  weekDashCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekDashMark: {
    width: "60%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  weekChartWrap: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  weekChartEyebrow: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  weekChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  weekChartCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekChartTrack: {
    width: "100%",
    height: 52,
    borderRadius: 5,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  weekChartBar: {
    width: "100%",
    borderRadius: 5,
  },
  weekChartLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  weekChartLabelToday: {
    color: EYE_COLOR,
    fontWeight: "800",
  },

  /* ── Check-in ── */
  checkinCard: {
    marginBottom: spacing.lg,
    borderRadius: RADIUS.card,
  },
  checkinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  checkinIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "16",
    borderWidth: 1,
    borderColor: EYE_COLOR + "2E",
    flexShrink: 0,
  },
  checkinText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.text.primary,
  },
  checkinAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  checkinActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: EYE_COLOR,
  },
});
