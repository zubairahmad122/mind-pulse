import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

/** Lightweight gradient for auth screens — no Reanimated (keeps keyboard snappy). */
export function StaticAuthBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary, '#1a1f35']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
