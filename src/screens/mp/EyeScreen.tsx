// ──────────────────────────────────────────────────────────────────────────────
// EyeScreen — Eye health hub with exercises, games, and stats
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MPText } from '@/components/atoms/MPText';
import { MPFeatureCard } from '@/components/molecules/MPFeatureCard';
import { MPSectionHeader } from '@/components/molecules/MPSectionHeader';
import { MPAICard } from '@/components/molecules/MPAICard';
import { COLORS, SPACING } from '@/theme';

const EYE_FEATURES = [
  { iconName: 'Eye', label: 'Eye Exercises', iconBgColor: COLORS.cyan },
  { iconName: 'Gamepad2', label: 'Eye Games', iconBgColor: COLORS.blue },
  { iconName: 'Clock', label: 'Eye Break', iconBgColor: COLORS.purple },
  { iconName: 'TrendingUp', label: 'Progress', iconBgColor: COLORS.green },
];

export default function EyeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{
        paddingHorizontal: SPACING['2xl'],
        paddingTop: insets.top + SPACING.lg,
        paddingBottom: insets.bottom + SPACING['4xl'],
        gap: SPACING.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <MPText variant="h1" color="primary">
        Eye Health
      </MPText>

      <MPAICard text="Your eye strain has reduced 15% this week. Keep up the daily exercises!" />

      <View>
        <MPSectionHeader title="Training" first />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.sm }}>
          {EYE_FEATURES.map((feat) => (
            <MPFeatureCard
              key={feat.iconName}
              iconName={feat.iconName}
              label={feat.label}
              iconBgColor={feat.iconBgColor}
              onPress={() => {
                // Navigate to feature
              }}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
