import { TouchableOpacity } from 'react-native';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, RADIUS } from '@/theme';

type Props = {
  value: string;
  sublabel: string;
  selected: boolean;
  onPress: () => void;
};

export function MPGoalChip({ value, sublabel, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${value} ${sublabel}`}
      style={{
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: RADIUS.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? COLORS.purple : COLORS.borderSubtle,
        backgroundColor: selected ? 'rgba(139,92,246,0.08)' : COLORS.card,
        minWidth: 80,
        // Subtle glow when selected
        shadowColor: selected ? COLORS.purple : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: selected ? 0.25 : 0,
        shadowRadius: selected ? 12 : 0,
        elevation: selected ? 4 : 0,
      }}
    >
      <MPText variant="h3" color="primary">
        {value}
      </MPText>
      <MPText variant="caption-xs" color="secondary" style={{ marginTop: 4 }}>
        {sublabel}
      </MPText>
    </TouchableOpacity>
  );
}
