import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// ── Bottom sheet — rounded card that anchors title/copy/CTAs on every
// Welcome/Onboarding/Sign In/Sign Up screen, so the whole auth flow shares
// one consistent card component and treatment.

export function BottomSheet({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          borderTopWidth: 1, borderColor: 'rgba(26,143,255,0.18)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <ExpoLinearGradient
        colors={['rgba(16,26,52,0.98)', 'rgba(10,17,38,0.99)']}
        start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ paddingHorizontal: 28, paddingTop: 28 }}>
        {children}
      </View>
    </View>
  );
}

export const SHEET_BG = '#101A34';
