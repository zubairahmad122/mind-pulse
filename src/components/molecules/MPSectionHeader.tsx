import { View, TouchableOpacity } from 'react-native';
import { MPText } from '@/components/atoms/MPText';
import { SPACING } from '@/theme';

type Props = {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
  /** When true, drops top margin to 0 (first item in a scrollable list). */
  first?: boolean;
};

export function MPSectionHeader({ title, rightLabel, onRightPress, first }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: first ? 0 : SPACING.lg,
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING['2xl'],
      }}
      accessibilityRole="header"
    >
      <MPText variant="caption" color="secondary">
        {title.toUpperCase()}
      </MPText>

      {rightLabel && onRightPress && (
        <TouchableOpacity
          onPress={onRightPress}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MPText variant="body-sm" color="purple-light">
            {rightLabel} →
          </MPText>
        </TouchableOpacity>
      )}
    </View>
  );
}
