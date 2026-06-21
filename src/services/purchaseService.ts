import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

export type PurchaseResult = {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
};

/**
 * Fetches the current offering's packages. Never throws — returns an empty
 * array if there is no current offering or the SDK call fails.
 */
export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

/**
 * Purchases a package. User cancellation resolves as `{ success: false }`
 * with no `error` set so callers don't surface it as a failure.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (err) {
    const purchasesError = err as PurchasesError;
    if (purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false };
    }
    return {
      success: false,
      error: purchasesError?.message ?? 'Purchase failed. Please try again.',
    };
  }
}

/**
 * Restores prior purchases for the current RevenueCat user.
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (err) {
    const purchasesError = err as PurchasesError;
    return {
      success: false,
      error: purchasesError?.message ?? 'Restore failed. Please try again.',
    };
  }
}

/**
 * Fetches the latest CustomerInfo. Returns `null` instead of throwing on failure.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}
