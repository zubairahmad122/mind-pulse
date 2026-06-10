import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

type AuthBackButtonProps = {
  marginBottom?: number;
};

export default function AuthBackButton({ marginBottom = 12 }: AuthBackButtonProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.backBtn, { marginBottom }]}
      onPress={() => router.back()}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={20} color={COLORS.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
