// ──────────────────────────────────────────────────────────────────────────────
// MPModalWrapper — Bottom sheet / modal with drag handle, close button, scrollable content
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, TouchableOpacity, ScrollView, Modal, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, RADIUS, SPACING, SIZES } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export function MPModalWrapper({
  visible,
  onClose,
  title,
  children,
  contentContainerStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, backgroundColor: COLORS.card }}>
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: SPACING.md }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: COLORS.textMuted,
              opacity: 0.4,
            }}
          />
        </View>

        {/* Header row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: SPACING['2xl'],
            paddingVertical: SPACING.sm,
            minHeight: 44,
          }}
        >
          <View style={{ width: 44 }} />

          {title && (
            <MPText variant="h3" color="primary" style={{ flex: 1, textAlign: 'center' }}>
              {title}
            </MPText>
          )}

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              width: SIZES.touchTarget,
              height: SIZES.touchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MPIcon name="X" size="md" color="muted" />
          </TouchableOpacity>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingHorizontal: SPACING['2xl'], paddingBottom: insets.bottom + SPACING['2xl'] },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
