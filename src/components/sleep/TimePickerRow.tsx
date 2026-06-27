import { GlassCard } from "@/components/ui/GlassCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { adjustTime } from "@/utils/formatTime";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
        color={colors.accent.purple}
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
          <Text style={styles.time}>{value}</Text>
          <Text style={styles.timeFormat}>24-hour</Text>
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
    color: colors.accent.purple,
    fontWeight: "700",
  },
  timeCenter: { alignItems: "center", gap: 2 },
  time: {
    ...typography.headingLarge,
    color: colors.text.primary,
    fontVariant: ["tabular-nums"],
  },
  timeFormat: { ...typography.caption, color: colors.text.tertiary },
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
