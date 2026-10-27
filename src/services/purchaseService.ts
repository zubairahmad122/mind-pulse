import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';
import { PRO_ENTITLEMENT_ID } from '@/constants/entitlements';
import { trackPurchase } from './analytics';
import { suppressNextAppOpen } from './ads/useAppOpenAd';

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

// One store operation at a time, app-wide. A double tap, or the paywall
// sheet and the Premium screen both reacting, would otherwise start a second
// Google Play / App Store purchase flow (or a restore mid-purchase); callers
// that arrive while one is running get that same in-flight result instead.
let inFlight: Promise<PurchaseResult> | null = null;

function exclusive(run: () => Promise<PurchaseResult>): Promise<PurchaseResult> {
  if (inFlight) return inFlight;
  suppressNextAppOpen(); // the Play sheet backgrounds the app
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Purchases a package. User cancellation resolves as `{ success: false }`
 * with no `error` set so callers don't surface it as a failure.
 */
export function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  return exclusive(() => runPurchase(pkg));
}

async function runPurchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    trackPurchase(pkg.product.identifier);
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
export function restorePurchases(): Promise<PurchaseResult> {
  return exclusive(runRestore);
}

async function runRestore(): Promise<PurchaseResult> {
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
 * Whether `customerInfo` carries the active "pro" entitlement. RevenueCat's
 * `restorePurchases()` resolves successfully even when the account has
 * nothing to restore — callers must check this before treating a restore as
 * having actually unlocked anything.
 */
export function hasActiveProEntitlement(customerInfo: CustomerInfo | null | undefined): boolean {
  return Boolean(customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]);
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

const PERIOD_UNIT_LABEL: Record<string, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

/**
 * "7-day free trial" when this package starts with a free phase the user is
 * eligible for, else null. Google Play only puts the trial offer in
 * `defaultOption` for eligible (never-subscribed) users, and
 * `purchasePackage()` buys that same default option — so the label never
 * promises a trial the purchase won't apply.
 */
export function freeTrialLabel(pkg: PurchasesPackage): string | null {
  const period = pkg.product.defaultOption?.freePhase?.billingPeriod;
  if (period) {
    const unit = PERIOD_UNIT_LABEL[period.unit];
    return unit ? `${period.value}-${unit} free trial` : 'Free trial';
  }
  const intro = pkg.product.introPrice;
  if (intro && intro.price === 0) {
    const unit = PERIOD_UNIT_LABEL[intro.periodUnit];
    return unit ? `${intro.periodNumberOfUnits}-${unit} free trial` : 'Free trial';
  }
  return null;
}
