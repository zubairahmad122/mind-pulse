import { useEffect } from 'react';
import { useRewardedAd } from 'react-native-google-mobile-ads';
import { useSubscription } from '@/context/SubscriptionContext';
import { REWARDED_AD_UNIT_ID } from './adUnits';

/**
 * Lets a free user watch a rewarded ad to temporarily unlock one locked
 * session/level. Generic by design — the caller decides what "unlock"
 * means (e.g. navigate into a level-gated game screen) by reacting to
 * `isEarnedReward`. Premium users never load or see this ad.
 */
export function useRewardedUnlock() {
  const { isPremium } = useSubscription();
  const { isLoaded, isEarnedReward, load, show } = useRewardedAd(
    isPremium ? null : REWARDED_AD_UNIT_ID,
  );

  useEffect(() => {
    if (!isPremium) load();
  }, [isPremium, load]);

  return { isLoaded, isEarnedReward, show };
}
