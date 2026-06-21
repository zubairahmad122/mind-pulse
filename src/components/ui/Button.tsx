import { LinearGradient } from 'expo-linear-gradient';
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

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[styles.glow, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#7EB8FF', '#1A8FFF', '#0F6FD6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.primaryFill}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryLabel}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantClass =
    variant === 'outline'
      ? 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)]'
      : 'bg-transparent';

  return (
    <TouchableOpacity
      className={`w-full rounded-full items-center justify-center min-h-[56px] ${variantClass} ${isDisabled ? 'opacity-40' : ''}`}
      style={style}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.purple} size="small" />
      ) : (
        <Text
          className={`font-bold ${
            variant === 'outline' ? 'text-[15px] text-[#7EB8FF]' : 'text-sm text-app-muted'
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
    borderRadius: 28,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryFill: {
    width: '100%',
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
