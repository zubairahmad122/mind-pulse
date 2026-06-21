import AnimatedBackground from '@/components/AnimatedBackground';
import { BottomSheet } from '@/components/onboarding/SceneKit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  showBack?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
};

export default function AuthHeroLayout({
  children,
  showBack = true,
  sheetStyle,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground />

      {showBack && (
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            position: 'absolute', top: Math.max(insets.top, 16) + 8, left: 24, zIndex: 10,
            width: 36, height: 36, borderRadius: 18,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Sheet — scrollable form content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <BottomSheet style={[{ flex: 1, paddingTop: Math.max(insets.top, 16) + 64, paddingBottom: Math.max(insets.bottom, 16) + 24 }, sheetStyle]}>
            {children}
          </BottomSheet>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
