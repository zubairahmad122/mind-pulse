import { ScreenShell } from "@/components/layout/ScreenShell";
import { useSleepLock } from "@/components/layout/GlassTabBar";
import { BreatheToDismiss } from "@/components/sleep/BreatheToDismiss";
import { HoldButton } from "@/components/sleep/HoldButton";
import { MoonWave } from "@/components/sleep/MoonWave";
import { SleepAnalysisPanel } from "@/components/sleep/SleepAnalysisPanel";
import { SleepDial } from "@/components/sleep/SleepDial";
import { SleepQualityModal } from "@/components/sleep/SleepQualityModal";
import { SleepRoutinePanel } from "@/components/sleep/SleepRoutinePanel";
import { SleepSoundButton } from "@/components/sleep/SleepSoundButton";
import { SleepTimePickerSheet } from "@/components/sleep/SleepTimePickerSheet";
import { AmbientBackground } from "@/components/ui";
import { ActionCard } from "@/components/ui/ActionCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Shimmer, ShimmerCircle } from "@/components/sleep/Skeletons";
import { getPresetById, NIGHT_PRESETS, ROUTES } from "@/constants";
import { FONTS, PILLAR_COLORS, RADIUS, SHADOWS, SPACING, SURFACE_TINT, TYPOGRAPHY } from "@/constants/designSystem";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BarChart3,
  Bed,
  Bell,
  ChevronRight,
  Clock,
  Info,
  Moon,
  MoonStar,
  Music,
  Settings,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  LayoutAnimation,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
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
import { useAutoDim } from "@/hooks/useAutoDim";
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
  nextOccurrenceOfTime,
  sleepSessionDate,
} from "@/utils/sleepUtils";
import { getLocalDateISO } from "@/utils/dateUtils";
import { recordActivity } from "@/stores/useActivityStore";

// Enable smooth height animations (e.g. AI insight expand) on Android.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Add minutes to a "HH:MM" time string, wrapping around 24h. */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function currentTimeHHMM(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Format a "HH:MM" string to a short 12h display like "6:30 AM". */
function formatTimeAmPm(wakeTime: string): string {
  const [h, m] = wakeTime.split(":").map(Number);
  const hh24 = h % 24;
  const hour12 = hh24 === 0 ? 12 : hh24 > 12 ? hh24 - 12 : hh24;
  const ampm = hh24 < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function LiveSleepClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour24 = now.getHours();
  const hm = `${String(hour24 % 12 === 0 ? 12 : hour24 % 12).padStart(2, "0")} : ${String(now.getMinutes()).padStart(2, "0")}`;
  const amPm = hour24 < 12 ? "AM" : "PM";
  const date = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <View className="items-center">
      <View className="flex-row items-end">
        <Text style={liveClockStyles.time}>{hm}</Text>
        <Text style={liveClockStyles.period}>{amPm}</Text>
      </View>
      <Text style={liveClockStyles.date}>{date}</Text>
    </View>
  );
}

function ElapsedSleepTime({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)),
  );
  const scale = useSharedValue(1);

  useEffect(() => {
    const tick = () =>
      setElapsed(
        Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)),
      );
    const id = setInterval(tick, 1000);
    scale.value = withRepeat(
      withTiming(1.03, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      clearInterval(id);
      cancelAnimation(scale);
    };
  }, [scale, startTime]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="items-center">
      <Text style={elapsedStyles.label}>TIME ASLEEP</Text>
      <Animated.View style={scaleStyle}>
        <Text style={elapsedStyles.value}>{formatElapsed(elapsed)}</Text>
      </Animated.View>
    </View>
  );
}

function AccidentalStartCancel({
  startTime,
  busy,
  onCancel,
}: {
  startTime: Date;
  busy: boolean;
  onCancel: () => void;
}) {
  const remainingNow = useCallback(() =>
    Math.max(
      0,
      10 * 60 - Math.floor((Date.now() - startTime.getTime()) / 1000),
    ), [startTime]);
  const [remaining, setRemaining] = useState(remainingNow);

  useEffect(() => {
    const id = setInterval(() => setRemaining(remainingNow()), 1000);
    return () => clearInterval(id);
  }, [remainingNow]);

  if (remaining <= 0) return null;
  return (
    <TouchableOpacity
      onPress={onCancel}
      disabled={busy}
      activeOpacity={0.75}
      className="self-center items-center px-6 py-3 rounded-full border border-red-300/20 bg-red-400/[0.07]"
    >
      <Text style={elapsedStyles.cancel}>Cancel accidental start</Text>
      <Text style={elapsedStyles.remaining}>
        Available for {formatElapsed(remaining)}
      </Text>
    </TouchableOpacity>
  );
}

function AutoDimToggleRow({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={autoDimStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={autoDimStyles.label}>Auto Dim</Text>
        <Text style={autoDimStyles.sub}>Fades the screen after 30s idle</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(!enabled);
        }}
        activeOpacity={0.8}
        style={[
          autoDimStyles.switchTrack,
          { justifyContent: enabled ? "flex-end" : "flex-start" },
          enabled && { backgroundColor: SLEEP_ACCENT },
        ]}
      >
        <View style={autoDimStyles.switchThumb} />
      </TouchableOpacity>
    </View>
  );
}

const autoDimStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.card,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sub: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    backgroundColor: "#2A2460",
    flexDirection: "row",
    alignItems: "center",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
});

const liveClockStyles = StyleSheet.create({
  time: {
    fontSize: 66,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  period: {
    fontSize: 22,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 14,
    marginLeft: 6,
  },
  date: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
});

const elapsedStyles = StyleSheet.create({
  label: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: "rgba(255,255,255,0.5)",
  },
  value: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
    marginTop: 4,
  },
  cancel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,180,180,0.9)",
  },
  remaining: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.38)",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});

/**
 * Truncate text at a whole-word boundary (never mid-word / mid-number) and
 * append an ellipsis. Avoids ugly cuts like "Aiming for a full 7…".
 */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const head = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(
    /[\s,.;:!?-]+$/,
    "",
  );
  return `${head}… `;
}

/** Calculate minutes between two "HH:MM" times, wrapping overnight if needed. */
function timeDiffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff <= 0) diff += 1440;
  return diff;
}

// ── Sleep pillar accent — the frozen spec token (section 16: Sleep = Indigo) ──
const SLEEP_ACCENT = PILLAR_COLORS.sleep;
// ── Tonight hero surface — deliberate exception to the frozen HeroCard
// violet gradient (same precedent as Home's Featured card): the dial itself
// now supplies the card's color, so the surface underneath it should read as
// a darker premium navy, not a second flat-purple slab. ─────────────────────
const SLEEP_HERO_TINT = ["#211A55", "#130F33"] as const;
// ── Local, not `SPACING.section` (32, frozen app-wide) — this screen's own
// density pass tightens Tonight's section rhythm without touching the
// shared token other screens still rely on. ─────────────────────────────────
const SLEEP_GAP = 20;

// ── Sleep goal cards — all one indigo accent (spec: "only one accent color
// per screen"), so no per-goal `color` field here anymore. ──────────────────
const SLEEP_GOALS = [
  { hours: 7, label: "Minimum", icon: Moon },
  { hours: 7.5, label: "Recommended", icon: Star },
  { hours: 8, label: "Optimal", icon: Sparkles },
  { hours: 9, label: "Recovery", icon: Bed },
] as const;

// ── Abbreviated labels for the compact segmented selector only — the full
// `label` above still drives the insight copy ("matches your Recommended
// goal") via `matchedGoal`, so it stays untouched. ──────────────────────────
const GOAL_SHORT_LABEL: Record<number, string> = {
  7: "Min",
  7.5: "Rec.",
  8: "Ideal",
  9: "Recovery",
};

// ── Tonight's Sleep hero card — its own style block so the card's four
// layers (header / metric / dial / bedtime-wake footer) read as one
// deliberate composition instead of loose inline styles. ────────────────────
const heroCardStyles = StyleSheet.create({
  card: {
    borderRadius: 26,
  },
  inner: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
  },
  glowWrap: {
    position: "absolute",
    top: 24,
    alignSelf: "center",
  },
  eyebrow: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: 1.4,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: "rgba(216,208,255,0.55)",
  },
  // Rendered inside the dial's clock face via `centerContent`.
  dialCenter: {
    alignItems: "center",
  },
  metric: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  metricCaption: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 2,
  },
  dialWrap: {
    alignItems: "center",
    marginTop: 10,
  },
  footerRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 10,
    marginTop: 14,
  },
  footerCol: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  footerRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.4)",
  },
  footerValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 3,
  },
  footerSub: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "rgba(93,216,224,0.8)",
    marginTop: 2,
  },
});

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
  const stroke = 2.5;
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

// Inline colors, not Tailwind classes — the old `bg-purple-500` for "deep"
// was the same off-brand-purple bug as the toggle/dismiss-button fixes.
// Same bg/border/text-color shape as the SMART/On badges elsewhere on this
// screen (colored text on a light tint, not white text on a mid tint).
const SLEEP_STAGE_STYLE: Record<SleepStage, { bg: string; border: string; text: string }> = {
  light: { bg: "rgba(50,213,131,0.15)", border: "rgba(50,213,131,0.35)", text: "#32D583" },
  rem: { bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.35)", text: "#38BDF8" },
  deep: { bg: "rgba(108,99,255,0.15)", border: "rgba(108,99,255,0.35)", text: PILLAR_COLORS.sleep },
};

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
      className="w-12 h-7 rounded-full p-0.5 justify-center border"
      style={{
        // Inline, not a `bg-app-purple` className — that Tailwind token is
        // #8B5CF6, a brighter purple than the frozen Sleep indigo.
        backgroundColor: value ? SLEEP_ACCENT : "rgba(255,255,255,0.06)",
        borderColor: value ? SLEEP_ACCENT : "rgba(255,255,255,0.1)",
      }}
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

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

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
  }, [pulseOpacity, pulseScale, selectedRingtone, visible]);

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
              backgroundColor: ringtone?.color ?? SLEEP_ACCENT,
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
            backgroundColor: (ringtone?.color ?? SLEEP_ACCENT) + "08",
          }}
        />

        {/* Icon container */}
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-5"
          style={{
            backgroundColor: (ringtone?.color ?? SLEEP_ACCENT) + "15",
            borderWidth: 1,
            borderColor: (ringtone?.color ?? SLEEP_ACCENT) + "30",
          }}
        >
          <RingIcon
            size={44}
            color={ringtone?.color ?? SLEEP_ACCENT}
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
                      ? (ringtone?.color ?? SLEEP_ACCENT)
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
          className="mt-12 w-full max-w-xs flex-row items-center justify-center gap-2.5 py-4 rounded-2xl"
          style={{
            backgroundColor: SLEEP_ACCENT,
            shadowColor: SLEEP_ACCENT,
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
            <Stop offset="0%" stopColor={SLEEP_ACCENT} stopOpacity={0.25} />
            <Stop offset="55%" stopColor={SLEEP_ACCENT} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={SLEEP_ACCENT} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Circle cx={190} cy={190} r={190} fill="url(#sleepBgGlow)" />
      </Svg>
    </View>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SkeletonDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        marginHorizontal: 16,
      }}
    />
  );
}

