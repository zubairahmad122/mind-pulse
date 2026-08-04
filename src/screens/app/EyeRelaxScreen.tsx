import { recordLastFeature } from "@/components/home/ContinueJourney";
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
import {
  EYE_BREAK_INTERVAL_OPTIONS,
  type EyeBreakScheduleMode,
} from "@/services/eyeBreakReminderPreferences";
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
  Circle,
  Eye,
  Flame,
  Gamepad2,
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

// One accent for the whole screen — cyan everywhere. Reminder toggle keeps
// its own color since it's a settings affordance, not a pillar identity.
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

/**
 * The one-thing-next sequence behind "Recommended for You". After Eye Reset
 * is done for the day, the next recovery item is suggested, then the first
 * game — after that the dashboard shows "all caught up".
 */
const RECOMMENDED: {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  emoji: string;
  route: string;
}[] = (() => {
  const eyeReset = getRecoverySession("cvs-protocol")!;
  const focusSwitch = getEyeActivity("focus-sprint")!;
  return [
    {
      // `id` stays the recovery-session id so the "done today" check matches
      // what useEyeScore reports (both stored session types resolve here).
      id: eyeReset.id,
      title: eyeReset.title,
      subtitle: eyeReset.subtitle,
      duration: formatActivityDuration(eyeReset.durationSeconds),
      emoji: eyeReset.emoji,
      route: eyeReset.route,
    },
    {
      id: focusSwitch.id,
      title: focusSwitch.title,
      subtitle: focusSwitch.subtitle,
      duration: formatActivityDuration(focusSwitch.durationSeconds),
      emoji: focusSwitch.emoji,
      route: focusSwitch.route,
    },
  ];
})();

/** The three daily activities that make up "Today: X/3" (score breakdown
 * minus the reminder toggle, which is a setting, not an action). */
const DAILY_ACTIVITIES = 3;

function formatHour(hour: number): string {
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
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
      <View style={styles.qaIcon}>
        <Icon size={20} color={accent} strokeWidth={1.9} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function formatDurationMinutes(totalSeconds: number): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
}

function DesktopCompanionCard({
  prefs,
  active,
  paused,
  elapsedSeconds,
  nextBreakInSeconds,
  intervalMinutes,
  notificationDenied,
  lastSavedLabel,
  showHowItWorks,
  onToggleHowItWorks,
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
  showHowItWorks: boolean;
  onToggleHowItWorks: () => void;
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

  return (
    <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.companionHero}>
      <LinearGradient
        colors={[EYE_COLOR + (active ? "14" : "08"), "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {!active ? (
        <View style={styles.companionHeroInner}>
          {/* Compact header row — icon + title + status pill + settings */}
          <View style={styles.companionHeaderRow}>
            <View style={styles.companionHeroIcon}>
              <Monitor size={19} color={EYE_COLOR} strokeWidth={1.8} />
            </View>
            <Text style={styles.companionHeroTitle} numberOfLines={1}>
              Desktop Eye Companion
            </Text>
            <View style={styles.companionStatusPill}>
              <Circle
                size={7}
                color={colors.text.tertiary}
                fill={colors.text.tertiary}
                strokeWidth={0}
              />
              <Text style={styles.companionStatusText}>Idle</Text>
            </View>
            <TouchableOpacity
              style={styles.companionGear}
              onPress={onOpenSettings}
              activeOpacity={0.7}
              hitSlop={10}
            >
              <Settings size={15} color="rgba(255,255,255,0.5)" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={styles.companionHeroBenefit} numberOfLines={2}>
            Break reminders while you work on your computer.
          </Text>

          <View style={styles.companionConfig}>
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
              {/* Third grid slot on its own style so 5 presets + Custom form
                  a clean 3×2 grid instead of wrapping to an orphaned 6th
                  pill alone on its own row. */}
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
                    trackColor={{ false: "#252542", true: EYE_COLOR }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            )}

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
          </View>

          {/* Filled gradient, not the outline `secondary` variant — the old
              outline (faint gray border, no fill) read as a disabled button
              next to "Start Eye Reset"'s vivid CTA above. Still reads as
              secondary in the page's hierarchy purely from size/position. */}
          <GradientCTA
            label="Start Session"
            variant="primary"
            icon={<Play size={14} color="#03212C" fill="#03212C" />}
            textColor="#03212C"
            compact
            height={48}
            onPress={onStart}
          />
          {notificationDenied && (
            <View style={styles.companionNotifWarn}>
              <AlertCircle size={13} color={STATUS_COLORS.warning} />
              <Text style={styles.companionNotifWarnText}>
                Notifications are off — the session runs, but breaks won&apos;t
                be announced.
              </Text>
            </View>
          )}
          {lastSavedLabel && (
            <View style={styles.companionSaved}>
              <Check size={13} color={STATUS_COLORS.success} strokeWidth={3} />
              <Text style={styles.companionSavedText}>{lastSavedLabel}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onToggleHowItWorks}
            activeOpacity={0.7}
            style={styles.companionHowWrap}
            hitSlop={8}
          >
            <Text style={styles.companionHowText}>How it works</Text>
            <ChevronDown
              size={14}
              color={EYE_COLOR}
              strokeWidth={2.2}
              style={{
                transform: [
                  { rotate: showHowItWorks ? "180deg" : "0deg" },
                ],
              }}
            />
          </TouchableOpacity>
          {showHowItWorks && (
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
          )}
        </View>
      ) : (
        <View style={styles.companionHeroInner}>
          <View style={styles.companionHeaderRow}>
            <View style={styles.companionHeroIcon}>
              <Monitor size={19} color={EYE_COLOR} strokeWidth={1.8} />
            </View>
            <Text style={styles.companionHeroTitle} numberOfLines={1}>
              Desktop Session
            </Text>
            <View style={styles.companionStatusPill}>
              <Circle
                size={7}
                color={paused ? STATUS_COLORS.warning : EYE_COLOR}
                fill={paused ? STATUS_COLORS.warning : EYE_COLOR}
                strokeWidth={0}
              />
              <Text style={styles.companionStatusText}>
                {paused ? "Paused" : "Active"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.companionGear}
              onPress={onOpenSettings}
              activeOpacity={0.7}
              hitSlop={10}
            >
              <Settings size={15} color="rgba(255,255,255,0.5)" strokeWidth={2} />
            </TouchableOpacity>
          </View>
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
          <Text style={styles.companionEvery}>
            Reminder every {intervalMinutes} minutes
          </Text>
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
        </View>
      )}
    </GlassCard>
  );
}

