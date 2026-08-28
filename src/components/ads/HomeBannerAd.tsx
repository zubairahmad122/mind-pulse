import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '@/hooks/useAds';
import { BANNER_AD_UNIT_ID } from '@/services/ads/adUnits';

/**
 * Home-screen-only banner. Renders nothing for Pro users (useAds() ==
 * !isPremium) — the single placement point for this ad type, per the app's
 * "Home screen only" banner policy.
 */
export function HomeBannerAd() {
  const showAds = useAds();
  if (!showAds) return null;

  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <BannerAd unitId={BANNER_AD_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
