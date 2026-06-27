// ──────────────────────────────────────────────────────────────────────────────
// MPScreenWrapper — Standard screen layout with SafeArea, header, scrollable content
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, ScrollView, TouchableOpacity, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SPACING, TYPOGRAPHY } from '@/theme';
import { useRouter } from 'expo-router';

interface Props {
  title?: string;
  /** Right-side header element (icon button) */
  rightElement?: React.ReactNode;
  showBack?: boolean;
  scrollable?: boolean;
  children: React.ReactNode;
  /** ScrollView content container style overrides */
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export function MPScreenWrapper({
  title,
  rightElement,
  showBack = false,
  scrollable = true,
  children,
  contentContainerStyle,
}: Props) {
  const router = useRouter();

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING['2xl'],
        paddingVertical: SPACING.md,
        minHeight: 48,
      }}
    >
      {/* Left: back button or spacer */}
      <View style={{ width: showBack ? 44 : 44 }}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MPIcon name="ArrowLeft" size="md" color="primary" />
          </TouchableOpacity>
        )}
      </View>

      {/* Center: title */}
      {title && (
        <MPText variant="h1" color="primary" style={{ flex: 1, textAlign: 'center' }}>
          {title}
        </MPText>
      )}

      {/* Right: custom element or spacer */}
      <View style={{ width: 44, alignItems: 'flex-end' }}>
        {rightElement}
      </View>
    </View>
  );

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { paddingHorizontal: SPACING['2xl'], paddingBottom: SPACING['4xl'] },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: SPACING['2xl'] }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {header}
      {content}
    </SafeAreaView>
  );
}
