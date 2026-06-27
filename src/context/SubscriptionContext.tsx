import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Purchases, { CustomerInfo, CustomerInfoUpdateListener } from 'react-native-purchases';
import { reportError } from '@/utils/errorLogger';

const PRO_ENTITLEMENT_ID = 'pro';
const CACHE_KEY = '@mindpulse/subscription-cache';

interface SubscriptionCache {
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
}

interface SubscriptionContextType {
  isPremium: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function deriveIsPremium(customerInfo: CustomerInfo | null): boolean {
  return Boolean(customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef<CustomerInfoUpdateListener | null>(null);

  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    const premium = deriveIsPremium(info);
    setCustomerInfo(info);
    setIsPremium(premium);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ isPremium: premium, customerInfo: info })).catch(
      () => {},
    );
  }, []);

  const refreshSubscription = useCallback(async () => {
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
  }, [applyCustomerInfo]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Load cache instantly so the UI never waits on a network call.
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && !cancelled) {
          const parsed: SubscriptionCache = JSON.parse(cached);
          setCustomerInfo(parsed.customerInfo);
          setIsPremium(parsed.isPremium);
        }
      } catch (error) {
        reportError(error, { tag: 'SubscriptionContext', action: 'load-cache' });
        // ignore corrupt cache
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      // 2. Fetch the latest state from RevenueCat in the background.
      try {
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) {
          applyCustomerInfo(info);
        }
      } catch (err) {
        console.warn('[Subscription] getCustomerInfo failed', err);
      }
    })();

    // 3. Live updates (e.g. purchase, renewal, refund happening elsewhere).
    const listener: CustomerInfoUpdateListener = info => {
      if (!cancelled) {
        applyCustomerInfo(info);
      }
    };
    listenerRef.current = listener;
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [applyCustomerInfo]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, loading, customerInfo, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
}
