// ──────────────────────────────────────────────────────────────────────────────
// RelaxScreen — Relaxation hub with session categories
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MPText } from '@/components/atoms/MPText';
import { MPFeatureCard } from '@/components/molecules/MPFeatureCard';
import { MPSectionHeader } from '@/components/molecules/MPSectionHeader';
import { MPEmptyState } from '@/components/molecules/MPEmptyState';
import { COLORS, SPACING } from '@/theme';

const CATEGORIES = [
  { iconName: 'Wind', label: 'Breathe', iconBgColor: COLORS.purple },
  { iconName: 'Leaf', label: 'Release', iconBgColor: COLORS.green },
  { iconName: 'Sun', label: 'Ground', iconBgColor: COLORS.gold },
  { iconName: 'Moon', label: 'Sleep', iconBgColor: COLORS.blue },
];

export default function RelaxScreen() {
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
        Relax
      </MPText>

      <MPText variant="body" color="secondary">
        Choose a relaxation session to calm your mind and body.
      </MPText>

      <View>
        <MPSectionHeader title="Sessions" first />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.sm }}>
          {CATEGORIES.map((cat) => (
            <MPFeatureCard
              key={cat.iconName}
              iconName={cat.iconName}
              label={cat.label}
              iconBgColor={cat.iconBgColor}
              onPress={() => {
                // Navigate to session
              }}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
