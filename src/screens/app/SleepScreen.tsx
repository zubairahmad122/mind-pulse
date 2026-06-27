import { ScreenShell } from "@/components/layout/ScreenShell";
import { BreatheToDismiss } from "@/components/sleep/BreatheToDismiss";
import { HoldButton } from "@/components/sleep/HoldButton";
import { MoonWave } from "@/components/sleep/MoonWave";
import { SleepAnalysisPanel } from "@/components/sleep/SleepAnalysisPanel";
import { SleepDial } from "@/components/sleep/SleepDial";
import { SleepQualityModal } from "@/components/sleep/SleepQualityModal";
import { SleepRoutinePanel } from "@/components/sleep/SleepRoutinePanel";
import { SleepTimePickerSheet } from "@/components/sleep/SleepTimePickerSheet";
import { AmbientBackground } from "@/components/ui";
import { ActionCard } from "@/components/ui/ActionCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { SubscriptionBadge } from "@/components/ui/SubscriptionBadge";
import { getPresetById, NIGHT_PRESETS, ROUTES } from "@/constants";
import { PILLAR_THEME } from "@/constants/theme";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BarChart3,
  Bed,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Moon,
  MoonStar,
  Music,
  Play,
  Settings,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Stop,
  RadialGradient as SvgRadialGradient,
} from "react-native-svg";

import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { ALARM_RINGTONES, getRingtoneRequire } from "@/constants/alarmSounds";
import { useAuth } from "@/context/AuthContext";
import { useSleep } from "@/context/SleepContext";
import { useAlarmSettings } from "@/hooks/useAlarmSettings";
import { useGreeting } from "@/hooks/useGreeting";
import { usePersistedSleepTracker } from "@/hooks/usePersistedSleepTracker";
import { useSleepPlanInsight } from "@/hooks/useSleepPlanInsight";
import { useSleepReadiness } from "@/hooks/useSleepReadiness";
import { useSleepSchedule } from "@/hooks/useSleepSchedule";
import type { SleepStage } from "@/services/accelerometerSleepTracker";
import { formatWakeTime } from "@/services/sleepAlarm";
import { formatAlarmCountdown } from "@/utils/sleepDisplay";
import {
  avgDuration,
  calculateStreak,
  formatDuration,
  formatElapsed,
} from "@/utils/sleepUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Add minutes to a "HH:MM" time string, wrapping around 24h. */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Format a "HH:MM" string to a short 12h display like "6:30 AM". */
function formatTimeAmPm(wakeTime: string): string {
  const [h, m] = wakeTime.split(":").map(Number);
  const hh24 = h % 24;
  const hour12 = hh24 === 0 ? 12 : hh24 > 12 ? hh24 - 12 : hh24;
  const ampm = hh24 < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Calculate minutes between two "HH:MM" times, wrapping overnight if needed. */
function timeDiffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff <= 0) diff += 1440;
  return diff;
}

// ── Sleep pillar theme tokens ──────────────────────────────────────────────────
const SLEEP = PILLAR_THEME.sleep;

// ── Sleep goal cards ──────────────────────────────────────────────────────────
const SLEEP_GOALS = [
  { hours: 7, label: "Minimum", icon: Moon, color: "#60a5fa" },
  { hours: 7.5, label: "Recommended", icon: Star, color: "#a78bfa" },
  { hours: 8, label: "Optimal", icon: Sparkles, color: "#34d399" },
  { hours: 9, label: "Recovery", icon: Bed, color: "#f59e0b" },
] as const;

// ── ReadinessRing — compact circular gauge for the header indicator ───────────
function ReadinessRing({
  score,
  color,
  size = 38,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: "#FFFFFF",
          fontVariant: ["tabular-nums"],
        }}
      >
        {score}
      </Text>
    </View>
  );
}

function stageBadgeClass(stage: SleepStage): string {
  if (stage === "light") return "bg-emerald-500/20 border-emerald-500/40";
  if (stage === "rem") return "bg-sky-400/20 border-sky-400/40";
  return "bg-purple-500/20 border-purple-500/40";
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      className={`w-12 h-7 rounded-full p-0.5 justify-center border ${
        value
          ? "bg-app-purple border-app-purple"
          : "bg-white/[0.06] border-white/10"
      }`}
    >
      <View
        className={`w-[22px] h-[22px] rounded-full bg-white shadow-sm ${value ? "self-end" : "self-start"}`}
      />
    </TouchableOpacity>
  );
}

// ─── Test Alarm Modal ─────────────────────────────────────────────────────────

