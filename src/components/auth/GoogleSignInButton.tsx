import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function GoogleSignInButton({ onPress, loading, disabled }: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.btn, isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="rgba(245,247,251,0.8)" size="small" />
      ) : (
        <>
          <View style={styles.icon}>
            <Text style={styles.iconLetter}>G</Text>
          </View>
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 50,
    gap: 12,
  },
  disabled: { opacity: 0.5 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLetter: { color: '#4285F4', fontWeight: '700', fontSize: 13 },
  label: { color: 'rgba(245,247,251,0.85)', fontWeight: '600', fontSize: 14 },
});
