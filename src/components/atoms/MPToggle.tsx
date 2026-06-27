// ──────────────────────────────────────────────────────────────────────────────
// MPToggle — Atomic toggle/switch with theme colors
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { COLORS, SIZES } from '@/theme';
import * as Haptics from 'expo-haptics';
import { HAPTICS } from '@/theme';

interface MPToggleProps extends Omit<SwitchProps, 'value' | 'onValueChange'> {
  value: boolean;
  onValueChange: (val: boolean) => void;
  activeTrackColor?: string;
}

export function MPToggle({
  value,
  onValueChange,
  activeTrackColor = COLORS.purple,
  ...rest
}: MPToggleProps) {
  const handleChange = (val: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onValueChange(val);
  };

  return (
    <Switch
      value={value}
      onValueChange={handleChange}
      trackColor={{
        false: COLORS.elevated,
        true: activeTrackColor,
      }}
      thumbColor={COLORS.textPrimary}
      ios_backgroundColor={COLORS.elevated}
      style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
      {...rest}
    />
  );
}
