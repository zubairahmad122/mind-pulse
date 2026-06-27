// ──────────────────────────────────────────────────────────────────────────────
// MPOnboardingFlow — Swiper container with pagination dots, skip, and CTA
// ──────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { MPText } from '@/components/atoms/MPText';
import { MPButton } from '@/components/atoms/MPButton';
import { MPOnboardingSlide } from '@/components/organisms/MPOnboardingSlide';
import { COLORS, SPACING, RADIUS } from '@/theme';
import type { ImageSourcePropType } from 'react-native';

export interface OnboardingPage {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
}

type Props = {
  pages: OnboardingPage[];
  onSkip: () => void;
  onComplete: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MPOnboardingFlow({ pages, onSkip, onComplete }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = currentPage === pages.length - 1;

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Skip button — top right */}
      {!isLast && (
        <TouchableOpacity
          onPress={onSkip}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={{
            position: 'absolute',
            top: SPACING['4xl'],
            right: SPACING['2xl'],
            zIndex: 10,
            padding: SPACING.sm,
          }}
        >
          <MPText variant="body" color="muted">
            Skip
          </MPText>
        </TouchableOpacity>
      )}

      {/* Slides — horizontal scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        scrollEventThrottle={16}
      >
        {pages.map((page, i) => (
          <MPOnboardingSlide
            key={i}
            title={page.title}
            subtitle={page.subtitle}
            image={page.image}
            isLast={isLast}
            ctaLabel="Get Started Free"
            onCtaPress={onComplete}
          />
        ))}
      </ScrollView>

      {/* Bottom area: pagination dots + Next button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING['2xl'],
          paddingBottom: SPACING['4xl'],
        }}
      >
        {/* Pagination dots */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentPage ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === currentPage ? COLORS.purple : COLORS.elevated,
              }}
            />
          ))}
        </View>

        {/* Next button (not shown on last slide — CTA is in the slide) */}
        {!isLast && (
          <MPButton
            variant="primary"
            size="sm"
            title="Next"
            onPress={() => goToPage(currentPage + 1)}
          />
        )}
      </View>
    </View>
  );
}
