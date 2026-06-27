import { View, TouchableOpacity } from 'react-native';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SIZES } from '@/theme';

type Props = {
  activeDays: number[];
  onToggle: (dayIndex: number) => void;
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SIZE = SIZES.dayCircle;

export function MPDaySelector({ activeDays, onToggle }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
      }}
    >
      {DAYS.map((label, i) => {
        const isActive = activeDays.includes(i);
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onToggle(i)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${label} day`}
            style={{
              width: DAY_SIZE,
              height: DAY_SIZE,
              borderRadius: DAY_SIZE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? COLORS.blue : COLORS.card,
              borderWidth: isActive ? 0 : 1,
              borderColor: COLORS.borderSubtle,
            }}
          >
            <MPText
              variant="body-sm"
              color={isActive ? 'primary' : 'muted'}
              style={{ fontWeight: isActive ? '700' : '500' }}
            >
              {label}
            </MPText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
