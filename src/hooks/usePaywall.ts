import { createContext, useContext } from 'react';

export type PaywallContextType = {
  isVisible: boolean;
  featureId: string | null;
  showPaywall: (featureId: string) => void;
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
