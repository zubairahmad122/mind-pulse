import { useEffect, useRef } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { TAB_SWITCH_INTERSTITIAL_AD_UNIT_ID } from './adUnits';
import { suppressNextAppOpen } from './useAppOpenAd';
import { interstitialCooldownOver, markInterstitialShown } from './useSessionCompleteMonetization';

/** Show on every Nth switch between bottom tabs, never on each tap. */
const SWITCHES_PER_AD = 3;
/** Let a fresh launch settle before any tab-switch ad. */
const MIN_MS_AFTER_LAUNCH = 60 * 1000;
const RETRY_DELAY_MS = 30000;

const launchedAt = Date.now();
let ad: InterstitialAd | null = null;
let adLoaded = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let switchesSinceAd = 0;

function loadAd() {
  clearTimeout(retryTimer);
  adLoaded = false;
  ad?.load();
}

function ensureAd() {
  if (ad) return;
  ad = InterstitialAd.createForAdRequest(TAB_SWITCH_INTERSTITIAL_AD_UNIT_ID);
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
}

/**
 * Free-tier interstitial on switching between bottom tabs: every
 * SWITCHES_PER_AD-th switch, not in the first minute after launch, and only
 * once the shared interstitial cooldown (also used by session-complete ads)
 * has passed — so a user never sees two interstitials back to back.
 *
 * `tabPath` is the current bottom-tab path, or null when not on a tab.
 */
export function useTabSwitchInterstitial(enabled: boolean, tabPath: string | null): void {
  const previousTab = useRef<string | null>(null);

  useEffect(() => {
    if (enabled) ensureAd();
  }, [enabled]);

  useEffect(() => {
    const from = previousTab.current;
    previousTab.current = tabPath;
    if (!enabled || !tabPath || !from || from === tabPath) return;

    switchesSinceAd += 1;
    if (switchesSinceAd < SWITCHES_PER_AD) return;
    if (Date.now() - launchedAt < MIN_MS_AFTER_LAUNCH) return;
    if (!ad || !adLoaded) return;

    const current = ad;
    void (async () => {
      if (!(await interstitialCooldownOver())) return;
      switchesSinceAd = 0;
      adLoaded = false;
      suppressNextAppOpen();
      try {
        await current.show();
        await markInterstitialShown();
      } catch {
        loadAd();
      }
    })();
  }, [enabled, tabPath]);
}
