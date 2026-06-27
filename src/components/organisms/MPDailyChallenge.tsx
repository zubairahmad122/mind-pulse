// ──────────────────────────────────────────────────────────────────────────────
// MPDailyChallenge — Daily challenge card with target icon and progress
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View } from 'react-native';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { MPBadge } from '@/components/atoms/MPBadge';
import { COLORS, RADIUS, SPACING, SHADOWS } from '@/theme';

type Props = {
  /** e.g. "Beginner", "Recovery", "Advanced" */
  category: string;
  /** e.g. "3 min" */
  duration?: string;
  description: string;
  completed?: boolean;
};

export function MPDailyChallenge({
  category,
  duration,
  description,
  completed = false,
}: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: completed ? 'rgba(16,185,129,0.3)' : COLORS.borderSubtle,
        gap: 14,
        ...SHADOWS.card,
      }}
    >
      {/* Target / Check icon */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: completed ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MPIcon
          name={completed ? 'Check' : 'Target'}
          size="md"
          iconColor={completed ? COLORS.green : COLORS.purple}
        />
      </View>

      {/* Text */}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MPText variant="caption" color="secondary">
            {category.toUpperCase()}
          </MPText>
          {duration && (
            <>
              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted }} />
              <MPText variant="caption" color="muted">
                {duration}
              </MPText>
            </>
          )}
        </View>
        <MPText variant="body-sm" color="primary" numberOfLines={2}>
          {description}
        </MPText>
      </View>

      {/* Status badge */}
      {completed ? (
        <MPBadge text="Done" variant="success" />
      ) : (
        <MPIcon name="ChevronRight" size="sm" color="muted" />
      )}
    </View>
  );
}
