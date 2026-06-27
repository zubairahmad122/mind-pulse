// ──────────────────────────────────────────────────────────────────────────────
// MPBadge — Atomic pill badge with variant colors
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text } from 'react-native';
import { Crown } from 'lucide-react-native';
import { COLORS, RADIUS, SIZES, SPACING, TYPOGRAPHY } from '@/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'premium' | 'info';

interface MPBadgeProps {
  variant?: BadgeVariant;
  text: string;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; text: string; borderColor?: string }
> = {
  default: {
    bg: COLORS.elevated,
    text: COLORS.textSecondary,
  },
  success: {
    bg: 'rgba(16,185,129,0.15)',
    text: COLORS.green,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  warning: {
    bg: 'rgba(249,115,22,0.15)',
    text: COLORS.orange,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  premium: {
    bg: 'rgba(245,158,11,0.15)',
    text: COLORS.gold,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  info: {
    bg: 'rgba(59,130,246,0.15)',
    text: COLORS.blue,
    borderColor: 'rgba(59,130,246,0.3)',
  },
};

export function MPBadge({ variant = 'default', text, icon }: MPBadgeProps) {
  const style = VARIANT_STYLES[variant];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: style.bg,
        borderWidth: style.borderColor ? 1 : 0,
        borderColor: style.borderColor,
        borderRadius: RADIUS.full,
        paddingHorizontal: SIZES.badgePaddingH,
        paddingVertical: SIZES.badgePaddingV,
        alignSelf: 'flex-start',
      }}
    >
      {variant === 'premium' && !icon && (
        <Crown size={10} color={style.text} />
      )}
      {icon}
      <Text
        style={{
          fontSize: TYPOGRAPHY['caption-xs'].fontSize,
          fontWeight: TYPOGRAPHY['caption-xs'].fontWeight,
          fontFamily: TYPOGRAPHY['caption-xs'].fontFamily,
          color: style.text,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
