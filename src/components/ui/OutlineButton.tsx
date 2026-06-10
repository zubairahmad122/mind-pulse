import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/radius';
import { typography } from '@/constants/typography';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export function OutlineButton({ label, onPress, style, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'transparent',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  disabled: { opacity: 0.5 },
  label: {
    color: colors.text.primary,
    ...typography.bodyLarge,
    fontWeight: '600',
  },
});
