import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import "./global.css";
import { COLORS, ROUTES } from '@/constants';
import { PaywallProvider } from '@/components/paywall/PaywallProvider';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { RelaxProvider } from '@/context/RelaxContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';

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
      router.replace(ROUTES.welcome);
    }
  }, [user, isGuestMode, loading, segments, router]);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

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
});
