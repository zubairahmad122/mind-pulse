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
        // Dev test device only — this exact device ID always gets Google's
        // guaranteed-fill test ads instead of real inventory, regardless of
        // build type. Harmless for real users (their device ID never
        // matches); lets us verify ad rendering without tripping AdMob's
        // invalid-traffic throttling from repeated real-ad requests during
        // testing on this one physical phone.
        testDeviceIdentifiers: ['9DE3D1D683E4DF5C5E53EF66C9B68326'],
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
