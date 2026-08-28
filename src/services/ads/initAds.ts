import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';

let initialized = false;

/**
 * Initializes the Google Mobile Ads SDK exactly once per app lifetime.
 * Call from the root layout, alongside RevenueCat's configurePurchases() —
 * safe to call unconditionally; it never throws.
 *
 * Runs Google's UMP consent flow first (required by the EU User Consent
 * Policy for EEA/UK/Swiss users — `gatherConsent()` is a no-op everywhere
 * else, including the app's current Pakistan-based user base) before
 * initializing ads, and declares this as a non-child-directed app with a
 * PG max ad content rating, per Google's AdMob integration guidance.
 */
export function initAds(): void {
  if (initialized) return;
  initialized = true;

  (async () => {
    try {
      await AdsConsent.gatherConsent();
    } catch (err) {
      console.warn('[Ads] consent gathering failed', err);
    }

    try {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
    } catch (err) {
      console.warn('[Ads] setRequestConfiguration failed', err);
    }

    try {
      await mobileAds().initialize();
    } catch (err) {
      console.warn('[Ads] initialize failed', err);
    }
  })();
}
