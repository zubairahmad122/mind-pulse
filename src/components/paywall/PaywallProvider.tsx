import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { PaywallContext, type ShowPaywallOptions } from '@/hooks/usePaywall';
import { trackPaywallShown } from '@/services/analytics';
import { preloadSessionCompleteInterstitial } from '@/services/ads/useSessionCompleteMonetization';
import { useAppOpenAd } from '@/services/ads/useAppOpenAd';
import { useTabSwitchInterstitial } from '@/services/ads/useTabSwitchInterstitial';
import { PaywallModal } from './PaywallModal';

/** The bottom-tab screens (route groups are stripped from usePathname). */
const MAIN_TAB_PATHS = new Set([
  '/home', '/sleep', '/relax', '/challenges', '/report',
  '/recovery', '/eye-relax', '/streaks', '/profile',
]);

/**
 * Mounted once at the app root. Owns the paywall's visibility/featureId
 * state and renders the single global PaywallModal instance.
 */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const { isPremium, loading } = useSubscription();
  const [isVisible, setIsVisible] = useState(false);
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [canTryWithAd, setCanTryWithAd] = useState(false);
  const rewardedUnlockRef = useRef<(() => void) | undefined>(undefined);

  // Warm the shared session-complete interstitial as soon as we know the
  // user is on the free tier, so it's ready by the first Results screen.
  useEffect(() => {
    if (!loading && !isPremium) preloadSessionCompleteInterstitial();
  }, [loading, isPremium]);

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const isOnMainTab = useCallback(() => MAIN_TAB_PATHS.has(pathnameRef.current), []);
  const adsEnabled = !loading && !isPremium;
  useAppOpenAd(adsEnabled, isOnMainTab);
  useTabSwitchInterstitial(adsEnabled, MAIN_TAB_PATHS.has(pathname) ? pathname : null);

  const showPaywall = useCallback((id: string, options?: ShowPaywallOptions) => {
    rewardedUnlockRef.current = options?.onRewardedUnlock;
    setCanTryWithAd(!!options?.onRewardedUnlock);
    setFeatureId(id);
    setIsVisible(true);
    trackPaywallShown(id);
  }, []);

  const hidePaywall = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleRewardedUnlock = useCallback(() => {
    setIsVisible(false);
    rewardedUnlockRef.current?.();
    rewardedUnlockRef.current = undefined;
  }, []);

  const value = useMemo(
    () => ({ isVisible, featureId, showPaywall, hidePaywall }),
    [isVisible, featureId, showPaywall, hidePaywall],
  );

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallModal
        visible={isVisible}
        featureId={featureId ?? undefined}
        onClose={hidePaywall}
        onRewardedUnlock={canTryWithAd ? handleRewardedUnlock : undefined}
      />
    </PaywallContext.Provider>
  );
}
