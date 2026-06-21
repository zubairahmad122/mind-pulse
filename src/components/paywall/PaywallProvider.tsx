import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { PaywallContext } from '@/hooks/usePaywall';
import { PaywallModal } from './PaywallModal';

/**
 * Mounted once at the app root. Owns the paywall's visibility/featureId
 * state and renders the single global PaywallModal instance.
 */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [featureId, setFeatureId] = useState<string | null>(null);

  const showPaywall = useCallback((id: string) => {
    setFeatureId(id);
    setIsVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setIsVisible(false);
  }, []);

  const value = useMemo(
    () => ({ isVisible, featureId, showPaywall, hidePaywall }),
    [isVisible, featureId, showPaywall, hidePaywall],
  );

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallModal visible={isVisible} featureId={featureId ?? undefined} onClose={hidePaywall} />
    </PaywallContext.Provider>
  );
}
