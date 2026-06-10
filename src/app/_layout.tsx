import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "./global.css";
import { COLORS, ROUTES } from '@/constants';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { RelaxProvider } from '@/context/RelaxContext';

function RootLayoutNav() {
  const { user, isGuestMode, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)' || segments[0] === undefined;
    const inApp = segments[0] === '(app)';
    const hasAccess = Boolean(user) || isGuestMode;

    if (hasAccess && inAuth) {
      router.replace(ROUTES.appHome as never);
    }

    if (!hasAccess && inApp) {
      router.replace(ROUTES.welcome);
    }
  }, [user, isGuestMode, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={COLORS.purple} size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <RelaxProvider>
              <RootLayoutNav />
            </RelaxProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
