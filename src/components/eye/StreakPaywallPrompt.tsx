import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SoftPaywallModal } from '@/components/ui/SoftPaywallModal';
import { ROUTES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useWellnessStore } from '@/stores/useWellnessStore';

const STREAK_PAYWALL_KEY = '@mindpulse/streak-paywall-shown';

/** The one-time nudge after a 3-day streak, shown on the Eyes tab. */
export function StreakPaywallPrompt() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const streak = useWellnessStore(s => s.streak);
  const [visible, setVisible] = useState(false);
  const uid = user?.uid;

  useEffect(() => {
    if (isPremium || !uid || streak < 3) return;
    let cancelled = false;
    void AsyncStorage.getItem(`${STREAK_PAYWALL_KEY}:${uid}`).then(shown => {
      if (!cancelled && !shown) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isPremium, uid, streak]);

  const dismiss = () => {
    setVisible(false);
    if (uid) void AsyncStorage.setItem(`${STREAK_PAYWALL_KEY}:${uid}`, '1');
  };

  return (
    <SoftPaywallModal
      visible={!isPremium && visible}
      emoji="🔥"
      title="You're building momentum"
      subtitle="3 days in a row — unlock the full toolkit to keep your progress going."
      onUpgrade={() => {
        dismiss();
        router.push(ROUTES.appPremium as never);
      }}
      onDismiss={dismiss}
    />
  );
}
