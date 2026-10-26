import { createContext, useContext } from 'react';

export type ShowPaywallOptions = {
  /**
   * When set, the paywall also offers "Watch an ad to try it once" — called
   * after the user earns the reward, to grant that one use (e.g. start the
   * locked session). Omit it where a one-off unlock makes no sense.
   */
  onRewardedUnlock?: () => void;
};

export type PaywallContextType = {
  isVisible: boolean;
  featureId: string | null;
  showPaywall: (featureId: string, options?: ShowPaywallOptions) => void;
  hidePaywall: () => void;
};

export const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

/**
 * Global paywall trigger. `showPaywall(featureId)` opens the single
 * app-wide PaywallModal mounted by PaywallProvider at the root.
 */
export function usePaywall(): PaywallContextType {
  const ctx = useContext(PaywallContext);
  if (!ctx) {
    throw new Error('usePaywall must be used within a PaywallProvider');
  }
  return ctx;
}
