import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

// rgba(123,127,255,...) below is PILLAR_COLORS.sleep (#7B7FFF) — the Sleep
// tab's frozen indigo accent, spelled out in rgba so it can carry per-state
// opacity without string concatenation.
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
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayActive: {
    backgroundColor: 'rgba(123,127,255,0.22)',
    borderColor: 'rgba(123,127,255,0.55)',
  },
  dayText: { ...typography.label, color: 'rgba(255,255,255,0.75)' },
  dayTextActive: { color: '#FFFFFF', fontWeight: '700' },
});
