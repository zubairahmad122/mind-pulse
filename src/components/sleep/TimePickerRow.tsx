import { GlassCard } from "@/components/ui/GlassCard";
import { colors } from "@/constants/colors";
import { PILLAR_COLORS } from "@/constants/designSystem";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { adjustTime } from "@/utils/formatTime";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const INDIGO = PILLAR_COLORS.sleep;

/** Format a "HH:MM" 24h string as "12:00 AM". */
function to12h(value: string): { time: string; period: string } {
  const [h, m] = value.split(":").map(Number);
  const hh = h % 24;
  const hour12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return {
    time: `${hour12}:${String(m).padStart(2, "0")}`,
    period: hh < 12 ? "AM" : "PM",
  };
}

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  /** Skip the own GlassCard wrapper — used when a caller (e.g. the Routine
   * schedule card) hosts two rows inside one shared glass surface instead of
   * two separate cards. */
  bare?: boolean;
};

function StepButton({
  icon,
  stepLabel,
  onPress,
}: {
  icon: "remove" | "add";
  stepLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.stepBtn}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon === "remove" ? "remove" : "add"}
        size={17}
        color={INDIGO}
      />
      <Text style={styles.stepLabel}>{stepLabel}</Text>
    </TouchableOpacity>
  );
}

export function TimePickerRow({ label, hint, value, onChange, bare }: Props) {
  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.timeRow}>
        <StepButton
          icon="remove"
          stepLabel="15m"
          onPress={() => onChange(adjustTime(value, -15))}
        />
        <View style={styles.timeCenter}>
          <View style={styles.timeInline}>
            <Text style={styles.time}>{to12h(value).time}</Text>
            <Text style={styles.period}>{to12h(value).period}</Text>
          </View>
        </View>
        <StepButton
          icon="add"
          stepLabel="15m"
          onPress={() => onChange(adjustTime(value, 15))}
        />
      </View>
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => onChange(adjustTime(value, -60))}
        >
          <Text style={styles.quickText}>−1h</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => onChange(adjustTime(value, 60))}
        >
          <Text style={styles.quickText}>+1h</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (bare) {
    return <View style={styles.bareRow}>{content}</View>;
  }
  return <GlassCard style={styles.card}>{content}</GlassCard>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  bareRow: { gap: spacing.sm },
  header: { gap: 2 },
  label: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  hint: { ...typography.caption, color: colors.text.tertiary },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(108,99,255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(108,99,255, 0.25)",
    gap: 1,
  },
  stepLabel: {
    ...typography.caption,
    color: INDIGO,
    fontWeight: "700",
  },
  timeCenter: { alignItems: "center", gap: 2 },
  timeInline: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  time: {
    ...typography.headingLarge,
    color: colors.text.primary,
    fontVariant: ["tabular-nums"],
  },
  period: {
    ...typography.bodyLarge,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
  },
  quickText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
