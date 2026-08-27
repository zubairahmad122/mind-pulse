import { useSubscription } from '@/context/SubscriptionContext';

/**
 * Whether ad placements should render. Pro users never see ads.
 * Abstract by design — no ad SDK is wired up yet, this only gates placeholders.
 */
export function useAds(): boolean {
  const { isPremium } = useSubscription();
  return !isPremium;
}
