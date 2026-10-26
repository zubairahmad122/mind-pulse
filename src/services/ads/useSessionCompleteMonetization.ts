import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { useSubscription } from '@/context/SubscriptionContext';
import { usePaywall } from '@/hooks/usePaywall';
import { INTERSTITIAL_AD_UNIT_ID } from './adUnits';

const LAST_SHOWN_KEY = '@mindpulse/ads/interstitial-last-shown';
const MIN_INTERVAL_MS = 3 * 60 * 1000;
const RETRY_DELAY_MS = 30000;

const FIRST_SESSION_PAYWALL_KEY = '@mindpulse/paywall/first-session-shown';
/** Paywall feature id — PaywallModal has dedicated copy for it. */
export const FIRST_SESSION_PAYWALL_ID = 'first_session_complete';
/** Let the result land before the sheet slides up over it. */
const FIRST_SESSION_PAYWALL_DELAY_MS = 1500;

// Module-level, not React state — resets on cold start, shared across every
// screen that uses this hook, so "the first session since launch" means the
// first one across the whole app, not per-screen.
let sessionsCompletedSinceLaunch = 0;

// One app-wide interstitial, preloaded ahead of time and reloaded after every
// close. Previously each Results screen created its own ad on mount, so it was
// never ready at the moment the screen appeared — it popped up seconds later
// over the results (bad UX, and AdMob flags unexpected interstitials), and a
// screen that stays mounted across runs (Schulte's "Next") never got a fresh one.
let ad: InterstitialAd | null = null;
let adLoaded = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function loadAd() {
  clearTimeout(retryTimer);
  adLoaded = false;
  ad?.load();
}

/** Starts preloading the shared interstitial. Idempotent; never throws. */
export function preloadSessionCompleteInterstitial(): void {
  if (ad) return;
  try {
    ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
    ad.addAdEventListener(AdEventType.LOADED, () => {
      adLoaded = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, loadAd);
    ad.addAdEventListener(AdEventType.ERROR, () => {
      adLoaded = false;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(loadAd, RETRY_DELAY_MS);
    });
    loadAd();
  } catch (err) {
    console.warn('[Ads] interstitial preload failed', err);
  }
}

/**
 * What a free user sees when a session finishes, called only from "session
 * complete" call sites (Results screens) — never during gameplay.
 *
 * 1. The first session a free user ever completes → the Pro paywall, once
 *    per install. Right after a finished session is the highest-intent
 *    moment to offer Pro; no ad is shown alongside it.
 * 2. Otherwise → an interstitial: never after the first session since
 *    launch, never more than once per MIN_INTERVAL_MS, and only one that is
 *    already loaded at that moment — never one that finishes loading later.
 *
 * Premium users get neither. Usage: call `maybeShow()` once per finished
 * session, as the Results screen appears; each call counts a session.
 */
export function useSessionCompleteMonetization() {
  const { isPremium, loading } = useSubscription();
  const { showPaywall } = usePaywall();

  useEffect(() => {
    if (!isPremium) preloadSessionCompleteInterstitial();
  }, [isPremium]);

  const maybeShow = useCallback(async () => {
    sessionsCompletedSinceLaunch += 1;

    if (isPremium || loading) return;

    const firstSessionPaywallShown = await AsyncStorage.getItem(FIRST_SESSION_PAYWALL_KEY).catch(
      () => '1', // storage unreadable → don't risk showing it every session
    );
    if (!firstSessionPaywallShown) {
      await AsyncStorage.setItem(FIRST_SESSION_PAYWALL_KEY, '1').catch(() => {});
      setTimeout(() => showPaywall(FIRST_SESSION_PAYWALL_ID), FIRST_SESSION_PAYWALL_DELAY_MS);
      return;
    }

    if (sessionsCompletedSinceLaunch <= 1) return; // never immediately after launch
    if (!ad || !adLoaded) return;

    const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_KEY).catch(() => null);
    const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
    if (Date.now() - lastShown < MIN_INTERVAL_MS) return;

    adLoaded = false;
    try {
      await ad.show();
    } catch {
      loadAd();
      return;
    }
    await AsyncStorage.setItem(LAST_SHOWN_KEY, String(Date.now())).catch(() => {});
  }, [isPremium, loading, showPaywall]);

  return { maybeShow };
}
