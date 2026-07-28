// ──────────────────────────────────────────────────────────────────────────────
// App entry point — Expo Router root layout with providers
// ──────────────────────────────────────────────────────────────────────────────

import './global.css';

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
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
import * as Sentry from '@sentry/react-native';

import { COLORS, ROUTES } from '@/constants';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { RelaxProvider } from '@/context/RelaxContext';
import { PaywallProvider } from '@/components/paywall/PaywallProvider';
import { AnimatedLaunchScreen } from '@/components/AnimatedLaunchScreen';

Sentry.init({
  dsn: 'https://4d1abf4f165aaf226f6a58a70cdf65d7@o4511705450414080.ingest.de.sentry.io/4511705459261520',
  // Dev crashes show up in Metro already — only report from real builds.
  // (Connection verified 2026-07-09 with a temporary test event.)
  enabled: !__DEV__,
  // 10% performance traces: enough signal without burning the free quota.
  tracesSampleRate: 0.1,
});

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isGuestMode, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [launchFinished, setLaunchFinished] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  const finishLaunch = useCallback(() => setLaunchFinished(true), []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)' || segments[0] === undefined;
    const inApp = segments[0] === '(app)';
    const hasAccess = Boolean(user) || isGuestMode;
    const isGuest = Boolean(user?.isAnonymous) || isGuestMode;
    const isGuestCreatingAccount =
      isGuest &&
      segments[0] === '(auth)' &&
      segments[1] === 'create-account';

    // Guests need access to this auth screen to convert their anonymous/local
    // session into a permanent account. Other auth screens still redirect
    // authenticated users back into the app.
    if (hasAccess && inAuth && !isGuestCreatingAccount) {
      router.replace(ROUTES.appHome as never);
    }

    if (!hasAccess && inApp) {
      router.replace(ROUTES.authSignIn as never);
    }
  }, [user, isGuestMode, loading, segments, router]);

  const appReady = (fontsLoaded || Boolean(fontsError)) && !loading;

  if (!launchFinished) {
    return <AnimatedLaunchScreen ready={appReady} onFinish={finishLaunch} />;
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

function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppErrorBoundary>
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
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1 },
});
