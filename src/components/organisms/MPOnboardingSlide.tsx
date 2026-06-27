// ──────────────────────────────────────────────────────────────────────────────
// MPOnboardingSlide — Full-screen slide for onboarding flow
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Image, type ImageSourcePropType } from 'react-native';
import { MPText } from '@/components/atoms/MPText';
import { MPButton } from '@/components/atoms/MPButton';
import { COLORS, SPACING } from '@/theme';

type Props = {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  isLast?: boolean;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export function MPOnboardingSlide({
  title,
  subtitle,
  image,
  isLast,
  ctaLabel,
  onCtaPress,
}: Props) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING['2xl'],
        gap: 32,
      }}
    >
      {/* Illustration — top 50% */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={image}
          style={{ width: 240, height: 240, resizeMode: 'contain' }}
        />
      </View>

      {/* Text — bottom 50% */}
      <View style={{ alignItems: 'center', gap: 12, paddingBottom: 48 }}>
        <MPText variant="h2" color="primary" style={{ textAlign: 'center' }}>
          {title}
        </MPText>

        <MPText
          variant="body"
          color="secondary"
          style={{ textAlign: 'center', lineHeight: 24 }}
        >
          {subtitle}
        </MPText>

        {isLast && ctaLabel && onCtaPress && (
          <View style={{ marginTop: SPACING.xl }}>
            <MPButton
              variant="primary"
              size="lg"
              fullWidth
              title={ctaLabel}
              onPress={onCtaPress}
            />
          </View>
        )}
      </View>
    </View>
  );
}
