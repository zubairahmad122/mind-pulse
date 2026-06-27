// ──────────────────────────────────────────────────────────────────────────────
// App entry point — Expo Router root layout with providers
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { COLORS, ROUTES } from '@/constants';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { RelaxProvider } from '@/context/RelaxContext';
import { PaywallProvider } from '@/components/paywall/PaywallProvider';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isGuestMode, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)' || segments[0] === undefined;
    const inApp = segments[0] === '(app)';
    const hasAccess = Boolean(user) || isGuestMode;

    if (hasAccess && inAuth) {
      router.replace(ROUTES.appHome as never);
    }

    if (!hasAccess && inApp) {
      router.replace(ROUTES.authSignIn as never);
    }
  }, [user, isGuestMode, loading, segments, router]);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.purple} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LanguageProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <RelaxProvider>
                <PaywallProvider>
                  <RootLayoutNav />
                </PaywallProvider>
              </RelaxProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
