import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { useSubscription } from '@/context/SubscriptionContext';
import { INTERSTITIAL_AD_UNIT_ID } from './adUnits';

const LAST_SHOWN_KEY = '@mindpulse/ads/interstitial-last-shown';
const MIN_INTERVAL_MS = 3 * 60 * 1000;

// Module-level, not React state — resets on cold start, shared across every
// screen that uses this hook, so "the first session since launch" means the
// first one across the whole app, not per-screen.
let sessionsCompletedSinceLaunch = 0;

/**
 * Free-tier interstitial, gated to only ever fire from a "session complete"
 * call site (Results screens) — never during gameplay, never at app launch,
 * and never more than once per MIN_INTERVAL_MS. Premium users never load or
 * see an ad (the hook destroys the ad instance by passing `null`).
 *
 * Usage: call `maybeShow()` once, in a Results screen's mount effect, after
 * a session has actually finished. Safe to call more than once (e.g. React
 * re-running the effect as the ad finishes loading) — the session is only
 * counted once, via `countedRef`.
 */
export function useSessionCompleteInterstitial() {
  const { isPremium } = useSubscription();
  const { isLoaded, load, show } = useInterstitialAd(isPremium ? null : INTERSTITIAL_AD_UNIT_ID);
  const countedRef = useRef(false);
  const sessionIndexRef = useRef(0);

  useEffect(() => {
    if (!isPremium) load();
  }, [isPremium, load]);

  const maybeShow = useCallback(async () => {
    if (!countedRef.current) {
      countedRef.current = true;
      sessionsCompletedSinceLaunch += 1;
      sessionIndexRef.current = sessionsCompletedSinceLaunch;
    }

    if (isPremium) return;
    if (sessionIndexRef.current <= 1) return; // never immediately after launch
    if (!isLoaded) return;

    const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_KEY);
    const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
    if (Date.now() - lastShown < MIN_INTERVAL_MS) return;

    show();
    await AsyncStorage.setItem(LAST_SHOWN_KEY, String(Date.now())).catch(() => {});
  }, [isPremium, isLoaded, show]);

  return { maybeShow };
}
