import { GlassCard } from "@/components/ui/GlassCard";
import type { FocusArea } from "@/utils/scoring";
import {
    Eye,
    Lightbulb,
    Moon,
    Sparkles,
    type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { LayoutAnimation, Platform, Text, TouchableOpacity, UIManager, View } from "react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FOCUS_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  Eyes: { icon: Eye, color: "#A78BFA" },
  Sleep: { icon: Moon, color: "#A78BFA" },
  Mind: { icon: Sparkles, color: "#A78BFA" },
};

type Props = { tip: string; focusArea?: FocusArea };

export function DailyTip({ tip, focusArea }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = focusArea ? FOCUS_ICON[focusArea] : null;
  const Icon = config?.icon ?? Lightbulb;
  const iconColor = config?.color ?? "#A78BFA";

  // Show toggle only when tip is long enough to truncate — 150+ chars means it
  // genuinely needs truncation; shorter tips fit in 3 lines without a toggle.
  const canExpand = tip.length > 150;

  function toggle() {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    setExpanded((prev) => !prev);
  }

  return (
    <GlassCard style={{ marginBottom: 16, paddingBottom: 16 }}>
      {/* Header row — icon + label */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(167,139,250,0.12)",
            borderWidth: 1,
            borderColor: "rgba(167,139,250,0.2)",
          }}
        >
          <Icon size={15} color={iconColor} strokeWidth={2} />
        </View>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: "rgba(245,247,251,0.45)",
            textTransform: "uppercase",
          }}
        >
          Tip for Today
        </Text>
      </View>

      {/* Tip text — truncates at 3 lines when not expanded */}
      <Text
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 21,
          paddingBottom: 4,
        }}
        numberOfLines={canExpand && !expanded ? 3 : undefined}
      >
        {tip}
      </Text>

      {/* Read more / Show less toggle */}
      {canExpand && (
        <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#A78BFA" }}>
            {expanded ? "Show less ↑" : "Read more →"}
          </Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}
