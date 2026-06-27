// ──────────────────────────────────────────────────────────────────────────────
// HomeTipCard — Today's tip with standard MPCard styling (no green border)
// ──────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { MPCard } from '@/components/atoms/MPCard';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SPACING } from '@/theme';

type Props = {
  tip: string;
  /** Optional focus area label shown next to the icon */
  focusArea?: string;
};

export function HomeTipCard({ tip, focusArea }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const handleTextLayout = useCallback((e: { nativeEvent: { lines: unknown[] } }) => {
    if (e.nativeEvent.lines.length > 2) {
      setIsOverflowing(true);
    }
  }, []);

  return (
    <MPCard>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: 'rgba(59,130,246,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lightbulb size={14} color={COLORS.blue} strokeWidth={2} />
        </View>
        <MPText variant="caption" color="blue">
          {focusArea ? `${focusArea.toUpperCase()} TIP` : 'TIP FOR TODAY'}
        </MPText>
      </View>

      {/* Body */}
      <MPText
        variant="body-sm"
        color="secondary"
        numberOfLines={expanded ? undefined : 2}
        ellipsizeMode="tail"
        onTextLayout={handleTextLayout}
        style={{ lineHeight: 20 }}
      >
        {tip}
      </MPText>

      {/* Read more toggle — only shown when text actually overflows */}
      {isOverflowing && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.6}
          style={{ marginTop: 6 }}
        >
          <MPText variant="body-sm" color="purple-light">
            {expanded ? 'Show less' : 'Read more →'}
          </MPText>
        </TouchableOpacity>
      )}
    </MPCard>
  );
}
