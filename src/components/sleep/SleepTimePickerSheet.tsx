import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { WheelTimePicker } from "@/components/sleep/WheelTimePicker";
import { ALARM_RINGTONES, SMART_ALARM_WINDOWS } from "@/constants/alarmSounds";
import { GLASS_CARD, PILLAR_THEME } from "@/constants/theme";
import { useAlarmSettings } from "@/hooks/useAlarmSettings";
import { useGlobalFrame } from "@/hooks/useAnimationFrame";
import { useSleepSchedule } from "@/hooks/useSleepSchedule";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  ChevronRight,
  Clock,
  HelpCircle,
  Moon,
  Volume1,
  Volume2,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

/** Calculate minutes between two "HH:MM" times, wrapping overnight if needed. */
function timeDiffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff <= 0) diff += 1440;
  return diff;
}

// ── Sleep pillar theme tokens ───────────────────────────────────────────────────

const SLEEP = PILLAR_THEME.sleep;
const ACCENT = SLEEP.accent; // '#a78bfa'

// ── Animated background elements (matching onboarding hero) ─────────────────────

const BEAM_ANGLES = [0, 90, 180, 270];

function AmbientBeams({ frame }: { frame: number }) {
  const angle = (-frame * 0.06) % 360;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: "100%",
        height: 280,
        alignItems: "center",
        transform: [{ rotate: `${angle}deg` }],
      }}
    >
      <Svg width={300} height={280} viewBox="0 0 300 300">
        <Defs>
          <SvgLinearGradient id="sheetBeam" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor={ACCENT} stopOpacity={0.15} />
            <Stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {BEAM_ANGLES.map((deg, i) => {
          const shimmer = 0.5 + 0.5 * Math.sin(frame * 0.03 + i * 1.6);
          return (
            <Path
              key={i}
              d="M150,150 L141,10 L159,10 Z"
              fill="url(#sheetBeam)"
              opacity={shimmer * 0.45}
              transform={`rotate(${deg} 150 150)`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const PARTICLES = [
  { x: 0.15, y: 0.12, s: 2.5, delay: 0 },
  { x: 0.85, y: 0.08, s: 2, delay: 9 },
  { x: 0.9, y: 0.25, s: 1.8, delay: 18 },
  { x: 0.1, y: 0.28, s: 2.2, delay: 27 },
  { x: 0.88, y: 0.42, s: 1.6, delay: 6 },
  { x: 0.12, y: 0.45, s: 2, delay: 15 },
];

function AmbientParticles({ frame }: { frame: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((p, i) => {
        const t = (Math.sin((frame - p.delay) * 0.04) + 1) / 2;
        const translateY = -t * 9;
        const opacity = 0.1 + t * 0.3;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: p.s,
              height: p.s,
              borderRadius: p.s / 2,
              backgroundColor: "#d8ccf5",
              shadowColor: ACCENT,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: p.s * 2.5,
              transform: [{ translateY }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

function GlowBackdrop({ frame }: { frame: number }) {
  const t = (Math.sin(frame * 0.045) + 1) / 2;
  const opacity = 0.3 + t * 0.35;
  const scale = 0.96 + t * 0.06;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: "18%",
        alignSelf: "center",
        width: 320,
        height: 320,
        transform: [{ scale }],
        opacity,
      }}
    >
      <Svg width={320} height={320} viewBox="0 0 380 380">
        <Defs>
          <RadialGradient id="sheetBgGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
            <Stop offset="55%" stopColor={ACCENT} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={190} cy={190} r={190} fill="url(#sheetBgGlow)" />
      </Svg>
    </View>
  );
}

// ── Premium GlassCard — matching onboarding's GLASS_CARD ────────────────────────

function GlassCard({
  children,
  style,
  noPadding,
}: {
  children: React.ReactNode;
  style?: any;
  noPadding?: boolean;
}) {
  return (
    <View
      style={[
        {
          borderRadius: GLASS_CARD.borderRadius,
          overflow: "hidden",
          borderTopWidth: GLASS_CARD.borderTopWidth,
          borderColor: GLASS_CARD.borderColor,
        },
        style,
      ]}
    >
      <BlurView
        intensity={GLASS_CARD.blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={SLEEP.cardTint} style={StyleSheet.absoluteFill} />
      {/* Top highlight */}
      <LinearGradient
        colors={GLASS_CARD.highlightColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: "absolute",
          top: 0,
          left: 24,
          right: 24,
          height: 1.5,
        }}
      />
      {/* Inner shadows */}
      <LinearGradient
        colors={GLASS_CARD.innerTopColors}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: GLASS_CARD.innerTopHeight,
        }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={GLASS_CARD.innerBottomColors}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: GLASS_CARD.innerBottomHeight,
        }}
        pointerEvents="none"
      />
      <View style={noPadding ? {} : { padding: 18 }}>{children}</View>
    </View>
  );
}

type Tab = "bedtime" | "alarm";

type Props = {
  visible: boolean;
  initialTab: Tab;
  onClose: () => void;
  bedtime: string;
  wakeTime: string;
  onBedtimeChange: (time: string) => void;
  onWakeTimeChange: (time: string) => void;
  alarmEnabled: boolean;
  onAlarmEnabledChange: (value: boolean) => void;
  uid?: string;
  isGuestMode?: boolean;
};

export function SleepTimePickerSheet({
  visible,
  initialTab,
  onClose,
  bedtime,
  wakeTime,
  onBedtimeChange,
  onWakeTimeChange,
  alarmEnabled,
  onAlarmEnabledChange,
  uid,
  isGuestMode = false,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [ringtoneSheetOpen, setRingtoneSheetOpen] = useState(false);
  const [windowSheetOpen, setWindowSheetOpen] = useState(false);
  const frame = useGlobalFrame();

  const {
    selectedRingtone,
    setSelectedRingtone,
    selectedVibration,
    setSelectedVibration,
    smartAlarm,
    setSmartAlarm,
    smartAlarmWindow,
    setSmartAlarmWindow,
    alarmVolume,
    setAlarmVolume,
  } = useAlarmSettings();

  const { schedule, saveSchedule } = useSleepSchedule(uid, isGuestMode);

  const goalMinutes = timeDiffMinutes(bedtime, wakeTime);
  const goalHours = Math.floor(goalMinutes / 60);
  const goalRemainder = goalMinutes % 60;

  const ringtoneLabel =
    ALARM_RINGTONES.find((r) => r.id === selectedRingtone)?.label ?? "Default";
  const windowLabel =
    SMART_ALARM_WINDOWS.find((w) => w.value === smartAlarmWindow)?.label ??
    `${smartAlarmWindow} min`;

  // Tab-specific accent: bedtime → blue, alarm → sleep purple
  const tabAccent = tab === "bedtime" ? "#60a5fa" : "#a78bfa";

  const switchTab = (next: Tab) => {
    void Haptics.selectionAsync();
    setTab(next);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        {/* Sleep gradient background — matching onboarding */}
        <LinearGradient
          colors={SLEEP.bgGradient}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Animated ambient elements */}
        <GlowBackdrop frame={frame} />
        <AmbientBeams frame={frame} />
        <AmbientParticles frame={frame} />

        {/* Header — shared across every stack/modal screen; tabs replace the title */}
        <ScreenHeader
          onBack={onClose}
          topInset={48}
          center={
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => switchTab("bedtime")}
                activeOpacity={0.7}
                style={[
                  styles.tabBtn,
                  tab === "bedtime" && styles.tabBtnActive,
                ]}
              >
                <Moon
                  size={15}
                  color={
                    tab === "bedtime" ? "#60a5fa" : "rgba(255,255,255,0.35)"
                  }
                  fill={tab === "bedtime" ? "#60a5fa" : "transparent"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    tab === "bedtime" && styles.tabLabelActive,
                  ]}
                >
                  Bedtime
                </Text>
                {tab === "bedtime" && (
                  <View
                    style={[
                      styles.tabUnderline,
                      { backgroundColor: "#60a5fa" },
                    ]}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => switchTab("alarm")}
                activeOpacity={0.7}
                style={[styles.tabBtn, tab === "alarm" && styles.tabBtnActive]}
              >
                <Bell
                  size={15}
                  color={tab === "alarm" ? "#a78bfa" : "rgba(255,255,255,0.35)"}
                  fill={tab === "alarm" ? "#a78bfa" : "transparent"}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    tab === "alarm" && styles.tabLabelActive,
                  ]}
                >
                  Alarm
                </Text>
                {tab === "alarm" && (
                  <View
                    style={[
                      styles.tabUnderline,
                      { backgroundColor: "#a78bfa" },
                    ]}
                  />
                )}
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Wheel picker — premium glass card */}
          <GlassCard noPadding style={{ marginBottom: 14 }}>
            <View style={{ paddingVertical: 14 }}>
              <WheelTimePicker
                value={tab === "bedtime" ? bedtime : wakeTime}
                onChange={
                  tab === "bedtime" ? onBedtimeChange : onWakeTimeChange
                }
              />
            </View>
          </GlassCard>

          {/* Goal block */}
          <GlassCard style={{ marginBottom: 14 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: tabAccent + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: tabAccent + "30",
                }}
              >
                <Clock size={17} color={tabAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalText}>
                  Sleep goal{" "}
                  <Text style={[styles.goalHighlight, { color: tabAccent }]}>
                    {goalHours}h{goalRemainder > 0 ? ` ${goalRemainder}m` : ""}
                  </Text>
                </Text>
                <Text style={styles.goalSub}>
                  Based on your bedtime and alarm time
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Settings rows */}
          <View style={styles.rows}>
            {tab === "bedtime" ? (
              <>
                <GlassCard>
                  <ToggleRow
                    label="Remind me to sleep"
                    value={schedule?.reminderEnabled ?? false}
                    onChange={(v) =>
                      schedule &&
                      void saveSchedule({ ...schedule, reminderEnabled: v })
                    }
                    accent={tabAccent}
                  />
                  {schedule?.reminderEnabled !== undefined && (
                    <View style={styles.cardDivider} />
                  )}
                  <ToggleRow
                    label="Sleep notes"
                    value={schedule?.sleepNotesEnabled ?? true}
                    onChange={(v) =>
                      schedule &&
                      void saveSchedule({ ...schedule, sleepNotesEnabled: v })
                    }
                    footnote="Take notes of factors that may affect sleep to help better analyze your sleep."
                    accent={tabAccent}
                  />
                </GlassCard>
              </>
            ) : (
              <>
                <GlassCard>
                  <ToggleRow
                    label="Alarm"
                    value={alarmEnabled}
                    onChange={onAlarmEnabledChange}
                    accent={tabAccent}
                  />
                </GlassCard>

                <GlassCard>
                  <AlarmRow
                    icon={Bell}
                    label="Alarm ringtone"
                    value={ringtoneLabel}
                    onPress={() => setRingtoneSheetOpen(true)}
                    accent={tabAccent}
                  />
                  <View style={styles.cardDivider} />
                  <VolumeRow
                    value={alarmVolume}
                    onChange={setAlarmVolume}
                    accent={tabAccent}
                  />
                  <View style={styles.cardDivider} />
                  <ToggleRow
                    label="Vibration"
                    value={selectedVibration !== "none"}
                    onChange={(v) =>
                      setSelectedVibration(v ? "standard" : "none")
                    }
                    accent={tabAccent}
                  />
                </GlassCard>

                <GlassCard>
                  <ToggleRow
                    label="Smart alarm"
                    value={smartAlarm}
                    onChange={setSmartAlarm}
                    infoHint="Wakes you during light sleep for a more natural feel."
                    accent={tabAccent}
                  />
                  {smartAlarm && (
                    <>
                      <View style={styles.cardDivider} />
                      <AlarmRow
                        icon={Clock}
                        label="Wake up period"
                        value={windowLabel}
                        onPress={() => setWindowSheetOpen(true)}
                        accent={tabAccent}
                      />
                    </>
                  )}
                </GlassCard>
              </>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      <SelectSheet
        visible={ringtoneSheetOpen}
        title="Alarm ringtone"
        options={ALARM_RINGTONES.map((r) => ({ value: r.id, label: r.label }))}
        selected={selectedRingtone}
        onSelect={(id) => {
          setSelectedRingtone(id);
          setRingtoneSheetOpen(false);
        }}
        onClose={() => setRingtoneSheetOpen(false)}
      />
      <SelectSheet
        visible={windowSheetOpen}
        title="Wake up period"
        options={SMART_ALARM_WINDOWS.map((w) => ({
          value: String(w.value),
          label: w.label,
        }))}
        selected={String(smartAlarmWindow)}
        onSelect={(v) => {
          setSmartAlarmWindow(Number(v) as 15 | 30 | 45 | 60);
          setWindowSheetOpen(false);
        }}
        onClose={() => setWindowSheetOpen(false)}
      />
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleRow({
  label,
  value,
  onChange,
  footnote,
  infoHint,
  accent = ACCENT,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  footnote?: string;
  infoHint?: string;
  accent?: string;
}) {
  const [showHint, setShowHint] = useState(false);
  return (
    <View>
      <View style={styles.row}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
          }}
        >
          <Text style={styles.rowLabel}>{label}</Text>
          {infoHint && (
            <TouchableOpacity
              onPress={() => setShowHint((s) => !s)}
              hitSlop={8}
            >
              <HelpCircle size={14} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(!value);
          }}
          activeOpacity={0.8}
          style={[styles.switchTrack, value && { backgroundColor: accent }]}
        >
          <View
            style={[styles.switchThumb, value && { alignSelf: "flex-end" }]}
          />
        </TouchableOpacity>
      </View>
      {footnote && <Text style={styles.footnote}>{footnote}</Text>}
      {infoHint && showHint && <Text style={styles.footnote}>{infoHint}</Text>}
    </View>
  );
}

function AlarmRow({
  icon: Icon,
  label,
  value,
  onPress,
  accent = ACCENT,
}: {
  icon: any;
  label: string;
  value: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: accent + "15",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={14} color={accent} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={styles.rowValue}>{value}</Text>
        <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
      </View>
    </TouchableOpacity>
  );
}

function VolumeRow({
  value,
  onChange,
  accent = ACCENT,
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const trackWidth = useRef(0);
  const trackX = useRef(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const updateFromTouch = (e: GestureResponderEvent) => {
    if (!trackWidth.current) return;
    const x = e.nativeEvent.pageX - trackX.current;
    const pct = Math.max(0, Math.min(1, x / trackWidth.current));
    onChange(Math.round(pct * 100) / 100);
  };

  return (
    <View style={styles.row}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
      >
        <Volume1 size={15} color="rgba(255,255,255,0.4)" />
        <View
          style={{ flex: 1, height: 24, justifyContent: "center" }}
          onLayout={handleLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            trackX.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
            updateFromTouch(e);
          }}
          onResponderMove={updateFromTouch}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 0,
              width: `${value * 100}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: accent,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              marginLeft: -8,
              left: `${value * 100}%`,
              shadowColor: accent,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 6,
              shadowOpacity: 0.5,
            }}
          />
        </View>
        <Volume2 size={17} color="rgba(255,255,255,0.4)" />
      </View>
    </View>
  );
}

/** Glass bottom-sheet picker — matching onboarding design. */
function SelectSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <BlurView
            intensity={GLASS_CARD.blurIntensity}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={SLEEP.cardTint}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={GLASS_CARD.highlightColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: "absolute",
              top: 0,
              left: 24,
              right: 24,
              height: 1.5,
            }}
          />
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 360 }}
          >
            {options.map((opt, i) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(opt.value);
                }}
                activeOpacity={0.7}
                style={[styles.sheetOption, i === 0 && { borderTopWidth: 0 }]}
              >
                <Text
                  style={[
                    styles.sheetOptionLabel,
                    opt.value === selected && {
                      color: ACCENT,
                      fontWeight: "800",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.value === selected && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: ACCENT,
                    }}
                  />
                )}
              </TouchableOpacity>
            ))}
            <View style={{ height: 12 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#06040e",
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(167,139,250,0.12)",
    borderColor: "rgba(167,139,250,0.3)",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  tabLabelActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    width: 20,
    height: 2.5,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  goalText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  goalHighlight: {
    fontWeight: "800",
  },
  goalSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
  },
  rows: {
    gap: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
  },
  footnote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    lineHeight: 16,
    marginTop: 8,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#11162a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  sheetOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
});
