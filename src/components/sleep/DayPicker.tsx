import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type Props = {
  selected: string[];
  onChange: (days: string[]) => void;
};

export function DayPicker({ selected, onChange }: Props) {
  const toggle = (day: string) => {
    if (selected.includes(day)) {
      onChange(selected.filter(d => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  return (
    <View style={styles.row}>
      {DAYS.map(day => {
        const active = selected.includes(day);
        return (
          <TouchableOpacity
            key={day}
            style={[styles.day, active && styles.dayActive]}
            onPress={() => toggle(day)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dayText, active && styles.dayTextActive]}>{day.charAt(0)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  day: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayActive: { backgroundColor: colors.accent.purple, borderColor: colors.accent.purple },
  dayText: { ...typography.label, color: colors.text.secondary },
  dayTextActive: { color: colors.text.primary, fontWeight: '700' },
});
