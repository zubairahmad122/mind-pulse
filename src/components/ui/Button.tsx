import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

type Variant = 'primary' | 'outline' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  const variantClass =
    variant === 'primary'
      ? 'bg-app-purple'
      : variant === 'outline'
      ? 'bg-transparent border border-app-border-hi'
      : 'bg-transparent';

  return (
    <TouchableOpacity
      className={`w-full rounded-2xl items-center justify-center min-h-[56px] ${variantClass} ${isDisabled ? 'opacity-40' : ''}`}
      style={[variant === 'primary' ? styles.glow : {}, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : COLORS.purple}
          size="small"
        />
      ) : (
        <Text
          className={`font-bold ${
            variant === 'primary'
              ? 'text-[15px] text-white tracking-[0.5px]'
              : variant === 'outline'
              ? 'text-[15px] text-white'
              : 'text-sm text-app-muted'
          }`}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
});