/** Compact icon + two-line label + trailing element — Bedtime / Wake / Alarm. */
function SkeletonRow({ trailing }: { trailing: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <Shimmer w={48} h={48} r={24} />
      <View style={{ flex: 1, gap: 6 }}>
        <Shimmer w={90} h={16} r={4} />
        <Shimmer w={140} h={12} r={3} />
      </View>
      {trailing}
    </View>
  );
}

function SleepSkeleton() {
  return (
    <ScreenShell pillar="sleep" ambient={<AmbientBackground />}>
      <View>
        {/* Header — title + subtitle, readiness pill + gear */}
        <View className="flex-row items-center justify-between">
          <View style={{ gap: 2 }}>
            <Shimmer w={110} h={32} r={8} />
            <Shimmer w={160} h={16} r={4} />
          </View>
          <View className="flex-row items-center gap-2">
            <Shimmer w={104} h={34} r={17} />
            <ShimmerCircle size={36} />
          </View>
        </View>

        {/* Segmented tabs */}
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            padding: 4,
            marginTop: SPACING.section,
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        >
          <Shimmer h={38} r={16} style={{ flex: 1 }} />
          <Shimmer h={38} r={16} style={{ flex: 1 }} />
          <Shimmer h={38} r={16} style={{ flex: 1 }} />
        </View>

        {/* Hero — 24h sleep dial card */}
        <GlassCard noPadding style={{ marginTop: SPACING.section, borderRadius: RADIUS.card, ...SHADOWS.medium }}>
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Shimmer w={140} h={13} r={4} style={{ marginBottom: 16 }} />
            <ShimmerCircle size={220} />
          </View>
        </GlassCard>

        {/* Bedtime / Wake Up card */}
        <GlassCard noPadding style={{ marginTop: SPACING.section, borderRadius: RADIUS.card, ...SHADOWS.medium }}>
          <SkeletonRow trailing={<Shimmer w={70} h={20} r={5} />} />
          <SkeletonDivider />
          <SkeletonRow trailing={<Shimmer w={70} h={20} r={5} />} />
        </GlassCard>

        {/* Sleep Goal — label above a plain chip row */}
        <View style={{ gap: 12, marginTop: SPACING.section }}>
          <Shimmer w={100} h={13} r={4} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, gap: 8 }}>
                <Shimmer w="100%" h={76} r={18} />
                <Shimmer w="70%" h={11} r={3} style={{ alignSelf: "center" }} />
              </View>
            ))}
          </View>
        </View>

        {/* Start Sleep CTA */}
        <Shimmer h={56} r={18} style={{ marginTop: SPACING.section }} />

        {/* Smart Alarm card */}
        <GlassCard noPadding style={{ marginTop: SPACING.section, borderRadius: RADIUS.card, ...SHADOWS.medium }}>
          <SkeletonRow trailing={<Shimmer w={48} h={28} r={14} />} />
        </GlassCard>

        {/* AI Insight card */}
        <Shimmer h={100} r={RADIUS.card} style={{ marginTop: SPACING.section }} />

        {/* Weekly Sleep */}
        <View style={{ gap: 12, marginTop: SPACING.section }}>
          <Shimmer w={120} h={13} r={4} />
          <Shimmer h={40} r={12} />
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
  const uid = user?.uid;
  const { sessions, addSession } = useSleep();
  const { schedule, saveSchedule } = useSleepSchedule(user?.uid, isGuestMode);
  const readiness = useSleepReadiness();
  const { setSleepLocked } = useSleepLock();

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
    alarmRingtoneId,
    updateAlarmRingtone,
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
    const nextSegment =
      params.tab === "routine"
        ? "routine"
        : params.tab === "analysis"
          ? "analysis"
          : params.tab === "tonight"
            ? "tonight"
            : null;
    if (!nextSegment) return;
    const id = setTimeout(() => setSegment(nextSegment), 0);
    return () => clearTimeout(id);
  }, [params.tab]);

  useEffect(() => {
    if (!tracker.tracking) return;
    const id = setTimeout(() => setSegment("tonight"), 0);
    return () => clearTimeout(id);
  }, [tracker.tracking]);

  // ── Bedtime / wake selection ──────────────────────────────────────────────
  const [initialSleepPlan] = useState(() => {
    const bedtime = currentTimeHHMM();
    return {
      bedtime,
      wakeTime: addMinutesToTime(bedtime, defaultNight.minutes),
    };
  });
  const defaultBedtime = schedule?.bedtime ?? initialSleepPlan.bedtime;
  const defaultWake = schedule?.wakeTime ?? initialSleepPlan.wakeTime;
  const [sliderBedtime, setSliderBedtime] = useState(defaultBedtime);
  const [sliderWakeTime, setSliderWakeTime] = useState(defaultWake);
  const initializedCurrentPlanRef = useRef(false);

  useEffect(() => {
    if (initializedCurrentPlanRef.current || !schedule) return;
    initializedCurrentPlanRef.current = true;
    const bedtime = currentTimeHHMM();
    const wakeTime = addMinutesToTime(
      bedtime,
      Math.round((schedule.duration ?? defaultNight.minutes / 60) * 60),
    );
    const id = setTimeout(() => {
      setSliderBedtime(bedtime);
      setSliderWakeTime(wakeTime);
    }, 0);
    return () => clearTimeout(id);
  }, [defaultNight.minutes, schedule]);

  // A running sleep session is intentionally kiosk-like: hide app navigation
  // and consume Android's hardware back action. The user can undo an accidental
  // start for ten minutes; after that, Wake up must be held to finish.
  useEffect(() => {
    setSleepLocked(tracking);
    if (!tracking) return;
    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => {
      backSubscription.remove();
      setSleepLocked(false);
    };
  }, [tracking, setSleepLocked]);

  // ── Night dimming ("Auto Dim") — dims everything but the clock/moon after
  // 30s idle, any touch anywhere restores it instantly. Pure in-app opacity,
  // not system brightness/keep-awake (that would need new native
  // permissions); this is the cross-platform-safe version of the same idea.
  // User-togglable and persisted via `useAutoDim`, shared with the Wake Time
  // setup sheet so both surfaces read/write the same preference.
  const { enabled: autoDimEnabled, setEnabled: setAutoDimEnabled } = useAutoDim();
  const DIM_IDLE_MS = 30000;
  const DIM_TARGET_OPACITY = 0.15;
  const dimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimOpacity = useSharedValue(1);

  const registerTrackingActivity = useCallback(() => {
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are updated through `.value`.
    dimOpacity.value = withTiming(1, { duration: 300 });
    if (!autoDimEnabled) return;
    dimTimerRef.current = setTimeout(() => {
      dimOpacity.value = withTiming(DIM_TARGET_OPACITY, { duration: 900 });
    }, DIM_IDLE_MS);
  }, [dimOpacity, autoDimEnabled]);

  useEffect(() => {
    if (!tracking) {
      if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are updated through `.value`.
      dimOpacity.value = 1;
      return;
    }
    registerTrackingActivity();
    return () => {
      if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    };
  }, [tracking, registerTrackingActivity, dimOpacity]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

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
  const {
    selectedRingtone,
    alarmVolume,
    loaded: alarmSettingsLoaded,
  } = useAlarmSettings();
  const [showTestAlarm, setShowTestAlarm] = useState(false);

  useEffect(() => {
    if (
      !hydrated ||
      !alarmSettingsLoaded ||
      !tracking ||
      !wakeAt ||
      wakeAt.getTime() <= Date.now() ||
      alarmRingtoneId === selectedRingtone
    ) {
      return;
    }

    void updateAlarmRingtone(selectedRingtone);
  }, [
    alarmRingtoneId,
    alarmSettingsLoaded,
    hydrated,
    selectedRingtone,
    tracking,
    updateAlarmRingtone,
    wakeAt,
  ]);

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

  // ── Auto-save tonight's plan whenever the user adjusts bed/wake times ───────
  // Debounced + skips the initial mount so we don't clobber a still-loading
  // schedule. No competing CTA — the plan persists silently.
  const autoSaveMounted = useRef(false);
  useEffect(() => {
    if (!autoSaveMounted.current) {
      autoSaveMounted.current = true;
      return;
    }
    const planMinutes = timeDiffMinutes(sliderBedtime, sliderWakeTime);
    const t = setTimeout(() => {
      void saveSchedule({
        uid: user?.uid ?? "guest",
        bedtime: sliderBedtime,
        wakeTime: sliderWakeTime,
        duration: Math.round((planMinutes / 60) * 10) / 10,
        activeDays: schedule?.activeDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
        reminderEnabled: schedule?.reminderEnabled ?? true,
        reminderMinutes: schedule?.reminderMinutes ?? 30,
        sleepNotesEnabled: schedule?.sleepNotesEnabled ?? true,
      }).catch(() => {
        /* local copy already saved by the hook */
      });
    }, 800);
    return () => clearTimeout(t);
  }, [sliderBedtime, sliderWakeTime, saveSchedule, user?.uid, schedule]);

  // ── AI insight about tonight's plan ────────────────────────────────────────
  const planInsight = useSleepPlanInsight({
    bedtime: sliderBedtime,
    wakeTime: sliderWakeTime,
    goalLabel,
  });
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [showReadinessInfo, setShowReadinessInfo] = useState(false);
  // Auto-dismiss the readiness explanation so it doesn't linger as a permanent
  // card competing with the content below.
  useEffect(() => {
    if (!showReadinessInfo) return;
    const t = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowReadinessInfo(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [showReadinessInfo]);

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
    const wakeAt = nextOccurrenceOfTime(sliderWakeTime);
    const wakeTimeLabel = `Sleep until ${formatTimeAmPm(sliderWakeTime)}`;
    const ok = await startSleep(
      wakeAt,
      wakeTimeLabel,
      selectedPreset.id,
      selectedRingtone,
    );
    actionBusyRef.current = false;
    if (ok) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [busy, sliderWakeTime, selectedPreset, selectedRingtone, startSleep]);

  // "Sleep Now" — the Bedtime/Wake Time setup sheet's direct-start CTA.
  // Reuses `handleStartSleep` as-is (same alarm scheduling, same tracker
  // start) and just closes the sheet; the screen then re-renders into the
  // Active Sleep view automatically once `tracking` flips true.
  const handleSleepNow = useCallback(() => {
    void handleStartSleep();
    setEditingTime(null);
  }, [handleStartSleep]);

  const handleStop = useCallback(async () => {
    if (actionBusyRef.current || busy) return;
    actionBusyRef.current = true;
    setShowBreathing(true);
    actionBusyRef.current = false;
  }, [busy]);

  const handleCancelAccidentalSleep = useCallback(async () => {
    if (
      actionBusyRef.current ||
      busy ||
      !startTime ||
      Date.now() - startTime.getTime() >= 10 * 60 * 1000
    ) {
      return;
    }
    actionBusyRef.current = true;
    await stopSleep();
    setPendingEnd(null);
    setShowBreathing(false);
    setShowRating(false);
    actionBusyRef.current = false;
  }, [busy, startTime, stopSleep]);

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
          // Local calendar night (not the UTC day — a 00:30 PKT start is still "tonight").
          date: getLocalDateISO(startTime),
          startTime: startTime.getTime(),
          endTime: pendingEnd.getTime(),
          durationMinutes,
          quality: selectedQuality,
        });
        // Only once the session is genuinely saved — skipped ratings / failed saves don't count.
        void recordActivity(uid, {
          id: `sleep-${startTime.getTime()}`,
          type: 'SLEEP_SESSION_COMPLETED',
          source: 'sleep-tracker',
          durationSeconds: durationMinutes * 60,
          metadata: { quality: selectedQuality },
        });
      } catch {
        /* shown by context */
      }
    }
    setShowRating(false);
    await clearSession();
    setPendingEnd(null);
    actionBusyRef.current = false;
  }, [addSession, clearSession, pendingEnd, selectedQuality, startTime, uid]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const streak = calculateStreak(sessions);
  const avg = avgDuration(sessions);
  const lastSession = sessions[0];
  const [statsNow] = useState(() => Date.now());
  const oneWeekAgo = statsNow - 7 * 24 * 60 * 60 * 1000;
  const nightsThisWeek = sessions.filter((s) => s.startTime > oneWeekAgo).length;
  // Real per-day completion for the last 7 LOCAL calendar days (oldest →
  // today), keyed by each session's local start day — never a fabricated
  // pattern, just a different view of `sessions`.
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(statsNow - (6 - i) * 24 * 60 * 60 * 1000);
    const key = getLocalDateISO(d);
    return {
      key,
      label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
      hasSession: sessions.some((s) => sleepSessionDate(s) === key),
      isToday: i === 6,
    };
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (!hydrated) {
    return <SleepSkeleton />;
  }

  return (
    <ScreenShell pillar="sleep" ambient={<AmbientBackground />} bannerAd>
      <ScreenTransition>
        <View className="px-1 pt-1 pb-4">
          {/* Header */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between">
            <View>
              <Text
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: TYPOGRAPHY.screenTitle.fontSize,
                  fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
                  color: TYPOGRAPHY.screenTitle.color,
                }}
              >
                Sleep
              </Text>
              <Text
                style={{
                  fontSize: TYPOGRAPHY.subtitle.fontSize,
                  fontWeight: TYPOGRAPHY.subtitle.fontWeight,
                  color: TYPOGRAPHY.subtitle.color,
                  marginTop: 2,
                }}
              >
                Rest deeply, wake fresh
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {/* Readiness indicator — tap to explain the score */}
              {!tracking && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setShowReadinessInfo((v) => !v);
                  }}
                  className="flex-row items-center gap-1 pl-1.5 pr-2.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.07]"
                >
                  <ReadinessRing
                    score={readiness.score}
                    color={readiness.color}
                    size={30}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 0.2,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    Readiness
                  </Text>
                  <Info
                    size={12}
                    color={
                      showReadinessInfo
                        ? readiness.color
                        : "rgba(255,255,255,0.4)"
                    }
                  />
                </TouchableOpacity>
              )}
              {/* Alarm settings button */}
              {!tracking && (
                <TouchableOpacity
                  onPress={() => router.push(ROUTES.appAlarmSettings)}
                  activeOpacity={0.7}
                  className="w-10 h-10 rounded-full items-center justify-center bg-white/[0.05] border border-white/[0.07]"
                >
                  <Settings size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              )}
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
            {/* Readiness explanation — revealed on tap */}
            {showReadinessInfo && !tracking && (
              <View
                style={{
                  marginTop: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 18,
                    color: "rgba(245,247,251,0.7)",
                  }}
                >
                  <Text style={{ fontWeight: "800", color: readiness.color }}>
                    {readiness.score}/100
                  </Text>{" "}
                  — how well your sleep aligns with your goals.
                </Text>
              </View>
            )}
          </View>

          {/* Tab toggle — segmented control, solid indigo active pill */}
          {!tracking && (
            <View
              style={{
                flexDirection: "row",
                gap: 4,
                marginBottom: 30,
                padding: 4,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
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
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: active ? SLEEP_ACCENT + "24" : "transparent",
                      borderWidth: 1,
                      borderColor: active ? SLEEP_ACCENT + "38" : "transparent",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        paddingVertical: 10,
                      }}
                    >
                      <TabIcon size={16} color={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} />
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: "600",
                          color: active ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {tab.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── TRACKING STATE ─────────────────────────────────────────────────── */}
          {tracking ? (
            <View className="gap-6 pt-2" onTouchStart={registerTrackingActivity}>
              {/* Ambient glow behind the clock/moon area */}
              <TrackingGlow frame={0} />

              {/* Live device clock — stays full brightness during night dimming */}
              <LiveSleepClock />

              {/* Moon + drifting golden wave — stays full brightness during night dimming */}
              <MoonWave width={Math.min(width - 48, 340)} />

              {/* Auto Dim toggle — stays full brightness during night dimming,
                  same as the clock/moon above, so it's always reachable. */}
              <AutoDimToggleRow enabled={autoDimEnabled} onChange={setAutoDimEnabled} />

              {/* Everything below fades to ~15% opacity after 30s idle (Auto
                  Dim) — any touch anywhere restores it instantly. */}
              <Animated.View style={[{ gap: 24 }, dimStyle]}>
                {/* Time asleep */}
                {startTime && <ElapsedSleepTime startTime={startTime} />}

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
                    accent={SLEEP_ACCENT}
                    descriptionColor={alarmPastDue ? "#FF9800" : undefined}
                    trailing={
                      smartAlarmEnabled ? (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 2,
                            borderRadius: RADIUS.chip,
                            borderWidth: 1,
                            backgroundColor: SLEEP_STAGE_STYLE[sleepStage].bg,
                            borderColor: SLEEP_STAGE_STYLE[sleepStage].border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              color: SLEEP_STAGE_STYLE[sleepStage].text,
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
                    accent={SLEEP_ACCENT}
                  />
                </View>

                {/* Ambient sleep sound — a looping play/pause, separate from the
                    alarm/ringtone settings above. */}
                <SleepSoundButton />

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

                {startTime && (
                  <AccidentalStartCancel
                    startTime={startTime}
                    busy={busy}
                    onCancel={handleCancelAccidentalSleep}
                  />
                )}

                {/* Wake up — hold to confirm */}
                <View className="items-center">
                  <HoldButton
                    label="Wake up"
                    onComplete={handleStop}
                    disabled={busy}
                    bg="rgba(255,255,255,0.08)"
                    borderColor="rgba(255,255,255,0.15)"
                    borderWidth={1}
                    height={56}
                    radius={18}
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
              </Animated.View>
            </View>
          ) : segment === "tonight" ? (
            <View>
              {/* ── Hero — compact 24h sleep dial + planned-sleep metric +
                  bedtime/wake summary, all one continuous surface. The
                  bedtime/wake row used to be its own separate GlassCard
                  below; merging it in here is the main height win. ── */}
              <GlassCard noPadding tint={SLEEP_HERO_TINT} style={heroCardStyles.card}>
                <View style={heroCardStyles.inner}>
                  {/* Restrained violet depth behind the dial — the dial itself
                      is the card's color now, this just keeps the surface
                      from reading as flat/empty behind it. */}
                  <View style={heroCardStyles.glowWrap} pointerEvents="none">
                    <Svg width={240} height={240}>
                      <Defs>
                        <SvgRadialGradient id="sleepHeroGlow" cx="50%" cy="50%" r="50%">
                          <Stop offset="0%" stopColor="#7B5CFF" stopOpacity={0.14} />
                          <Stop offset="55%" stopColor="#7B5CFF" stopOpacity={0.045} />
                          <Stop offset="100%" stopColor="#7B5CFF" stopOpacity={0} />
                        </SvgRadialGradient>
                      </Defs>
                      <Circle cx={120} cy={120} r={120} fill="url(#sleepHeroGlow)" />
                    </Svg>
                  </View>

                  <Text style={heroCardStyles.eyebrow}>TONIGHT&apos;S SLEEP</Text>

                  {/* The dial is the hero — planned duration now lives inside
                      it instead of as a separate block above. */}
                  <View style={heroCardStyles.dialWrap}>
                    <SleepDial
                      bedtime={sliderBedtime}
                      wakeTime={sliderWakeTime}
                      alarmWindowEnabled={smartAlarmEnabled}
                      radius={100}
                      onBedtimeChange={setSliderBedtime}
                      onWakeTimeChange={setSliderWakeTime}
                      centerContent={
                        <View style={heroCardStyles.dialCenter}>
                          <Text style={heroCardStyles.metric}>
                            {(() => {
                              const diffH = timeDiffMinutes(sliderBedtime, sliderWakeTime);
                              const h = Math.floor(diffH / 60);
                              const m = diffH % 60;
                              return `${h}h${m > 0 ? ` ${m}m` : ""}`;
                            })()}
                          </Text>
                          <Text style={heroCardStyles.metricCaption}>Planned sleep</Text>
                        </View>
                      }
                    />
                  </View>

                  {/* Bedtime / Wake Up — two compact supporting tiles, no
                      full-width footer bar. */}
                  <View style={heroCardStyles.footerRow}>
                    <TouchableOpacity
                      onPress={() => setEditingTime("bedtime")}
                      activeOpacity={0.7}
                      style={heroCardStyles.footerCol}
                      accessibilityRole="button"
                      accessibilityLabel={`Bedtime, ${formatTimeAmPm(sliderBedtime)}`}
                    >
                      <View style={heroCardStyles.footerRowInline}>
                        <Moon size={16} color={SLEEP_ACCENT} fill={SLEEP_ACCENT} />
                        <Text style={heroCardStyles.footerLabel}>Bedtime</Text>
                      </View>
                      <Text style={heroCardStyles.footerValue}>{formatTimeAmPm(sliderBedtime)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setEditingTime("wake")}
                      activeOpacity={0.7}
                      style={heroCardStyles.footerCol}
                      accessibilityRole="button"
                      accessibilityLabel={`Wake up, ${formatTimeAmPm(sliderWakeTime)}${smartAlarmEnabled ? ", smart window 30 minutes" : ""}`}
                    >
                      <View style={heroCardStyles.footerRowInline}>
                        <Bell size={16} color={SLEEP_ACCENT} fill={SLEEP_ACCENT} />
                        <Text style={heroCardStyles.footerLabel}>Wake Up</Text>
                      </View>
                      <Text style={heroCardStyles.footerValue}>{formatTimeAmPm(sliderWakeTime)}</Text>
                      {smartAlarmEnabled && (
                        <Text style={heroCardStyles.footerSub} numberOfLines={1}>Smart · 30 min</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>

              {/* ── Sleep Goal — one segmented track instead of four separate
                  cards. Same selection logic as before (goal tap → bedtime =
                  now, wake = now + hours), just a lighter surface. ── */}
              <View style={{ marginTop: SLEEP_GAP }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Sparkles size={12} color="rgba(255,255,255,0.6)" />
                  <Text
                    style={{
                      fontSize: TYPOGRAPHY.sectionLabel.fontSize,
                      fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
                      letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
                      textTransform: TYPOGRAPHY.sectionLabel.textTransform,
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    SLEEP GOAL
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 4,
                    padding: 4,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  {SLEEP_GOALS.map((g) => {
                    // Highlight the goal that matches the actual planned duration so
                    // the selection stays in sync after dragging the dial.
                    const active = plannedHours === g.hours;
                    return (
                      <TouchableOpacity
                        key={g.hours}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const bedtime = currentTimeHHMM();
                          setSliderBedtime(bedtime);
                          setSliderWakeTime(addMinutesToTime(bedtime, Math.round(g.hours * 60)));
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`${g.hours} hour sleep goal, ${g.label}${active ? ", selected" : ""}`}
                        accessibilityState={{ selected: active }}
                        style={{
                          flex: 1,
                          minHeight: 52,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 14,
                          backgroundColor: active ? SLEEP_ACCENT + "1E" : "transparent",
                          borderWidth: 1,
                          borderColor: active ? SLEEP_ACCENT + "50" : "transparent",
                          shadowColor: SLEEP_ACCENT,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: active ? 0.15 : 0,
                          shadowRadius: active ? 6 : 0,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: active ? "700" : "600",
                            color: active ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                          }}
                        >
                          {g.hours}h
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 10,
                            fontWeight: "500",
                            marginTop: 3,
                            color: active ? SLEEP_ACCENT : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {GOAL_SHORT_LABEL[g.hours]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── Start Sleep CTA — same frozen primary-button gradient as every other screen ── */}
              <GradientCTA
                label="Start Sleep"
                sublabel={`Wake at ${formatTimeAmPm(sliderWakeTime)}`}
                icon={<MoonStar size={19} color="#03212C" />}
                textColor="#03212C"
                glowColor="rgba(108,99,255,0.34)"
                height={52}
                onPress={handleStartSleep}
                disabled={busy}
                style={{ marginTop: 16 }}
              />

              {/* ── Smart Alarm — one compact utility row ── */}
              <GlassCard noPadding tint={SURFACE_TINT.card} style={{ marginTop: SLEEP_GAP, borderRadius: RADIUS.card, ...SHADOWS.medium }}>
                {/* Smart alarm toggle */}
                <TouchableOpacity
                  onPress={() => router.push(ROUTES.appAlarmSettings)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between px-4"
                  style={{ paddingVertical: 14, gap: 12 }}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View
                      className="items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: SLEEP_ACCENT + "18",
                        borderWidth: 1,
                        borderColor: SLEEP_ACCENT + "28",
                        shadowColor: SLEEP_ACCENT,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4,
                        shadowRadius: 7,
                      }}
                    >
                      <Bell size={16} color={SLEEP_ACCENT} />
                    </View>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "600",
                        color: "#FFFFFF",
                      }}
                    >
                      Smart Alarm
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <ToggleSwitch
                      value={smartAlarmEnabled}
                      onToggle={() => setSmartAlarmEnabled(!smartAlarmEnabled)}
                    />
                    <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
                  </View>
                </TouchableOpacity>
              </GlassCard>

              {/* ── Tonight's Insight — compact flat card. Audited:
                  `useSleepPlanInsight` genuinely calls Gemini
                  (`generateSleepPlanInsight`) and only sets `isAi=true` on a
                  real model response, so "AI INSIGHT" is truthful there.
                  The fallback (template/deterministic copy) is relabeled
                  "TONIGHT'S INSIGHT" below — was "TONIGHT'S PLAN", never
                  claimed AI, just aligned wording with this pass's spec. ── */}
              <View
                style={{
                  marginTop: 18,
                  borderRadius: RADIUS.card,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 16,
                  }}
                >
                      <View
                        className="items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: SLEEP_ACCENT + "18",
                          borderWidth: 1,
                          borderColor: SLEEP_ACCENT + "28",
                          shadowColor: SLEEP_ACCENT,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.4,
                          shadowRadius: 7,
                        }}
                      >
                        <Sparkles size={14} color={SLEEP_ACCENT} />
                      </View>
                      <View style={{ flex: 1, flexShrink: 1 }}>
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            style={{
                              fontSize: TYPOGRAPHY.sectionLabel.fontSize,
                              fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
                              letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
                              textTransform: TYPOGRAPHY.sectionLabel.textTransform,
                              color: SLEEP_ACCENT,
                            }}
                          >
                            {planInsight.isAi ? "AI INSIGHT" : "TONIGHT'S INSIGHT"}
                          </Text>
                          {planInsight.loading && (
                            <View
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: SLEEP_ACCENT }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: TYPOGRAPHY.body.fontSize,
                            lineHeight: 20,
                            fontWeight: TYPOGRAPHY.body.fontWeight,
                            color: "rgba(255,255,255,0.85)",
                            marginTop: 5,
                          }}
                          numberOfLines={insightExpanded ? undefined : 2}
                        >
                          {insightExpanded
                            ? planInsight.text
                            : truncateAtWord(planInsight.text, 80)}
                        </Text>
                        {planInsight.text.length > 90 && (
                          <Text
                            onPress={() => {
                              LayoutAnimation.configureNext(
                                LayoutAnimation.Presets.easeInEaseOut,
                              );
                              setInsightExpanded((v) => !v);
                            }}
                            suppressHighlighting
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: SLEEP_ACCENT,
                              marginTop: 4,
                            }}
                          >
                            {insightExpanded ? "Read less" : "Read more →"}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

              {/* Weekly Sleep — ONE compact module: 7-night strip + a single
                  stat/link row. Previously the strip sat above a full
                  `WeeklyProgressRow` that repeated its own "Weekly Sleep"
                  label and drew a second full-width progress bar for the
                  same 7-night count — duplicated information, extra height.
                  Dropped in favor of one plain text+link row. ── */}
              <View style={{ marginTop: SLEEP_GAP }}>
                <SectionLabel first accent={SLEEP_ACCENT}>WEEKLY SLEEP</SectionLabel>
                <View
                  style={{
                    borderRadius: RADIUS.card,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    {weekDots.map((day) => (
                      <View key={day.key} style={{ alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: day.isToday ? SLEEP_ACCENT : "rgba(255,255,255,0.4)" }}>
                          {day.label}
                        </Text>
                        <View
                          style={{
                            width: 19,
                            height: 19,
                            borderRadius: 9.5,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: day.hasSession ? SLEEP_ACCENT + "30" : "rgba(255,255,255,0.05)",
                            borderWidth: day.isToday ? 1.5 : 1,
                            borderColor: day.isToday ? SLEEP_ACCENT : day.hasSession ? SLEEP_ACCENT + "50" : "rgba(255,255,255,0.1)",
                          }}
                        >
                          {day.hasSession && (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SLEEP_ACCENT }} />
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 14, marginBottom: 12 }} />
                  <TouchableOpacity
                    onPress={() => setSegment("analysis")}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${Math.min(nightsThisWeek, 7)} of 7 nights this week. View insights.`}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 24 }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>
                      {Math.min(nightsThisWeek, 7)}/7 nights{avg > 0 ? ` · Avg ${formatDuration(avg)}` : ""}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: SLEEP_ACCENT }}>View insights →</Text>
                  </TouchableOpacity>
                </View>
              </View>

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
                        backgroundColor: SLEEP_ACCENT,
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
                        backgroundColor: SLEEP_ACCENT,
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

          {/* Extra runway so the goal chips / CTA scroll fully clear of the
              floating tab bar (on top of the shell's reserved tab-bar space). */}
          <View style={{ height: 20 }} />

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
            onSleepNow={handleSleepNow}
            uid={user?.uid}
            isGuestMode={isGuestMode}
          />
        </View>
      </ScreenTransition>
    </ScreenShell>
  );
}
