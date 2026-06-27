// ──────────────────────────────────────────────────────────────────────────────
// MPStreakBanner — Horizontal streak card with flame icon and count
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, RADIUS, SPACING } from '@/theme';

type Props = {
  streak: number;
  message?: string;
};

export function MPStreakBanner({ streak, message }: Props) {
  if (streak <= 0) return null;

  return (
    <View
      style={{
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.2)',
      }}
    >
      <LinearGradient
        colors={['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: SPACING.lg,
          gap: 14,
        }}
      >
        {/* Flame icon */}
        <MPIcon name="Flame" size="lg" color="gold" />

        {/* Text */}
        <View style={{ flex: 1, gap: 2 }}>
          <MPText variant="h3" color="gold">
            {streak} Day Streak 🔥
          </MPText>
          {message && (
            <MPText variant="body-sm" color="secondary">
              {message}
            </MPText>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}
