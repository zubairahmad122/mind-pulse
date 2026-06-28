import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { GlassCard } from "@/components/ui";
import { PillarProvider } from "@/context/PillarContext";
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
  AlertTriangle,
  Bell,
  Check,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

/** Format a "HH:MM" 24h string as a "6:30 AM" label. */
function formatTimeAmPm(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hh = h % 24;
  const hour12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  const ampm = hh < 12 ? "AM" : "PM";
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

// ── Sleep pillar theme tokens ───────────────────────────────────────────────────

const SLEEP = PILLAR_THEME.sleep;
const ACCENT = SLEEP.accent; // '#a78bfa'

// Unified accent for every interactive control on this screen (toggles, picker,
// duration icon) — one active color keeps the picker consistent.
const PURPLE = "#8B5CF6";
const BLUE = "#3B82F6";

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
  const insets = useSafeAreaInsets();

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
  // A plausible night is ~3–14h. Anything outside usually means the AM/PM was
  // set wrong (e.g. an 11 AM bedtime → 19.5h), so we warn instead of asserting.
  const durationOdd = goalMinutes < 180 || goalMinutes > 14 * 60;

  const ringtoneLabel =
    ALARM_RINGTONES.find((r) => r.id === selectedRingtone)?.label ?? "Default";
  const windowLabel =
    SMART_ALARM_WINDOWS.find((w) => w.value === smartAlarmWindow)?.label ??
    `${smartAlarmWindow} min`;

  // One unified accent across the whole picker (FIX 4).
  const tabAccent = PURPLE;

  const switchTab = (next: Tab) => {
    void Haptics.selectionAsync();
    setTab(next);
  };

  // Times + settings already persist live as the user changes them, so the
  // primary button just confirms and dismisses — with a brief check-mark so the
  // tap clearly registers before the sheet closes.
  const [justSaved, setJustSaved] = useState(false);
  const handleSave = () => {
    if (justSaved) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJustSaved(true);
    setTimeout(onClose, 600);
  };

  const title = tab === "bedtime" ? "Set Bedtime" : "Set Wake Time";
  const savedLabel = tab === "bedtime" ? "Bedtime set" : "Wake time set";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <PillarProvider pillar="sleep">
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

        {/* Header — clear screen title + Done (times auto-save) */}
        <ScreenHeader
          onBack={onClose}
          topInset={48}
          title={title}
          right={
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              activeOpacity={0.7}
              hitSlop={10}
              style={styles.doneBtn}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          }
        />

        {/* Segmented control — Bedtime / Wake Up */}
        <View style={styles.segmentWrap}>
          <View style={styles.segment}>
            {(
              [
                { id: "bedtime", label: "Bedtime", icon: Moon },
                { id: "alarm", label: "Wake Up", icon: Bell },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => switchTab(id)}
                  activeOpacity={0.8}
                  style={[styles.segBtn, active && styles.segBtnActive]}
                >
                  <Icon
                    size={15}
                    color={active ? "#FFFFFF" : "#9CA3AF"}
                    fill={active ? "#FFFFFF" : "transparent"}
                  />
                  <Text
                    style={[styles.segText, active && styles.segTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
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
                  backgroundColor: (durationOdd ? "#F59E0B" : tabAccent) + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: (durationOdd ? "#F59E0B" : tabAccent) + "30",
                }}
              >
                {durationOdd ? (
                  <AlertTriangle size={17} color="#F59E0B" />
                ) : (
                  <Clock size={17} color={tabAccent} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalText}>You&apos;ll sleep for</Text>
                <Text
                  style={[
                    styles.goalHighlight,
                    { color: durationOdd ? "#F59E0B" : tabAccent },
                  ]}
                >
                  {goalHours}h{goalRemainder > 0 ? ` ${goalRemainder}m` : ""}
                </Text>
                <Text
                  style={[
                    styles.goalSub,
                    durationOdd && { color: "#F59E0B" },
                  ]}
                >
                  {durationOdd
                    ? "That seems long — check your AM/PM."
                    : tab === "bedtime"
                      ? `Based on your ${formatTimeAmPm(wakeTime)} alarm`
                      : `Based on your ${formatTimeAmPm(bedtime)} bedtime`}
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
                    footnote="Track factors that affect your sleep quality."
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

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Primary action — fixed at the bottom (FIX 6 / FIX 7) */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={justSaved ? ["#10B981", "#059669"] : [PURPLE, BLUE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {justSaved && <Check size={18} color="#FFFFFF" />}
              <Text style={styles.ctaText}>
                {justSaved ? savedLabel : title}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </PillarProvider>

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
          style={[
            styles.switchTrack,
            { justifyContent: value ? "flex-end" : "flex-start" },
            value && { backgroundColor: accent },
          ]}
        >
          <View style={styles.switchThumb} />
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
  doneBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  doneText: {
    fontSize: 15,
    fontWeight: "700",
    color: PURPLE,
  },
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  segment: {
    flexDirection: "row",
    gap: 4,
    padding: 5,
    borderRadius: 16,
    backgroundColor: "rgba(12,8,28,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segBtnActive: {
    backgroundColor: PURPLE,
  },
  segText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  segTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(6,4,14,0.6)",
  },
  ctaWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cta: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  goalText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  goalHighlight: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 1,
  },
  goalSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
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
    backgroundColor: "#252542",
    flexDirection: "row",
    alignItems: "center",
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
