import { View, TouchableOpacity } from 'react-native';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, RADIUS } from '@/theme';

type Props = {
  hours: number;
  minutes: number;
  onAdjust: (deltaMinutes: number) => void;
};

const AdjustmentBtn = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={{
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      minWidth: 44,
      alignItems: 'center',
    }}
  >
    <MPText variant="body-sm" color="primary">
      {label}
    </MPText>
  </TouchableOpacity>
);

export function MPTimeSetter({ hours, minutes, onAdjust }: Props) {
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      {/* Row 1: ±15 minutes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <AdjustmentBtn label="-15m" onPress={() => onAdjust(-15)} />

        <MPText variant="h1" color="primary">
          {h}:{m}
        </MPText>

        <AdjustmentBtn label="+15m" onPress={() => onAdjust(15)} />
      </View>

      {/* Row 2: ±1 hour */}
      <View style={{ flexDirection: 'row', gap: 24 }}>
        <TouchableOpacity
          onPress={() => onAdjust(-60)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <MPText variant="body-sm" color="muted">
            - 1 hour
          </MPText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onAdjust(60)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <MPText variant="body-sm" color="muted">
            + 1 hour
          </MPText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
