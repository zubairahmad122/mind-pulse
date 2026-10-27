import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { AdEventType, AppOpenAd } from 'react-native-google-mobile-ads';
import { getNativeAlarmModule } from '@/services/nativeAlarm';
import { APP_OPEN_AD_UNIT_ID } from './adUnits';

/** Only users who actually left the app — not permission dialogs or quick app switches. */
const MIN_BACKGROUND_MS = 30 * 1000;
const MIN_INTERVAL_MS = 60 * 60 * 1000;
/** Google: a loaded App Open ad expires after 4 hours. */
const AD_TTL_MS = 4 * 60 * 60 * 1000;
const RETRY_DELAY_MS = 30000;

let ad: AppOpenAd | null = null;
let loadedAt = 0;
let lastShownAt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
// Set right before we open something full-screen ourselves (another ad, a
// Play purchase sheet) so returning from it doesn't count as "came back".
let suppressNextReturn = false;

/** Call before showing an interstitial/rewarded ad or starting a purchase. */
export function suppressNextAppOpen(): void {
  suppressNextReturn = true;
}

function loadAd() {
  clearTimeout(retryTimer);
  loadedAt = 0;
  ad?.load();
}

function ensureAd(unitId: string) {
  if (ad) return;
  ad = AppOpenAd.createForAdRequest(unitId);
  ad.addAdEventListener(AdEventType.LOADED, () => {
    loadedAt = Date.now();
  });
  ad.addAdEventListener(AdEventType.CLOSED, loadAd);
  ad.addAdEventListener(AdEventType.ERROR, () => {
    loadedAt = 0;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(loadAd, RETRY_DELAY_MS);
  });
  loadAd();
}

async function isAlarmRinging(): Promise<boolean> {
  try {
    return Boolean(await getNativeAlarmModule()?.isAlarmRinging?.());
  } catch {
    return false;
  }
}

/**
 * App Open ad, shown when a free user returns to the app after being away
 * for at least MIN_BACKGROUND_MS — never on cold start, at most once per
 * MIN_INTERVAL_MS, only while a main tab screen is showing (never over a
 * game, session or purchase), and never while the wake alarm is ringing.
 *
 * Disabled entirely when no App Open ad unit is configured (see adUnits).
 */
export function useAppOpenAd(enabled: boolean, isOnMainTab: () => boolean): void {
  const backgroundAt = useRef(0);
  const isOnMainTabRef = useRef(isOnMainTab);
  useEffect(() => {
    isOnMainTabRef.current = isOnMainTab;
  }, [isOnMainTab]);

  useEffect(() => {
    const unitId = APP_OPEN_AD_UNIT_ID;
    if (!enabled || !unitId) return;
    ensureAd(unitId);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
        return;
      }
      if (state !== 'active' || !backgroundAt.current) return;

      const awayMs = Date.now() - backgroundAt.current;
      backgroundAt.current = 0;
      if (suppressNextReturn) {
        suppressNextReturn = false;
        return;
      }
      if (awayMs < MIN_BACKGROUND_MS) return;
      if (Date.now() - lastShownAt < MIN_INTERVAL_MS) return;
      if (!ad || !loadedAt) return;
      if (Date.now() - loadedAt > AD_TTL_MS) {
        loadAd();
        return;
      }
      if (!isOnMainTabRef.current()) return;

      void (async () => {
        if (await isAlarmRinging()) return;
        const current = ad;
        if (!current) return;
        loadedAt = 0;
        lastShownAt = Date.now();
        suppressNextReturn = true;
        try {
          await current.show();
        } catch {
          suppressNextReturn = false;
          loadAd();
        }
      })();
    });
    return () => sub.remove();
  }, [enabled]);
}
