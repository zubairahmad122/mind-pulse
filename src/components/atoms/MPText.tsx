// ──────────────────────────────────────────────────────────────────────────────
// MPText — Atomic text component with variant + color tokens
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { TYPOGRAPHY, COLORS, type TypographyVariant } from '@/theme';

type ColorToken =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'purple'
  | 'purple-light'
  | 'blue'
  | 'green'
  | 'gold'
  | 'red'
  | 'cyan'
  | 'orange';

const COLOR_MAP: Record<ColorToken, string> = {
  primary: COLORS.textPrimary,
  secondary: COLORS.textSecondary,
  muted: COLORS.textMuted,
  purple: COLORS.purple,
  'purple-light': COLORS.purpleLight,
  blue: COLORS.blue,
  green: COLORS.green,
  gold: COLORS.gold,
  red: COLORS.red,
  cyan: COLORS.cyan,
  orange: COLORS.orange,
};

interface MPTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  children: React.ReactNode;
}

export function MPText({
  variant = 'body',
  color = 'primary',
  style,
  children,
  ...rest
}: MPTextProps) {
  const token = TYPOGRAPHY[variant];
  return (
    <RNText
      style={[
        {
          fontSize: token.fontSize,
          fontWeight: token.fontWeight,
          lineHeight: token.lineHeight,
          letterSpacing: token.letterSpacing ?? 0,
          fontFamily: token.fontFamily,
          color: COLOR_MAP[color],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
