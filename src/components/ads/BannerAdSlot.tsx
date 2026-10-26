import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '@/hooks/useAds';
import { BANNER_AD_UNIT_ID } from '@/services/ads/adUnits';
import { FONTS, SPACING } from '@/constants/designSystem';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';

/** Google's own guidance: don't reload a banner more than once every 30s. */
const RETRY_DELAY_MS = 30000;

/**
 * The one banner-ad component — enable it on a main tab screen (Home, Sleep,
 * Relax, Eye, Mind, Profile) via `ScreenShell`'s `bannerAd` prop, which
 * only reserves footer space once `onLoadedChange(true)` fires. Renders
 * nothing for Pro users (useAds() == !isPremium).
 *
 * Deliberately NOT built from `GlassCard` — its border, topSheen highlight,
 * and 18px padding read as "another content card" rather than a
 * standardized monetization slot. This is intentionally leaner: a thin
 * border, near-invisible fill, and a small muted label, just enough to
 * frame the ad without competing with real UI. The ad itself is a native
 * Android WebView, so its own corners stay square no matter what wraps it
 * (overflow: hidden on a parent doesn't clip it) — no point styling for
 * rounded ad corners that will never actually render rounded.
 *
 * The frame (border/background/label) only renders once an ad has actually
 * loaded, collapsing to zero visible height otherwise instead of showing an
 * empty bordered "Advertisement" box. On a failed load, `BannerAd` itself
 * does NOT auto-retry — this remounts it (via `key`) after a 30s delay to
 * try again, same as a fresh request, until it succeeds.
 *
 * Uses an anchored adaptive banner (full width, height picked by the SDK)
 * rather than the fixed 320x50 — Google's recommended size, and it earns
 * more per impression. The label doubles as a "Remove ads" link to Pro.
 */
export function BannerAdSlot({ onLoadedChange }: { onLoadedChange?: (loaded: boolean) => void }) {
  const showAds = useAds();
  const router = useRouter();
  // ScreenShell's footer is inset by SPACING.screenH on each side, plus the
  // slot's 1px border — size the adaptive banner to fit inside it.
  const { width: windowWidth } = useWindowDimensions();
  const adWidth = Math.floor(windowWidth - SPACING.screenH * 2 - 2);
  const [loaded, setLoadedState] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  const setLoaded = (next: boolean) => {
    setLoadedState(next);
    onLoadedChange?.(next);
  };

  if (!showAds) return null;

  const handleFailedToLoad = () => {
    setLoaded(false);
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => setRetryKey(k => k + 1), RETRY_DELAY_MS);
  };

  return (
    <View style={[styles.slot, loaded && styles.slotLoaded]}>
      {loaded && (
        <Pressable
          onPress={() => router.push(ROUTES.appPremium as never)}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Remove ads with Well Mode Pro"
        >
          <Text style={styles.label}>
            Advertisement · <Text style={styles.removeAds}>Remove ads</Text>
          </Text>
        </Pressable>
      )}
      <View style={[styles.adWrap, loaded && styles.adWrapLoaded]}>
        <BannerAd
          key={retryKey}
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          width={adWidth}
          onAdLoaded={() => setLoaded(true)}
          onAdFailedToLoad={handleFailedToLoad}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    borderRadius: 10,
  },
  slotLoaded: {
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontFamily: FONTS.body,
    fontSize: 8.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
    opacity: 0.7,
    marginBottom: 4,
  },
  removeAds: {
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
  adWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  adWrapLoaded: {
    minHeight: 50,
  },
});
