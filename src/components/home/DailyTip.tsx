import { GlassCard } from "@/components/ui/GlassCard";
import { PILLAR_COLORS, RADIUS, SHADOWS, SURFACE_TINT } from "@/constants/designSystem";
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

// Same accent per pillar as everywhere else (Quick Actions, Daily Challenge) —
// keeps the tip card visually tied to the area it's actually advising on.
const FOCUS_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  Eyes: { icon: Eye, color: PILLAR_COLORS.eye },
  Sleep: { icon: Moon, color: PILLAR_COLORS.sleep },
  Mind: { icon: Sparkles, color: PILLAR_COLORS.mind },
};

type Props = { tip: string; focusArea?: FocusArea };

export function DailyTip({ tip, focusArea }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = focusArea ? FOCUS_ICON[focusArea] : null;
  const Icon = config?.icon ?? Lightbulb;
  const iconColor = config?.color ?? PILLAR_COLORS.mind;

  // Home is a teaser, not the place to read the whole tip — collapse to two
  // lines by default and only offer the toggle when there's more to see.
  const canExpand = tip.length > 120;

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
    <GlassCard
      noPadding
      style={{ borderRadius: RADIUS.card, ...SHADOWS.small }}
      tint={SURFACE_TINT.tip}
    >
      <View style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
        {/* Header row — icon + label */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: iconColor + "1F",
              borderWidth: 1,
              borderColor: iconColor + "33",
            }}
          >
            <Icon size={15} color={iconColor} strokeWidth={2} />
          </View>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.5,
              color: "rgba(245,247,251,0.55)",
              textTransform: "uppercase",
            }}
          >
            Today&apos;s Tip
          </Text>
        </View>

        {/* Teaser line — collapses to one line; full tip is one tap away */}
        <Text
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 20,
          }}
          numberOfLines={canExpand && !expanded ? 2 : undefined}
        >
          {tip}
        </Text>

        {canExpand && (
          <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: PILLAR_COLORS.mind }}>
              {expanded ? "Show less ↑" : "Read →"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
}
