import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedBackground from '@/components/AnimatedBackground';
import { BACKGROUND, SPACING } from '@/constants/designSystem';
import { PillarProvider, type PillarKey } from '@/context/PillarContext';
import { useTabBarSpace } from '@/components/layout/GlassTabBar';
import { BannerAdSlot } from '@/components/ads/BannerAdSlot';
import { useAds } from '@/hooks/useAds';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Safe-area edges for the shell. Tab screens: top only. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /**
   * Stack / modal screens: pad above the system nav bar.
   * Do not use on tab screens (they already sit above the tab bar).
   */
  safeBottom?: boolean;
  /**
   * Pillar accent for this screen's icons/highlights/progress fill.
   * Background is global and identical on every screen — this only drives
   * per-screen accent color via `PillarProvider`.
   */
  pillar?: PillarKey;
  /**
   * Optional fixed footer (e.g. a primary CTA) — rendered below the scroll
   * area, outside it, so it never scrolls away and the user never has to
   * scroll to reach it. Only meaningful when `scroll` is true.
   */
  footer?: React.ReactNode;
  /**
   * Show the banner ad docked below the scroll area for free users. Unlike
   * passing `<BannerAdSlot />` as `footer` (always truthy, so the footer's
   * padding showed as an empty band even for Pro users or before an ad
   * loaded), the footer space here is only reserved once an ad has loaded.
   */
  bannerAd?: boolean;
  /**
   * Optional fixed header — rendered above the scroll area, outside it, so
   * body content always starts below it and can never scroll underneath or
   * overlap it. Mirrors `footer`. Prefer this over `stickyHeaderIndices` for
   * an always-visible header with an opaque/blurred background: a sticky
   * child *inside* the ScrollView is clipped to that inner (padded) content
   * box, so it can't bleed to the true screen edges no matter what margin
   * tricks are applied to it — a real structural gap that showed up as the
   * app's own background gradient peeking in on both sides of the header.
   * Docking it here, outside the ScrollView entirely, sidesteps that clipping
   * and reaches the true edges for free.
   */
  header?: React.ReactNode;
  /**
   * Set false to freeze the scroll position — e.g. while an interactive game
   * is running, so dragging near a moving target can't scroll the playfield
   * out from under the player's finger. Only meaningful when `scroll` is true.
   */
  scrollEnabled?: boolean;
  /**
   * Indices (within `children`) of top-level items to pin at the top of the
   * scroll area — e.g. `[0]` to keep the screen's own `ScreenHeader` visible
   * while the rest of the content scrolls beneath it. Passed straight
   * through to the underlying `ScrollView`. Only meaningful when `scroll` is
   * true.
   */
  stickyHeaderIndices?: number[];
};

export function ScreenShell({
  children,
  scroll = true,
  contentStyle,
  edges = ['top'],
  safeBottom = false,
  pillar = 'mind',
  ambient,
  footer,
  bannerAd = false,
  header,
  scrollEnabled = true,
  stickyHeaderIndices,
}: Props & { ambient?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  // On tab screens this is the floating glass bar's reserved space; 0 elsewhere.
  const tabBarSpace = useTabBarSpace();
  const showAds = useAds();
  const [adLoaded, setAdLoaded] = useState(false);
  const adActive = bannerAd && showAds;
  const adVisible = adActive && adLoaded;
  const hasFooter = !!footer || adVisible;

  const bottomClearance =
    SPACING.screenBottom + tabBarSpace + (safeBottom ? Math.max(insets.bottom, 8) : 0);

  const safeAreaEdges: Props['edges'] = safeBottom
    ? edges.includes('bottom')
      ? edges
      : [...edges, 'bottom']
    : edges;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: hasFooter ? SPACING.section : bottomClearance },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
      stickyHeaderIndices={stickyHeaderIndices}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.scrollContent,
        { paddingBottom: bottomClearance },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={safeAreaEdges}>
      {/* Global background — identical on every screen (spec section 2):
          base fill + overlay gradient + top-left radial glow. */}
      <AnimatedBackground />
      <PillarProvider pillar={pillar}>
        {/* Fixed ambient overlay (glow, beams, particles) — rendered outside
            ScrollView, but inside PillarProvider so it picks up this
            screen's accent instead of the context default. */}
        {ambient}
        <View style={styles.flex}>
          {header}
          {content}
          {/* One mount point for the banner, so it isn't remounted (and the
              loaded ad thrown away) when it becomes visible. Until an ad
              loads, the wrapper is absolute + transparent: the banner can
              still request an ad but takes no layout space. */}
          {(footer || adActive) && (
            <View
              style={
                hasFooter
                  ? [styles.footer, { paddingBottom: tabBarSpace + 12 }]
                  : styles.adPending
              }
            >
              {footer}
              {adActive && <BannerAdSlot onLoadedChange={setAdLoaded} />}
            </View>
          )}
        </View>
      </PillarProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND.base,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screenH,
  },
  footer: {
    paddingHorizontal: SPACING.screenH,
    paddingTop: 12,
    // No background fill — lets the shared AnimatedBackground gradient
    // show through behind it, same as everywhere else on the screen,
    // instead of a flat block that reads as a visual glitch.
  },
  adPending: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
});
