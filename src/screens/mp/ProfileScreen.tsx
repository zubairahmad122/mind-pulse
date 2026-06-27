// ──────────────────────────────────────────────────────────────────────────────
// ProfileScreen — User profile with settings and account
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MPText } from '@/components/atoms/MPText';
import { MPBadge } from '@/components/atoms/MPBadge';
import { MPCard } from '@/components/atoms/MPCard';
import { MPListItem } from '@/components/molecules/MPListItem';
import { MPSectionHeader } from '@/components/molecules/MPSectionHeader';
import { useUserStore } from '@/stores/useUserStore';
import { COLORS, SPACING } from '@/theme';
import { SCREENS } from '@/navigation/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPro = useUserStore((s) => s.isPro);
  const streak = useUserStore((s) => s.streak);

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
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MPText variant="h1" color="primary">
          Profile
        </MPText>
        {isPro && <MPBadge text="PRO" variant="premium" />}
      </View>

      {/* ── Stats ───────────────────────────────────────────── */}
      <MPCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <MPText variant="h2" color="gold">{streak}</MPText>
            <MPText variant="caption-xs" color="secondary">Streak</MPText>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <MPText variant="h2" color="purple">12</MPText>
            <MPText variant="caption-xs" color="secondary">Sessions</MPText>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <MPText variant="h2" color="green">85</MPText>
            <MPText variant="caption-xs" color="secondary">Score</MPText>
          </View>
        </View>
      </MPCard>

      {/* ── Settings ────────────────────────────────────────── */}
      <View>
        <MPSectionHeader title="Settings" first />
        <MPCard>
          <MPListItem
            iconName="Bell"
            iconBgColor={COLORS.blue}
            title="Notifications"
            subtitle="Manage alerts and reminders"
            accessory={{ kind: 'chevron' }}
            onPress={() => {}}
          />
          <MPListItem
            iconName="Globe"
            iconBgColor={COLORS.green}
            title="Language"
            subtitle="English"
            accessory={{ kind: 'chevron' }}
            onPress={() => {}}
          />
          <MPListItem
            iconName="Volume2"
            iconBgColor={COLORS.purple}
            title="Sounds & Haptics"
            subtitle="Customize feedback"
            accessory={{ kind: 'chevron' }}
            onPress={() => {}}
          />
        </MPCard>
      </View>

      {/* ── Account ─────────────────────────────────────────── */}
      <View>
        <MPSectionHeader title="Account" />
        <MPCard>
          <MPListItem
            iconName="Crown"
            iconBgColor={COLORS.gold}
            title={isPro ? 'MindPulse Pro' : 'Upgrade to Pro'}
            subtitle={isPro ? 'Active subscription' : 'Unlock all features'}
            accessory={{ kind: 'chevron' }}
            onPress={() => router.push(SCREENS.PAYWALL as never)}
          />
          <MPListItem
            iconName="Settings"
            iconBgColor={COLORS.elevated}
            title="Account Settings"
            subtitle="Email, password, data"
            accessory={{ kind: 'chevron' }}
            onPress={() => router.push(SCREENS.ACCOUNT_SETTINGS as never)}
          />
          <MPListItem
            iconName="Shield"
            iconBgColor={COLORS.cyan}
            title="Privacy"
            subtitle="Data and permissions"
            accessory={{ kind: 'chevron' }}
            onPress={() => {}}
          />
        </MPCard>
      </View>

      {/* ── Footer ──────────────────────────────────────────── */}
      <MPText variant="caption-xs" color="muted" style={{ textAlign: 'center', marginTop: SPACING.md }}>
        MindPulse v1.0.0
      </MPText>
    </ScrollView>
  );
}