export default function EyeRelaxScreen() {
  const router = useRouter();
  const { user } = useAuth();

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
  const { weekDots, streak: eyeStreak } = useEyeProgress(user?.uid);

  const [checkinMode, setCheckinMode] = useState<CheckinMode | null>(null);
  // Increments on every open so the sheet remounts fresh (no stale selections
  // or a stale "Saved ✓" from a previous check-in).
  const [checkinSession, setCheckinSession] = useState(0);
  const openCheckin = (mode: CheckinMode) => {
    setCheckinMode(mode);
    setCheckinSession(s => s + 1);
  };

  // ── Desktop Eye Companion — prefs, session clock, notifications ──
  const companion = useDesktopCompanion(user?.uid);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // "Today: X/3 activities completed" — no per-activity point values.
  const goalItems = eyeScore.breakdown.filter((b) => b.key !== "reminders");
  const activitiesDone = goalItems.filter((b) => b.positive).length;

  // Recommendation — the next activity the user hasn't done yet today.
  const recommended =
    RECOMMENDED.find((r) => !completedToday.includes(r.id)) ?? null;
  const allCaughtUp =
    !recommended ||
    (recommended.id === "focus-sprint" && eyeScore.gamePlayedToday);

  const daysActiveThisWeek = weekDots.filter(Boolean).length;

  return (
    <ScreenShell pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenTransition>
        <ScreenHeader
          title="Eye Comfort"
          subtitle="Breaks, recovery, and visual activities"
        />

        {/* ── Today's Eye Care — hero card, same shape as Relax/Challenges ── */}
        <StaggerItem index={0}>
          <HeroCard style={styles.heroCard}>
            <View style={styles.heroInner}>
              <View style={styles.heroHeaderRow}>
                <Text style={styles.heroLabel}>TODAY&apos;S EYE CARE</Text>
                <Text style={[styles.heroDifficulty, { color: EYE_COLOR }]}>
                  {eyeScore.loading ? "–" : `${eyeScore.score}/100`} comfort
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push((recommended?.route ?? ROUTES.appCvsProtocol) as never)
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
                  {recommended?.title ?? "Eye Reset"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.heroMeta}>
                {recommended?.duration ??
                  formatActivityDuration(
                    getRecoverySession("cvs-protocol")!.durationSeconds,
                  )}
              </Text>

              <Text style={styles.heroMessage} numberOfLines={2}>
                {allCaughtUp
                  ? "You&apos;ve completed today&apos;s eye-care routine."
                  : recommended?.subtitle ??
                    "Guided relaxation for screen-weary eyes"}
              </Text>

              <ProgressBar
                progress={
                  eyeScore.loading
                    ? 0
                    : Math.max(eyeScore.score / 100, 0.04)
                }
                fill={EYE_COLOR}
                style={styles.heroBar}
              />

              <View style={styles.heroActivitiesRow}>
                <Text style={styles.heroActivitiesText}>
                  {eyeScore.loading
                    ? "–"
                    : `${activitiesDone}/${DAILY_ACTIVITIES}`}{" "}
                  activities completed
                </Text>
                <View style={styles.todayDots}>
                  {Array.from({ length: DAILY_ACTIVITIES }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.todayDot,
                        i < activitiesDone && styles.todayDotDone,
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={{ marginTop: spacing.md }}>
                <GradientCTA
                  label={
                    !recommended
                      ? hasAnySessions
                        ? "Continue Eye Care"
                        : "Start Eye Reset"
                      : recommended.id === "focus-sprint"
                        ? "Play Focus Switch"
                        : hasAnySessions
                          ? "Continue Eye Reset"
                          : "Start Eye Reset"
                  }
                  icon={
                    <ArrowRight size={17} color="#03212C" strokeWidth={2.5} />
                  }
                  textColor="#03212C"
                  onPress={() =>
                    router.push(
                      (recommended?.route ?? ROUTES.appCvsProtocol) as never,
                    )
                  }
                />
              </View>
            </View>
          </HeroCard>
        </StaggerItem>

        {/* ── Desktop Eye Companion — secondary feature (Eye Reset above is the
            dominant action) ──────────────────────────────────────────── */}
        <StaggerItem index={1}>
          <DesktopCompanionCard
            prefs={companion.prefs}
            active={companion.sessionActive}
            paused={companion.paused}
            elapsedSeconds={companion.elapsedSeconds}
            nextBreakInSeconds={companion.nextBreakInSeconds}
            intervalMinutes={companion.intervalMinutes}
            notificationDenied={companion.notificationDenied}
            lastSavedLabel={companion.lastSavedLabel}
            showHowItWorks={howItWorksOpen}
            onToggleHowItWorks={() => setHowItWorksOpen(o => !o)}
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

        {/* ── 2. Quick Actions (compact) ───────────────────────────── */}
        <SectionLabel>QUICK ACTIONS</SectionLabel>
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
            label="Games"
            icon={Gamepad2}
            accent={EYE_COLOR}
            onPress={() => router.push(ROUTES.appEyeGames as never)}
          />
        </View>

        {/* Compact reminder row — full schedule lives behind the toggle */}
        <View style={styles.reminderRow}>
          <Bell
            size={16}
            color={breakEnabled ? REMINDER_COLOR : colors.text.tertiary}
            strokeWidth={2}
          />
          <Text style={styles.reminderLabel}>Break reminders</Text>
          <Text style={styles.reminderState}>
            {breakEnabled ? "On" : "Off"}
          </Text>
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

        {/* ── 3. Recommended recovery — one activity + library links ── */}
        <SectionLabel>RECOMMENDED RECOVERY</SectionLabel>
        {allCaughtUp ? (
          <GlassCard noPadding tint={SURFACE_TINT.card}>
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
                  {recommended.subtitle} · {recommended.duration}
                </Text>
              </View>
              {/* Secondary row, not a second primary CTA — the Today card's
                  "Start Eye Reset" button is the one clear primary action. */}
              <ChevronRight size={18} color={EYE_COLOR} strokeWidth={2.4} />
            </TouchableOpacity>
          </GlassCard>
        ) : null}
        <View style={styles.libraryLinks}>
          <TouchableOpacity
            style={styles.libraryLink}
            onPress={() => router.push(ROUTES.appEyeExercises as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.libraryLinkText}>View all exercises</Text>
            <ArrowRight size={13} color={EYE_COLOR} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.libraryLinkDivider} />
          <TouchableOpacity
            style={styles.libraryLink}
            onPress={() => router.push(ROUTES.appEyeGames as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.libraryLinkText}>View all games</Text>
            <ArrowRight size={13} color={EYE_COLOR} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* ── 4. This week — compact progress card ─────────────────── */}
        <SectionLabel>THIS WEEK</SectionLabel>
        <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.weekCard}>
          <View style={styles.weekInner}>
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
            <TouchableOpacity
              style={styles.weekInsights}
              onPress={() => router.push(ROUTES.appReport as never)}
              activeOpacity={0.75}
            >
              <Text style={styles.weekInsightsText}>View insights</Text>
              <ChevronRight size={14} color={EYE_COLOR} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Symptom check-in → bottom sheet ──────────────────────── */}
        <GlassCard noPadding tint={SURFACE_TINT.card} style={styles.checkinCard}>
          <TouchableOpacity
            style={styles.checkinRow}
            onPress={() => openCheckin("symptoms")}
            activeOpacity={0.75}
          >
            <Text style={styles.checkinText}>How do your eyes feel?</Text>
            <View style={styles.checkinAction}>
              <Text style={styles.checkinActionText}>Check in</Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* ── Companion bottom sheets ─────────────────────────────── */}
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
  /* Desktop Eye Companion — secondary feature (visually lighter than the
     Eye Reset hero above it) */
  // GlassCard already supplies SHADOWS.card — no shadow props here (they'd
  // be clipped by the card's overflow:hidden anyway).
  companionHero: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: EYE_COLOR + "22",
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },
  companionHeroInner: {
    padding: 14,
    gap: 8,
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
    color: colors.text.secondary,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  // A subtle pill instead of a bare underlined link — reads as a tappable
  // disclosure affordance rather than a legacy inline hyperlink.
  companionHowWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.button,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  companionHowText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  companionHowSteps: {
    alignSelf: "stretch",
    gap: 6,
    marginTop: 2,
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
  companionEvery: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  companionConfig: {
    alignSelf: "stretch",
    gap: 6,
    marginTop: 2,
  },
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
  // Even 3-per-row grid for the interval presets (5 presets + Custom = 6) —
  // flexBasis instead of leaving them to size to their own label text, which
  // wrapped 5+1 and left "Custom" stranded alone on its own row.
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

  /* Today's Eye Care — hero card (same anatomy as Relax/Challenges) */
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroInner: {
    paddingVertical: 24,
    paddingHorizontal: 18,
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
  heroDifficulty: {
    fontSize: 12,
    fontWeight: "700",
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
    marginTop: 6,
  },
  heroMessage: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  heroBar: {
    marginTop: 14,
  },
  heroActivitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  heroActivitiesText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "rgba(245,247,251,0.65)",
  },
  todayDots: {
    flexDirection: "row",
    gap: 5,
  },
  todayDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  todayDotDone: {
    backgroundColor: STATUS_COLORS.success,
    borderColor: STATUS_COLORS.success,
  },

  /* Quick Actions — compact square cards */
  qaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.md,
  },
  qaCard: {
    flex: 1,
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: EYE_COLOR + "26",
    backgroundColor: "rgba(255,255,255,0.035)",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  qaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: EYE_COLOR + "16",
    borderWidth: 1,
    borderColor: EYE_COLOR + "2E",
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(245,247,251,0.85)",
    textAlign: "center",
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
  reminderState: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.tertiary,
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
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: 48,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
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

  /* Recommended for you — flat card, same language as every other card, so
     the Today card's GradientCTA stays the one primary action. */
  recommendedCard: {
    marginBottom: 6,
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
    color: "rgba(245,247,251,0.5)",
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
  libraryLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
  },
  libraryLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 48,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: EYE_COLOR + "2E",
    backgroundColor: EYE_COLOR + "0A",
  },
  libraryLinkText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: EYE_COLOR,
  },
  libraryLinkDivider: { width: 8 },

  /* This week */
  weekCard: {
    marginBottom: spacing.lg,
    borderRadius: RADIUS.card,
  },
  weekInner: {
    padding: 16,
    gap: 12,
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

  /* Check-in rows */
  checkinCard: {
    marginBottom: spacing.lg,
    borderRadius: RADIUS.card,
  },
  checkinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  checkinText: {
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