function TestAlarmModal({
  visible,
  selectedRingtone,
  alarmVolume,
  onDismiss,
}: {
  visible: boolean;
  selectedRingtone: string;
  alarmVolume: number;
  onDismiss: () => void;
}) {
  const ringtone = ALARM_RINGTONES.find((r) => r.id === selectedRingtone);
  const RingIcon = ringtone?.icon ?? Bell;
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch {}
        playerRef.current = null;
      }
      return;
    }

    // Start pulse animation
    pulseScale.value = withRepeat(
      withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // Play ringtone
    void setAudioModeAsync({ playsInSilentMode: true });
    try {
      const source = getRingtoneRequire(selectedRingtone);
      const player = createAudioPlayer(source);
      playerRef.current = player;
      player.play();
    } catch {}

    // Auto-dismiss after 5 seconds
    autoDismissRef.current = setTimeout(() => {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch {}
        playerRef.current = null;
      }
      onDismissRef.current();
    }, 5000);

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [visible, selectedRingtone]);

  const pulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handleDismiss = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent={false}
      statusBarTranslucent
    >
      <View className="flex-1 bg-[#0a0720] items-center justify-center px-6 pb-12 overflow-hidden">
        {/* Glow halo */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: 130,
              backgroundColor: ringtone?.color ?? "#a78bfa",
              top: "22%",
            },
            pulseAnim,
          ]}
        />

        {/* Top accent arc */}
        <View
          style={{
            position: "absolute",
            top: "14%",
            width: "150%",
            height: 100,
            borderRadius: 200,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            backgroundColor: (ringtone?.color ?? "#a78bfa") + "08",
          }}
        />

        {/* Icon container */}
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-5"
          style={{
            backgroundColor: (ringtone?.color ?? "#a78bfa") + "15",
            borderWidth: 1,
            borderColor: (ringtone?.color ?? "#a78bfa") + "30",
          }}
        >
          <RingIcon
            size={44}
            color={ringtone?.color ?? "#a78bfa"}
            strokeWidth={1.5}
          />
        </View>

        <Text
          style={{
            fontSize: 38,
            fontWeight: "800",
            color: "#FFFFFF",
            letterSpacing: -0.5,
          }}
        >
          Test Alarm
        </Text>
        <Text
          style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 4 }}
        >
          {ringtone?.label ?? "Alarm"}
        </Text>

        {/* Volume indicator */}
        <View className="flex-row items-center gap-2 mt-6 bg-white/[0.03] px-4 py-2 rounded-full border border-white/10">
          <Volume2 size={14} color="rgba(255,255,255,0.35)" />
          <View className="flex-row gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <View
                key={i}
                className="w-[4px] rounded-full"
                style={{
                  height: 4 + (i % 3) * 3,
                  backgroundColor:
                    i < Math.round(alarmVolume * 10)
                      ? (ringtone?.color ?? "#a78bfa")
                      : "rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </View>
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.85}
          className="mt-12 w-full max-w-xs flex-row items-center justify-center gap-2.5 py-4 rounded-2xl bg-app-purple"
          style={{
            shadowColor: "#a78bfa",
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 20,
            shadowOpacity: 0.5,
            elevation: 8,
          }}
        >
          <Bell size={18} color="#fff" />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "800",
              color: "#FFFFFF",
              letterSpacing: 1.5,
            }}
          >
            DISMISS
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            marginTop: 12,
          }}
        >
          Auto-dismisses in a moment
        </Text>
      </View>
    </Modal>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SleepSkeleton() {
  const pulseSV = useSharedValue(0.3);

  useEffect(() => {
    pulseSV.value = withRepeat(
      withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulseSV);
  }, []);

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: pulseSV.value,
  }));

  function Block({
    w,
    h,
    r = 12,
    style,
  }: {
    w: number | string;
    h: number;
    r?: number;
    style?: any;
  }) {
    return (
      <Animated.View
        style={[
          {
            width: w as any,
            height: h,
            borderRadius: r,
            backgroundColor: "rgba(255,255,255,0.07)",
          },
          pulseAnim,
          style,
        ]}
      />
    );
  }

  function Circle({ size }: { size: number }) {
    return (
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "rgba(255,255,255,0.07)",
          },
          pulseAnim,
        ]}
      />
    );
  }

  function GlassSkeleton({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: any;
  }) {
    return (
      <View
        style={[
          {
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            padding: 16,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScreenShell ambient={<AmbientBackground subtle />}>
      <View className="px-1 pt-1 pb-4">
        {/* Header */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between">
            <Block w={90} h={32} r={8} />
            <Block w={70} h={26} r={20} />
          </View>
          <Block w={160} h={16} r={6} style={{ marginTop: 8 }} />
        </View>

        {/* Tab toggle */}
        <View className="flex-row gap-2 mb-5 p-1">
          <Block w="50%" h={38} r={10} />
          <Block w="50%" h={38} r={10} />
        </View>

        {/* Start sleep button */}
        <View className="items-center justify-center py-2">
          <Circle size={196} />
        </View>

        {/* Info text */}
        <Block
          w={240}
          h={14}
          r={4}
          style={{ alignSelf: "center", marginTop: 4, marginBottom: 16 }}
        />

        {/* Circular slider card */}
        <GlassSkeleton style={{ alignItems: "center", paddingVertical: 16 }}>
          <Circle size={200} />
          {/* Time labels row */}
          <View className="flex-row justify-between w-full mt-4 px-2">
            <View className="items-center gap-1.5">
              <Block w={14} h={14} r={7} />
              <Block w={40} h={10} r={3} />
              <Block w={60} h={18} r={4} />
            </View>
            <View className="items-center gap-1.5">
              <Block w={14} h={14} r={7} />
              <Block w={40} h={10} r={3} />
              <Block w={60} h={18} r={4} />
            </View>
            <View className="items-center gap-1.5">
              <Block w={14} h={14} r={7} />
              <Block w={40} h={10} r={3} />
              <Block w={60} h={18} r={4} />
            </View>
          </View>
        </GlassSkeleton>

        {/* Duration section header */}
        <View className="flex-row items-center gap-2 px-1 mt-2">
          <Block w={14} h={14} r={7} />
          <Block w={60} h={11} r={3} />
          <View className="flex-1 h-px bg-white/[0.04]" />
        </View>

        {/* Preset cards */}
        <View className="flex-row gap-2.5 justify-center mt-3">
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="flex-1 items-center py-3 rounded-2xl bg-white/[0.03] gap-1.5"
            >
              <Block w={20} h={20} r={10} />
              <Block w={32} h={14} r={4} />
              <Block w={36} h={10} r={3} />
            </View>
          ))}
        </View>

        {/* Smart alarm toggle */}
        <GlassSkeleton style={{ marginTop: 12 }}>
          <View className="flex-row items-center gap-3">
            <Block w={28} h={28} r={14} />
            <View className="flex-1 gap-1.5">
              <Block w={140} h={14} r={4} />
              <Block w={180} h={10} r={3} />
            </View>
            <Block w={48} h={28} r={14} />
          </View>
        </GlassSkeleton>

        {/* AI insight card */}
        <GlassSkeleton style={{ marginTop: 12 }}>
          <View className="flex-row items-center gap-1.5">
            <Block w={14} h={14} r={7} />
            <Block w={70} h={11} r={3} />
          </View>
          <Block w="100%" h={14} r={4} style={{ marginTop: 10 }} />
          <Block w="75%" h={14} r={4} style={{ marginTop: 6 }} />
        </GlassSkeleton>

        {/* Stats row */}
        <View className="flex-row gap-2.5 mt-4">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="flex-1 rounded-2xl bg-white/[0.03] overflow-hidden"
            >
              <View
                style={{ height: 3, backgroundColor: "rgba(255,255,255,0.05)" }}
              />
              <View className="px-3 py-3 items-center gap-2">
                <Block w={14} h={14} r={7} />
                <Block w={36} h={10} r={3} />
                <Block w={40} h={20} r={4} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type SleepSegment = "tonight" | "routine" | "analysis";

type Params = { tab?: string; preset?: string };

export default function SleepScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, isGuestMode } = useAuth();
  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "Sleeper";
  const greeting = useGreeting(displayName);
  const { sessions, addSession } = useSleep();
  const { schedule, saveSchedule } = useSleepSchedule(user?.uid, isGuestMode);
  const readiness = useSleepReadiness();

  // ── Default preset ────────────────────────────────────────────────────────
  const defaultNight =
    NIGHT_PRESETS.find((p) => p.id === "night-7.5") ?? NIGHT_PRESETS[2];
  const initialPreset =
    (params.preset && getPresetById(params.preset)) || defaultNight;

  const tracker = usePersistedSleepTracker({
    uid: user?.uid,
    defaultPreset: initialPreset,
  });

  const {
    hydrated,
    busy,
    selectedPreset,
    tracking,
    alarmPastDue,
    startTime,
    wakeAt,
    startSleep,
    stopSleep,
    snooze,
    clearSession,
    refreshAlarmState,
    smartAlarmEnabled,
    setSmartAlarmEnabled,
    sleepStage,
  } = tracker;

  // ── Tab state ─────────────────────────────────────────────────────────────
  const initialTab: SleepSegment =
    params.tab === "routine"
      ? "routine"
      : params.tab === "analysis"
        ? "analysis"
        : "tonight";
  const [segment, setSegment] = useState<SleepSegment>(initialTab);

  useEffect(() => {
    if (params.tab === "routine") setSegment("routine");
    if (params.tab === "tonight") setSegment("tonight");
    if (params.tab === "analysis") setSegment("analysis");
  }, [params.tab]);

  useEffect(() => {
    if (tracker.tracking) setSegment("tonight");
  }, [tracker.tracking]);

  // ── Bedtime / wake selection ──────────────────────────────────────────────
  const defaultBedtime = schedule?.bedtime ?? "23:00";
  const defaultWake = schedule?.wakeTime ?? "06:30";
  const [sliderBedtime, setSliderBedtime] = useState(defaultBedtime);
  const [sliderWakeTime, setSliderWakeTime] = useState(defaultWake);

  useEffect(() => {
    if (schedule) {
      setSliderBedtime(schedule.bedtime);
      setSliderWakeTime(schedule.wakeTime);
    }
  }, [schedule]);

  // ── Elapsed timer + live device clock ─────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (tracking && startTime) {
      const tick = () => {
        setElapsed(
          Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)),
        );
        setClockNow(new Date());
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tracking, startTime, hydrated]);

  // Live clock parts for the tracking hero.
  const clockHour24 = clockNow.getHours();
  const clockHm = `${String(clockHour24 % 12 === 0 ? 12 : clockHour24 % 12).padStart(2, "0")} : ${String(clockNow.getMinutes()).padStart(2, "0")}`;
  const clockAmPm = clockHour24 < 12 ? "AM" : "PM";
  const clockDate = clockNow.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // ── Alarm state refresh ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => refreshAlarmState(), 1000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refreshAlarmState();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [tracking, refreshAlarmState]);

  // ── Alarm settings for test preview ──────────────────────────────────────
  const { selectedRingtone, alarmVolume } = useAlarmSettings();
  const [showTestAlarm, setShowTestAlarm] = useState(false);

  // ── Manual time entry (no dial) ───────────────────────────────────────────
  const [editingTime, setEditingTime] = useState<"bedtime" | "wake" | null>(
    null,
  );

  // ── Sleep goal selection (Min / Recommended / Optimal / Recovery) ─────────
  // The planned duration drives the goal label; snap to a named goal only when
  // the actual planned duration matches one exactly, else describe it generically.
  const plannedHours =
    Math.round((timeDiffMinutes(sliderBedtime, sliderWakeTime) / 60) * 10) / 10;
  const matchedGoal = SLEEP_GOALS.find((g) => g.hours === plannedHours);
  const goalLabel = matchedGoal
    ? `${matchedGoal.label} (${matchedGoal.hours}h)`
    : `Custom (${plannedHours}h)`;

  // ── Save Tonight's Plan ────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  const handleSavePlan = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const planMinutes = timeDiffMinutes(sliderBedtime, sliderWakeTime);
    try {
      await saveSchedule({
        uid: user?.uid ?? "guest",
        bedtime: sliderBedtime,
        wakeTime: sliderWakeTime,
        duration: Math.round((planMinutes / 60) * 10) / 10,
        activeDays: schedule?.activeDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
        reminderEnabled: schedule?.reminderEnabled ?? true,
        reminderMinutes: schedule?.reminderMinutes ?? 30,
        sleepNotesEnabled: schedule?.sleepNotesEnabled ?? true,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedPulse(true);
      setTimeout(() => setSavedPulse(false), 2000);
    } catch {
      /* local copy already saved by the hook */
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    sliderBedtime,
    sliderWakeTime,
    saveSchedule,
    user?.uid,
    schedule,
  ]);

  // ── AI insight about tonight's plan ────────────────────────────────────────
  const planInsight = useSleepPlanInsight({
    bedtime: sliderBedtime,
    wakeTime: sliderWakeTime,
    goalLabel,
  });

  // ── Breathing & Rating ────────────────────────────────────────────────────
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(3);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);
  const actionBusyRef = useRef(false);

  const handleStartSleep = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    // Use the slider's actual wake time instead of the preset duration
    const sliderMinutes = timeDiffMinutes(sliderBedtime, sliderWakeTime);
    const wakeTimeLabel = `Sleep until ${formatTimeAmPm(sliderWakeTime)}`;
    const ok = await startSleep(
      sliderMinutes,
      wakeTimeLabel,
      selectedPreset.id,
    );
    actionBusyRef.current = false;
    if (ok) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [busy, sliderBedtime, sliderWakeTime, selectedPreset, startSleep]);

  const handleStop = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    setShowBreathing(true);
    actionBusyRef.current = false;
  }, [busy]);

  const handleSnooze = useCallback(async () => {
    if (snoozeCount >= 3 || busy) return;
    await snooze();
    setSnoozeCount((prev) => prev + 1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [snooze, snoozeCount, busy]);

  const handleBreathingComplete = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    await stopSleep();
    setPendingEnd(new Date());
    setSelectedQuality(3);
    setShowBreathing(false);
    setShowRating(true);
    actionBusyRef.current = false;
  }, [busy, stopSleep]);

  const handleSkipRating = useCallback(async () => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setShowRating(false);
    await clearSession();
    setPendingEnd(null);
    actionBusyRef.current = false;
  }, [clearSession]);

  const handleSaveSession = useCallback(async () => {
    if (actionBusyRef.current || !startTime || !pendingEnd) return;
    actionBusyRef.current = true;
    const durationMinutes = Math.round(
      (pendingEnd.getTime() - startTime.getTime()) / 60000,
    );
    if (durationMinutes >= 1) {
      try {
        await addSession({
          date: startTime.toISOString().slice(0, 10),
          startTime: startTime.getTime(),
          endTime: pendingEnd.getTime(),
          durationMinutes,
          quality: selectedQuality,
        });
      } catch {
        /* shown by context */
      }
    }
    setShowRating(false);
    await clearSession();
    setPendingEnd(null);
    actionBusyRef.current = false;
  }, [addSession, clearSession, pendingEnd, selectedQuality, startTime]);

  // ── Animations ────────────────────────────────────────────────────────────
  // Gentle breathing pulse on the "time asleep" number.
  const timerScale = useSharedValue(1);

  useEffect(() => {
    if (!tracking) {
      cancelAnimation(timerScale);
      timerScale.value = withTiming(1);
    } else {
      timerScale.value = withRepeat(
        withTiming(1.03, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(timerScale);
    };
  }, [tracking]);

  const timerScaleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));
  // ── Stats ─────────────────────────────────────────────────────────────────
  const streak = calculateStreak(sessions);
  const avg = avgDuration(sessions);
  const lastSession = sessions[0];

  // ── Render ────────────────────────────────────────────────────────────────

  if (!hydrated) {
    return <SleepSkeleton />;
  }

  // ── Ambient glow behind the tracking hero ──────────────────────────────
  function TrackingGlow({ frame: _f }: { frame: number }) {
    return (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: "18%",
          alignSelf: "center",
          width: 320,
          height: 320,
        }}
      >
        <Svg width={320} height={320} viewBox="0 0 380 380">
          <Defs>
            <SvgRadialGradient id="sleepBgGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={SLEEP.accent} stopOpacity={0.25} />
              <Stop offset="55%" stopColor={SLEEP.accent} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={SLEEP.accent} stopOpacity={0} />
            </SvgRadialGradient>
          </Defs>
          <Circle cx={190} cy={190} r={190} fill="url(#sleepBgGlow)" />
        </Svg>
      </View>
    );
  }

  return (
    <ScreenShell safeBottom pillar="sleep" ambient={<AmbientBackground />}>
      <ScreenTransition>
        <View className="px-1 pt-1 pb-4">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "800",
                  color: "#FFFFFF",
                  letterSpacing: -0.5,
                }}
              >
                Sleep
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 2,
                  maxWidth: 180,
                }}
              >
                {greeting}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <SubscriptionBadge />
              {/* Readiness indicator */}
              {!tracking && (
                <View className="flex-row items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10">
                  <ReadinessRing
                    score={readiness.score}
                    color={readiness.color}
                    size={30}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: 7.5,
                        fontWeight: "800",
                        letterSpacing: 1,
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      READY
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: readiness.color,
                      }}
                    >
                      {readiness.label.split(" ")[0]}
                    </Text>
                  </View>
                </View>
              )}
              {/* Alarm settings button */}
              <TouchableOpacity
                onPress={() => router.push(ROUTES.appAlarmSettings)}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full items-center justify-center bg-white/[0.06] border border-white/10"
              >
                <Settings size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              {tracking && (
                <View
                  style={{ flexShrink: 0 }}
                  className="flex-row items-center gap-1.5 bg-white/[0.06] px-3 py-1.5 rounded-full border border-white/10"
                >
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: 0.5,
                    }}
                  >
                    Tracking
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tab toggle — premium segmented control with gradient active pill */}
          {!tracking && (
            <View
              style={{
                flexDirection: "row",
                gap: 4,
                marginBottom: 20,
                padding: 5,
                borderRadius: 18,
                backgroundColor: "rgba(12,8,28,0.6)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              {[
                {
                  id: "tonight" as const,
                  label: "Tonight",
                  icon: Moon,
                  iconFocused: MoonStar,
                },
                { id: "routine" as const, label: "Routine", icon: Clock },
                { id: "analysis" as const, label: "Analysis", icon: BarChart3 },
              ].map((tab) => {
                const active = segment === tab.id;
                const TabIcon =
                  active && tab.iconFocused ? tab.iconFocused : tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      setSegment(tab.id);
                    }}
                    activeOpacity={0.85}
                    style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
                  >
                    {active ? (
                      <LinearGradient
                        colors={["#3b82f6", "#7c3aed"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 11,
                          shadowColor: "#3b82f6",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.45,
                          shadowRadius: 10,
                          elevation: 6,
                        }}
                      >
                        <TabIcon size={15} color="#fff" />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "800",
                            color: "#FFFFFF",
                            letterSpacing: 0.2,
                          }}
                        >
                          {tab.label}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 11,
                        }}
                      >
                        <TabIcon size={15} color="rgba(255,255,255,0.4)" />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {tab.label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── TRACKING STATE ─────────────────────────────────────────────────── */}
          {tracking ? (
            <View className="gap-6 pt-2">
              {/* Ambient glow behind the clock/moon area */}
              <TrackingGlow frame={0} />

              {/* Live device clock */}
              <View className="items-center">
                <View className="flex-row items-end">
                  <Text
                    style={{
                      fontSize: 66,
                      fontWeight: "800",
                      color: "#FFFFFF",
                      letterSpacing: -2,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {clockHm}
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "800",
                      color: "rgba(255,255,255,0.85)",
                      marginBottom: 14,
                      marginLeft: 6,
                    }}
                  >
                    {clockAmPm}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 2,
                  }}
                >
                  {clockDate}
                </Text>
              </View>

              {/* Moon + drifting golden wave */}
              <MoonWave width={Math.min(width - 48, 340)} />

              {/* Time asleep */}
              <View className="items-center">
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 2.5,
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  TIME ASLEEP
                </Text>
                <Animated.View style={timerScaleAnim}>
                  <Text
                    style={{
                      fontSize: 34,
                      fontWeight: "800",
                      color: "#FFFFFF",
                      fontVariant: ["tabular-nums"],
                      letterSpacing: 1,
                      marginTop: 4,
                    }}
                  >
                    {formatElapsed(elapsed)}
                  </Text>
                </Animated.View>
              </View>

              {/* Alarm + Sounds list cards — shared ActionCard */}
              <View>
                <ActionCard
                  icon={Clock}
                  title="Alarm"
                  description={
                    wakeAt
                      ? alarmPastDue
                        ? "Passed — wake when ready"
                        : `${formatWakeTime(wakeAt)} · in ${formatAlarmCountdown(wakeAt)}`
                      : "—"
                  }
                  accent="#a78bfa"
                  descriptionColor={alarmPastDue ? "#FF9800" : undefined}
                  trailing={
                    smartAlarmEnabled ? (
                      <View
                        className={`px-2.5 py-0.5 rounded-full border ${stageBadgeClass(sleepStage)}`}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#FFFFFF",
                            fontWeight: "700",
                            letterSpacing: 0.3,
                          }}
                        >
                          {sleepStage}
                        </Text>
                      </View>
                    ) : null
                  }
                />
                <ActionCard
                  icon={Music}
                  title="Sounds & Music"
                  description="Ringtone & alarm volume"
                  accent="#4FC3F7"
                  onPress={() => router.push(ROUTES.appAlarmSettings)}
                />
              </View>

              {/* Snooze (only when alarm is past due) */}
              {alarmPastDue && snoozeCount < 3 && (
                <TouchableOpacity
                  onPress={handleSnooze}
                  disabled={busy}
                  activeOpacity={0.75}
                  className="self-center flex-row items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/[0.04]"
                >
                  <Bell size={16} color="rgba(255,255,255,0.6)" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    Snooze 10 min ({3 - snoozeCount} left)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Wake up — hold to confirm */}
              <View className="items-center">
                <HoldButton
                  label="Wake up"
                  onComplete={handleStop}
                  disabled={busy}
                  bg="#0E1116"
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.4)",
                    marginTop: 10,
                  }}
                >
                  Hold to wake up
                </Text>
              </View>
            </View>
          ) : segment === "tonight" ? (
            <View className="gap-5">
              {/* ── Main Sleep Setup Card — matches HomeDashboard aesthetic ── */}
              <GlassCard noPadding tint={SLEEP.cardTint}>
                {/* 24h sleep dial */}
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 20,
                    paddingBottom: 16,
                  }}
                >
                  <SleepDial
                    bedtime={sliderBedtime}
                    wakeTime={sliderWakeTime}
                    alarmWindowEnabled={smartAlarmEnabled}
                    radius={100}
                    onBedtimeChange={setSliderBedtime}
                    onWakeTimeChange={setSliderWakeTime}
                  />
                </View>

                <View className="h-px bg-white/[0.06]" />

                {/* Bedtime row */}
                <TouchableOpacity
                  onPress={() => setEditingTime("bedtime")}
                  activeOpacity={0.7}
                  className="flex-row items-center px-4"
                  style={{ paddingVertical: 16, gap: 12 }}
                >
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      backgroundColor: "rgba(96,165,250,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(96,165,250,0.28)",
                    }}
                  >
                    <Moon size={18} color="#60a5fa" fill="#60a5fa" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#f6f8fc",
                      }}
                    >
                      Bedtime
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "rgba(245,247,251,0.4)",
                        marginTop: 1,
                      }}
                    >
                      {(() => {
                        const diffH = timeDiffMinutes(
                          sliderBedtime,
                          sliderWakeTime,
                        );
                        const h = Math.floor(diffH / 60);
                        const m = diffH % 60;
                        return `${h}h${m > 0 ? ` ${m}m` : ""} of sleep`;
                      })()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: "#60a5fa",
                      }}
                    >
                      {formatTimeAmPm(sliderBedtime)}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "rgba(245,247,251,0.2)",
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: "rgba(245,247,251,0.3)",
                          letterSpacing: 1,
                        }}
                      >
                        TAP TO SET
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View className="h-px bg-white/[0.06]" />

                {/* Alarm row */}
                <TouchableOpacity
                  onPress={() => setEditingTime("wake")}
                  activeOpacity={0.7}
                  className="flex-row items-center px-4"
                  style={{ paddingVertical: 16, gap: 12 }}
                >
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      backgroundColor: "rgba(167,139,250,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(167,139,250,0.28)",
                    }}
                  >
                    <Bell size={18} color="#a78bfa" fill="#a78bfa" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#f6f8fc",
                      }}
                    >
                      Wake Up
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "rgba(245,247,251,0.4)",
                        marginTop: 1,
                      }}
                    >
                      {smartAlarmEnabled
                        ? `Window: ${formatTimeAmPm(addMinutesToTime(sliderWakeTime, -30))} — ${formatTimeAmPm(sliderWakeTime)}`
                        : "Alarm set"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: "#a78bfa",
                      }}
                    >
                      {formatTimeAmPm(sliderWakeTime)}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      {smartAlarmEnabled && (
                        <View
                          className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25"
                          style={{ marginRight: 4 }}
                        >
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "800",
                              color: "#34d399",
                              letterSpacing: 0.5,
                            }}
                          >
                            SMART
                          </Text>
                        </View>
                      )}
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "rgba(245,247,251,0.2)",
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: "rgba(245,247,251,0.3)",
                          letterSpacing: 1,
                        }}
                      >
                        TAP TO SET
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View className="h-px bg-white/[0.06]" />
                <View style={{ height: 14 }} />

                {/* Sleep goal cards — Minimum / Recommended / Optimal / Recovery */}
                <View style={{ paddingHorizontal: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <Sparkles size={12} color="rgba(245,247,251,0.45)" />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        letterSpacing: 1.5,
                        color: "rgba(245,247,251,0.45)",
                      }}
                    >
                      SLEEP GOAL
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {SLEEP_GOALS.map((g) => {
                      const GoalIcon = g.icon;
                      // Highlight the goal that matches the actual planned duration so
                      // the selection stays in sync after dragging the dial.
                      const active = plannedHours === g.hours;
                      return (
                        <TouchableOpacity
                          key={g.hours}
                          onPress={() => {
                            void Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            // Keep the chosen bedtime; shift wake to hit the goal duration.
                            setSliderWakeTime(
                              addMinutesToTime(
                                sliderBedtime,
                                Math.round(g.hours * 60),
                              ),
                            );
                          }}
                          activeOpacity={0.8}
                          style={{
                            flex: 1,
                            alignItems: "center",
                            paddingVertical: 12,
                            borderRadius: 18,
                            borderWidth: 1.5,
                            backgroundColor: active
                              ? `${g.color}1f`
                              : "rgba(255,255,255,0.04)",
                            borderColor: active
                              ? g.color
                              : "rgba(255,255,255,0.1)",
                            shadowColor: g.color,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: active ? 0.35 : 0,
                            shadowRadius: active ? 12 : 0,
                          }}
                        >
                          {active && (
                            <View
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: g.color,
                              }}
                            />
                          )}
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 4,
                              backgroundColor: active
                                ? `${g.color}30`
                                : "rgba(255,255,255,0.06)",
                            }}
                          >
                            <GoalIcon
                              size={13}
                              color={
                                active ? g.color : "rgba(245,247,251,0.45)"
                              }
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "800",
                              color: active
                                ? "#FFFFFF"
                                : "rgba(245,247,251,0.65)",
                            }}
                          >
                            {g.hours}h
                          </Text>
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: "700",
                              letterSpacing: 0.6,
                              marginTop: 2,
                              color: active ? g.color : "rgba(245,247,251,0.3)",
                            }}
                          >
                            {g.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ height: 14 }} />

                {/* Divider */}
                <View className="h-px bg-white/[0.06]" />

                {/* Smart alarm toggle */}
                <TouchableOpacity
                  onPress={() => router.push(ROUTES.appAlarmSettings)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between px-4"
                  style={{ paddingVertical: 16, gap: 12 }}
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <View
                      className="items-center justify-center"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        backgroundColor: "rgba(26,143,255,0.14)",
                        borderWidth: 1,
                        borderColor: "rgba(26,143,255,0.28)",
                      }}
                    >
                      <Bell size={18} color="#1A8FFF" />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: "#f6f8fc",
                      }}
                    >
                      Smart Alarm
                    </Text>
                    {smartAlarmEnabled && (
                      <View className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "700",
                            color: "#34d399",
                            letterSpacing: 0.5,
                          }}
                        >
                          On
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => setShowTestAlarm(true)}
                      activeOpacity={0.7}
                      className="w-7 h-7 rounded-full items-center justify-center bg-white/[0.04] border border-white/10"
                    >
                      <Play size={11} color="rgba(255,255,255,0.35)" />
                    </TouchableOpacity>
                    <ToggleSwitch
                      value={smartAlarmEnabled}
                      onToggle={() => setSmartAlarmEnabled(!smartAlarmEnabled)}
                    />
                    <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
                  </View>
                </TouchableOpacity>

                {/* Divider */}
                <View className="h-px bg-white/[0.06]" />

                {/* AI Insight card */}
                <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
                  <View
                    style={{
                      borderRadius: 18,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: "rgba(167,139,250,0.3)",
                      shadowColor: "rgba(167,139,250,0.2)",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                    }}
                  >
                    <LinearGradient
                      colors={[
                        "rgba(167,139,250,0.18)",
                        "rgba(79,195,247,0.1)",
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: 18,
                      }}
                    >
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: "rgba(167,139,250,0.22)",
                          borderWidth: 1,
                          borderColor: "rgba(167,139,250,0.35)",
                        }}
                      >
                        <Sparkles size={16} color="#c4b5fd" />
                      </View>
                      <View style={{ flex: 1, flexShrink: 1 }}>
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "800",
                              letterSpacing: 1.3,
                              color: "#c4b5fd",
                            }}
                          >
                            {planInsight.isAi ? "AI INSIGHT" : "TONIGHT'S PLAN"}
                          </Text>
                          {planInsight.loading && (
                            <View
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: "#c4b5fd" }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: 13.5,
                            lineHeight: 21,
                            fontWeight: "500",
                            color: "rgba(245,247,251,0.9)",
                            marginTop: 6,
                          }}
                        >
                          {planInsight.text}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action buttons — Save (secondary) + Start Sleep (primary) */}
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 18,
                    gap: 12,
                  }}
                >
                  {/* Save Tonight's Plan */}
                  <TouchableOpacity
                    onPress={handleSavePlan}
                    disabled={saving}
                    activeOpacity={0.8}
                    className="w-full flex-row items-center justify-center gap-2 border"
                    style={{
                      minHeight: 56,
                      borderRadius: 18,
                      backgroundColor: savedPulse
                        ? "rgba(52,211,153,0.16)"
                        : "rgba(255,255,255,0.05)",
                      borderColor: savedPulse
                        ? "rgba(52,211,153,0.5)"
                        : "rgba(255,255,255,0.1)",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {savedPulse ? (
                      <>
                        <Check size={16} color="#34d399" />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "800",
                            color: "#34d399",
                            letterSpacing: 0.5,
                          }}
                        >
                          Plan Saved
                        </Text>
                      </>
                    ) : (
                      <>
                        <Moon size={15} color="rgba(245,247,251,0.7)" />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "800",
                            color: "rgba(245,247,251,0.8)",
                            letterSpacing: 0.5,
                          }}
                        >
                          Save Tonight’s Plan
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Start Sleep CTA — premium gradient button (matches onboarding) */}
                  <GradientCTA
                    label="START SLEEP"
                    sublabel={`WAKE AT ${formatTimeAmPm(sliderWakeTime).toUpperCase()}`}
                    icon={<MoonStar size={20} color="#fff" />}
                    onPress={handleStartSleep}
                    disabled={busy}
                    colors={["#3b82f6", "#7c3aed", "#c026d3"]}
                    glowColor="rgba(124,58,237,0.5)"
                    letterSpacing={2}
                  />
                </View>
              </GlassCard>

              {/* Stats row — compact text */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  paddingVertical: 12,
                }}
              >
                {lastSession?.durationMinutes != null && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#a78bfa",
                      }}
                    />
                    <Text
                      style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}
                    >
                      Last:{" "}
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: "700",
                        }}
                      >
                        {formatDuration(lastSession.durationMinutes)}
                      </Text>
                    </Text>
                  </View>
                )}
                {avg > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#4FC3F7",
                      }}
                    />
                    <Text
                      style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}
                    >
                      Avg:{" "}
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: "700",
                        }}
                      >
                        {formatDuration(avg)}
                      </Text>
                    </Text>
                  </View>
                )}
                {streak >= 1 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#FF9800",
                      }}
                    />
                    <Text
                      style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}
                    >
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: "700",
                        }}
                      >
                        {streak}d
                      </Text>{" "}
                      streak
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : segment === "routine" ? (
            /* ── ROUTINE TAB ────────────────────────────────────────────────── */
            <SleepRoutinePanel />
          ) : (
            /* ── ANALYSIS TAB ───────────────────────────────────────────────── */
            <SleepAnalysisPanel onStartSession={() => setSegment("tonight")} />
          )}

          {/* Modals */}
          <Modal
            visible={showBreathing}
            animationType="fade"
            statusBarTranslucent
          >
            <BreatheToDismiss
              onComplete={handleBreathingComplete}
              onEmergencySkip={handleBreathingComplete}
            />
          </Modal>

          <SleepQualityModal
            visible={showRating}
            selectedQuality={selectedQuality}
            onSelectQuality={setSelectedQuality}
            onSave={handleSaveSession}
            onSkip={handleSkipRating}
          />

          <TestAlarmModal
            visible={showTestAlarm}
            selectedRingtone={selectedRingtone}
            alarmVolume={alarmVolume}
            onDismiss={() => setShowTestAlarm(false)}
          />

          {/* Full-screen Bedtime / Alarm picker for the Bedtime / Wake cards */}
          <SleepTimePickerSheet
            visible={editingTime !== null}
            initialTab={editingTime === "wake" ? "alarm" : "bedtime"}
            onClose={() => setEditingTime(null)}
            bedtime={sliderBedtime}
            wakeTime={sliderWakeTime}
            onBedtimeChange={setSliderBedtime}
            onWakeTimeChange={setSliderWakeTime}
            alarmEnabled={smartAlarmEnabled}
            onAlarmEnabledChange={setSmartAlarmEnabled}
            uid={user?.uid}
            isGuestMode={isGuestMode}
          />
        </View>
      </ScreenTransition>
    </ScreenShell>
  );
}
