import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSubscription } from '@/context/SubscriptionContext';
import { getOfferings, purchasePackage, restorePurchases } from '@/services/purchaseService';

function periodLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return '/year';
    case PACKAGE_TYPE.SIX_MONTH:
      return '/6 months';
    case PACKAGE_TYPE.THREE_MONTH:
      return '/3 months';
    case PACKAGE_TYPE.TWO_MONTH:
      return '/2 months';
    case PACKAGE_TYPE.MONTHLY:
      return '/month';
    case PACKAGE_TYPE.WEEKLY:
      return '/week';
    default:
      return '';
  }
}

function planLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return 'Yearly';
    case PACKAGE_TYPE.SIX_MONTH:
      return '6 Months';
    case PACKAGE_TYPE.THREE_MONTH:
      return '3 Months';
    case PACKAGE_TYPE.TWO_MONTH:
      return '2 Months';
    case PACKAGE_TYPE.MONTHLY:
      return 'Monthly';
    case PACKAGE_TYPE.WEEKLY:
      return 'Weekly';
    default:
      return pkg.product.title;
  }
}

export default function PremiumScreen() {
  const router = useRouter();
  const { isPremium, refreshSubscription } = useSubscription();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pkgs = await getOfferings();
      if (cancelled) return;
      setPackages(pkgs);
      const annual = pkgs.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
      const monthly = pkgs.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
      setSelectedPackage(annual ?? monthly ?? pkgs[0] ?? null);
      setLoadingOfferings(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) return;
    setError(null);
    setPurchasing(true);
    const result = await purchasePackage(selectedPackage);
    setPurchasing(false);

    if (result.success) {
      await refreshSubscription();
      setJustUnlocked(true);
      return;
    }
    // Cancellation resolves with no `error` — stay on screen silently.
    if (result.error) {
      setError(result.error);
    }
  }, [selectedPackage, refreshSubscription]);

  const handleRestore = useCallback(async () => {
    setError(null);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      await refreshSubscription();
      setJustUnlocked(true);
      return;
    }
    if (result.error) {
      setError(result.error);
    }
  }, [refreshSubscription]);

  const planPackages = packages.filter(
    p => p.packageType === PACKAGE_TYPE.ANNUAL || p.packageType === PACKAGE_TYPE.MONTHLY,
  );
  const displayPackages = planPackages.length > 0 ? planPackages : packages;

  const showPlans = !isPremium && !loadingOfferings && displayPackages.length > 0;
  const showUnavailable = !isPremium && !loadingOfferings && displayPackages.length === 0 && !error;

  return (
    <ScreenShell safeBottom>
      <ScreenHeader title="MindPulse Pro" showBack />
      <View style={styles.hero}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.heroTitle}>Unlock your best self</Text>
        <Text style={styles.heroSub}>
          {isPremium || justUnlocked ? 'You have full access to MindPulse Pro' : 'Cancel anytime'}
        </Text>
      </View>

      {isPremium || justUnlocked ? (
        <GlassCard style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {justUnlocked ? "You're all set! 🎉" : "You're a Pro member"}
          </Text>
          <Text style={styles.statusSub}>Thanks for supporting MindPulse.</Text>
        </GlassCard>
      ) : loadingOfferings ? (
        <ActivityIndicator color={colors.accent.purple} size="large" style={styles.loading} />
      ) : null}

      {showPlans && (
        <>
          <View style={styles.planToggle}>
            {displayPackages.map(pkg => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.planOption,
                  selectedPackage?.identifier === pkg.identifier && styles.planActive,
                ]}
                onPress={() => setSelectedPackage(pkg)}
                activeOpacity={0.8}
              >
                <Text style={styles.planOptionLabel}>{planLabel(pkg)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPackage && (
            <GlassCard style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{selectedPackage.product.priceString}</Text>
                <Text style={styles.pricePeriod}>{periodLabel(selectedPackage)}</Text>
              </View>
              {!!selectedPackage.product.description && (
                <Text style={styles.priceDescription}>{selectedPackage.product.description}</Text>
              )}
            </GlassCard>
          )}
        </>
      )}

      {showUnavailable && (
        <GlassCard style={styles.statusCard}>
          <Text style={styles.statusTitle}>Plans unavailable</Text>
          <Text style={styles.statusSub}>Please check your connection and try again later.</Text>
        </GlassCard>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {isPremium || justUnlocked ? (
        <PrimaryButton label="Done" onPress={() => router.back()} />
      ) : (
        <PrimaryButton
          label="Continue"
          onPress={handlePurchase}
          loading={purchasing}
          disabled={!selectedPackage || purchasing}
        />
      )}

      {!isPremium && !justUnlocked && (
        <OutlineButton
          label={restoring ? 'Restoring…' : 'Restore Purchases'}
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreButton}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  crown: { fontSize: 48 },
  heroTitle: { ...typography.headingLarge, color: colors.text.primary },
  heroSub: { ...typography.body, color: colors.text.secondary },
  loading: { marginVertical: spacing.xl },
  statusCard: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  statusTitle: { ...typography.headingSmall, color: colors.text.primary },
  statusSub: { ...typography.body, color: colors.text.secondary },
  planToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  planOption: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planActive: { borderColor: colors.accent.purple, backgroundColor: colors.accent.purpleLight },
  planOptionLabel: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  priceCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  price: { ...typography.headingLarge, color: colors.accent.purple, fontSize: 36 },
  pricePeriod: { ...typography.body, color: colors.text.secondary },
  priceDescription: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.status.error, marginBottom: spacing.sm, textAlign: 'center' },
  restoreButton: { marginTop: spacing.sm },
});
