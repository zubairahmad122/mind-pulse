import mobileAds from 'react-native-google-mobile-ads';

let initialized = false;

/**
 * Initializes the Google Mobile Ads SDK exactly once per app lifetime.
 * Call from the root layout, alongside RevenueCat's configurePurchases() —
 * safe to call unconditionally; it never throws.
 */
export function initAds(): void {
  if (initialized) return;
  initialized = true;
  mobileAds()
    .initialize()
    .catch(err => {
      console.warn('[Ads] initialize failed', err);
    });
}
