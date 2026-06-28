import { GlassCard } from "@/components/ui/GlassCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { adjustTime } from "@/utils/formatTime";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PURPLE = "#8B5CF6";

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
        size={20}
        color={PURPLE}
      />
      <Text style={styles.stepLabel}>{stepLabel}</Text>
    </TouchableOpacity>
  );
}

export function TimePickerRow({ label, hint, value, onChange }: Props) {
  return (
    <GlassCard style={styles.card}>
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
          <Text style={styles.quickText}>−1 hour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => onChange(adjustTime(value, 60))}
        >
          <Text style={styles.quickText}>+1 hour</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.md },
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
    minWidth: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 14,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    gap: 4,
    // No `elevation` here on purpose — Android's elevation shadow ignores
    // shadowColor and draws from the view's full rectangle, which shows
    // through a translucent background as a visible colored square.
    shadowColor: "rgba(167, 139, 250, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stepLabel: {
    ...typography.caption,
    color: PURPLE,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.35)",
    backgroundColor: "rgba(167, 139, 250, 0.08)",
    alignItems: "center",
  },
  quickText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
