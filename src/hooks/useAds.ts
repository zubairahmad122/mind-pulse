import { useSubscription } from '@/context/SubscriptionContext';

/**
 * Whether ad placements should render. Pro users never see ads.
 */
export function useAds(): boolean {
  const { isPremium } = useSubscription();
  return !isPremium;
}
