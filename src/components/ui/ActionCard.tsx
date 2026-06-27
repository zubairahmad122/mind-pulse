import { spacing } from "@/constants/spacing";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  /** Lucide icon rendered in the left tinted badge. */
  icon: LucideIcon;
  /** Primary label. */
  title: string;
  /** Optional secondary line under the title. */
  description?: string;
  /** Optional override colour for the description (e.g. a warning state). */
  descriptionColor?: string;
  /** Accent colour for the icon + badge tint + glow. Defaults to a soft blue. */
  accent?: string;
  /** Press handler — fires a light haptic before invoking. */
  onPress?: () => void;
  /**
   * Right-hand element. Defaults to a chevron. Pass `null` to hide it, or a
   * custom node (e.g. a toggle / badge) to replace it.
   */
  trailing?: ReactNode;
  /** Bottom margin between stacked cards. Defaults to `spacing.sm + 2`. */
  spacingBottom?: number;
};

const DEFAULT_ACCENT = "#60a5fa";
const CARD_RADIUS = 22;

/**
 * Premium action card with a rich glass aesthetic: gradient-tinted background
 * that picks up the accent colour, a luminous icon badge with its own gradient
 * glow, and refined typography. Reused across Home (Quick Actions) and Profile
 * (account menu) for a cohesive look.
 */
export function ActionCard({
  icon: Icon,
  title,
  description,
  descriptionColor,
  accent = DEFAULT_ACCENT,
  onPress,
  trailing,
  spacingBottom = spacing.sm + 2,
}: Props) {
  const handlePress = () => {
    if (!onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = (
    <View
      style={[
        styles.card,
        { marginBottom: spacingBottom, borderColor: accent + "28" },
      ]}
    >
      <View style={styles.row}>
        {/* Icon badge with its own gradient + glow ring */}
        <View
          style={[
            styles.iconBadge,
            { shadowColor: accent, borderColor: accent + "35" },
          ]}
        >
          <LinearGradient
            colors={[accent + "28", accent + "12"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Icon size={21} color={accent} strokeWidth={1.8} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {description ? (
            <Text
              style={[
                styles.description,
                descriptionColor ? { color: descriptionColor } : null,
              ]}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {trailing === undefined ? (
          <View
            style={[
              styles.arrowBtn,
              { backgroundColor: accent + "18", borderColor: accent + "30" },
            ]}
          >
            <ChevronRight size={18} color={accent} strokeWidth={2.3} />
          </View>
        ) : (
          trailing
        )}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      className="relative rounded-xl "
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    zIndex: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f6f8fc",
    letterSpacing: 0.15,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(245,247,251,0.6)",
  },
});
