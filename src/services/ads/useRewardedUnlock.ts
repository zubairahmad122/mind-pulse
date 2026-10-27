import { useCallback, useEffect, useRef } from 'react';
import { useRewardedAd } from 'react-native-google-mobile-ads';
import { useSubscription } from '@/context/SubscriptionContext';
import { REWARDED_AD_UNIT_ID } from './adUnits';
import { suppressNextAppOpen } from './useAppOpenAd';

/** Same back-off BannerAdSlot uses — don't hammer AdMob after a no-fill. */
const RETRY_DELAY_MS = 30000;

/**
 * Lets a free user watch a rewarded ad to temporarily unlock one locked
 * session/level. Generic by design — the caller decides what "unlock"
 * means (e.g. navigate into a level-gated game screen) by reacting to
 * `isEarnedReward`. Premium users never load or see this ad.
 *
 * A rewarded ad can only be shown once per load, and the SDK hook doesn't
 * reload on its own — so this reloads after every close (which also resets
 * `isEarnedReward` to false, ready for the next unlock) and retries after a
 * failed load. Without that, the "Watch Ad" option vanished after one use
 * until the screen remounted.
 */
export function useRewardedUnlock() {
  const { isPremium } = useSubscription();
  const { isLoaded, isClosed, isEarnedReward, error, load, show: showAd } = useRewardedAd(
    isPremium ? null : REWARDED_AD_UNIT_ID,
  );
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!isPremium) load();
  }, [isPremium, load]);

  useEffect(() => {
    if (!isPremium && isClosed) load();
  }, [isPremium, isClosed, load]);

  useEffect(() => {
    if (isPremium || !error) return;
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(load, RETRY_DELAY_MS);
    return () => clearTimeout(retryTimer.current);
  }, [isPremium, error, load]);

  const show = useCallback(() => {
    suppressNextAppOpen();
    showAd();
  }, [showAd]);

  return { isLoaded, isEarnedReward, show };
}
