import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { OutlineButton } from '@/components/ui/OutlineButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const FEATURES = [
  'Full audio library',
  'AI sleep suggestions',
  'All eye exercises',
  'Stress journal AI insights',
  'Advanced sleep tracking',
];

const COMPARISON = [
  { label: 'Guided audio', free: 'Limited', pro: 'Full library' },
  { label: 'AI insights', free: '—', pro: '✓' },
  { label: 'Eye exercises', free: 'Basic', pro: 'All' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const [yearly, setYearly] = useState(false);

  return (
    <ScreenShell safeBottom>
      <ScreenHeader title="AuraSync Pro" showBack />
      <View style={styles.hero}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.heroTitle}>Unlock your best rest</Text>
        <Text style={styles.heroSub}>7-day free trial · Cancel anytime</Text>
      </View>

      <View style={styles.planToggle}>
        <OutlineButton
          label="Monthly"
          onPress={() => setYearly(false)}
          style={!yearly ? styles.planActive : undefined}
        />
        <OutlineButton
          label="Yearly · Save 40%"
          onPress={() => setYearly(true)}
          style={yearly ? styles.planActive : undefined}
        />
      </View>

      <GlassCard style={styles.priceCard}>
        <Text style={styles.price}>{yearly ? '$14.99' : '$1.99'}</Text>
        <Text style={styles.pricePeriod}>/{yearly ? 'year' : 'month'}</Text>
      </GlassCard>

      {FEATURES.map(f => (
        <View key={f} style={styles.featureRow}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.featureText}>{f}</Text>
        </View>
      ))}

      <Text style={styles.compareTitle}>Free vs Pro</Text>
      {COMPARISON.map(row => (
        <GlassCard key={row.label} style={styles.compareRow}>
          <Text style={styles.compareLabel}>{row.label}</Text>
          <Text style={styles.compareFree}>{row.free}</Text>
          <Text style={styles.comparePro}>{row.pro}</Text>
        </GlassCard>
      ))}

      <PrimaryButton label="Start Free Trial" onPress={() => router.back()} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  crown: { fontSize: 48 },
  heroTitle: { ...typography.headingLarge, color: colors.text.primary },
  heroSub: { ...typography.body, color: colors.text.secondary },
  planToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  planActive: { borderColor: colors.accent.purple, backgroundColor: colors.accent.purpleLight },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  price: { ...typography.headingLarge, color: colors.accent.purple, fontSize: 36 },
  pricePeriod: { ...typography.body, color: colors.text.secondary },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  check: { color: colors.status.success, fontSize: 16 },
  featureText: { ...typography.bodyLarge, color: colors.text.primary },
  compareTitle: {
    ...typography.headingSmall,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  compareRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  compareLabel: { flex: 1, ...typography.body, color: colors.text.primary },
  compareFree: { width: 70, ...typography.caption, color: colors.text.tertiary, textAlign: 'center' },
  comparePro: { width: 70, ...typography.caption, color: colors.accent.purple, textAlign: 'center' },
});
