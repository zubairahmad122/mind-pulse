import { COLORS, ROUTES } from "@/constants";
import OnboardingScreen from "@/screens/auth/OnboardingScreen";
import { hasCompletedOnboarding } from "@/services/onboardingPersistence";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    hasCompletedOnboarding().then((done) => {
      if (!active) return;
      if (done) {
        router.replace(ROUTES.authSignIn);
      } else {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={COLORS.purple} size="large" />
      </View>
    );
  }

  return <OnboardingScreen />;
}
