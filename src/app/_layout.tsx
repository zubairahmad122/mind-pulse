// ──────────────────────────────────────────────────────────────────────────────
// App entry point — Expo Router root layout with providers
// ──────────────────────────────────────────────────────────────────────────────

import './global.css';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import * as Sentry from '@sentry/react-native';

import { COLORS, ROUTES } from '@/constants';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { RelaxProvider } from '@/context/RelaxContext';
import { PaywallProvider } from '@/components/paywall/PaywallProvider';
import { AnimatedLaunchScreen } from '@/components/AnimatedLaunchScreen';
import { initAds } from '@/services/ads/initAds';

Sentry.init({
  dsn: 'https://4d1abf4f165aaf226f6a58a70cdf65d7@o4511705450414080.ingest.de.sentry.io/4511705459261520',
  // Dev crashes show up in Metro already — only report from real builds.
  // (Connection verified 2026-07-09 with a temporary test event.)
  enabled: !__DEV__,
  // 10% performance traces: enough signal without burning the free quota.
  tracesSampleRate: 0.1,
});

SplashScreen.preventAutoHideAsync();
initAds();

function RootLayoutNav() {
  const { user, isGuestMode, loading } = useAuth();
  // Widened to string[]: without generated typed routes, useSegments() is
  // typed as the 1-tuple [string], which rejects the segments[1] check below.
  const segments = useSegments() as string[];
  const router = useRouter();
  const [launchFinished, setLaunchFinished] = useState(false);
  const nativeSplashHidden = useRef(false);
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const finishLaunch = useCallback(() => setLaunchFinished(true), []);
  const hideNativeSplash = useCallback(() => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    SplashScreen.hide();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)' || segments[0] === undefined;
    const inApp = segments[0] === '(app)';
    const hasAccess = Boolean(user) || isGuestMode;
    const isGuest = Boolean(user?.isAnonymous) || isGuestMode;
    const isGuestAuthEntry =
      isGuest &&
      segments[0] === '(auth)' &&
      (segments[1] === 'create-account' || segments[1] === 'sign-in');

    // Guests need access to sign-in and account creation so they can convert
    // their anonymous/local session into a permanent account.
    if (hasAccess && inAuth && !isGuestAuthEntry) {
      router.replace(ROUTES.appHome as never);
    }

    if (!hasAccess && inApp) {
      router.replace(ROUTES.authSignIn as never);
    }
  }, [user, isGuestMode, loading, segments, router]);

  const fontsReady = fontsLoaded || Boolean(fontsError);
  const appReady = fontsReady && !loading;

  // The launch overlay has an 8s hard ceiling. If auth/fonts are still
  // pending when it finishes, Stack used to stay unmounted → blank white
  // screen. Keep a dark placeholder (and mount Stack once fonts are ready)
  // so the UI never goes empty.
  useEffect(() => {
    if (launchFinished) hideNativeSplash();
  }, [launchFinished, hideNativeSplash]);

  return (
    <>
      {fontsReady && (appReady || launchFinished) && (
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: COLORS.bg },
          }}
        />
      )}
      {launchFinished && !appReady && (
        <View style={[StyleSheet.absoluteFill, styles.bootPlaceholder]}>
          <ActivityIndicator color={COLORS.purple} size="large" />
        </View>
      )}
      {!launchFinished && (
        <AnimatedLaunchScreen
          ready={appReady}
          fontsReady={fontsReady}
          onReady={hideNativeSplash}
          onFinish={finishLaunch}
        />
      )}
    </>
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
  root: { flex: 1, backgroundColor: COLORS.bg },
  bootPlaceholder: {
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
