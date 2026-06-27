import { View } from 'react-native';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, RADIUS, SPACING } from '@/theme';

type Props = {
  text: string;
};

export function MPAICard({ text }: Props) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
        padding: SPACING.lg,
        gap: 8,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MPIcon name="Sparkles" size="xs" color="purple-light" />
        <MPText variant="caption" color="purple-light">
          AI INSIGHT
        </MPText>
      </View>

      {/* AI text — max 2 lines, always */}
      <MPText variant="body-sm" color="purple-light" numberOfLines={2}>
        {text}
      </MPText>
    </View>
  );
}
