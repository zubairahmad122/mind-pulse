import { Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, type ViewStyle } from 'react-native';
import { COLORS, ROUTES } from '@/constants';
import { PRO_GOLD, SURFACE } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSubscription } from '@/context/SubscriptionContext';

// The app's generic brand purple (Profile module standard), not a pillar color.
const ACCENT = SURFACE.purple;

type Props = {
  style?: ViewStyle;
};

/** Small "PRO" / "FREE" pill shown across screens — tap opens the Premium screen. */
export function SubscriptionBadge({ style }: Props) {
  const { isPremium, loading } = useSubscription();
  const router = useRouter();

  if (loading) return null;

  return (
    <TouchableOpacity
      style={[styles.badge, isPremium ? styles.pro : styles.free, style]}
      onPress={() => router.push(ROUTES.appPremium as never)}
      activeOpacity={0.8}
    >
      <Crown size={14} color={isPremium ? COLORS.bg : ACCENT} />
      <Text style={[styles.text, isPremium ? styles.proText : styles.freeText]}>
        {isPremium ? 'PRO' : 'FREE'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pro: {
    backgroundColor: PRO_GOLD,
    borderRadius: 16,
  },
  free: {
    backgroundColor: ACCENT + '1F',
    borderWidth: 1,
    borderColor: ACCENT + '59',
    borderRadius: 16,
  },
  text: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  proText: {
    color: COLORS.bg,
  },
  freeText: {
    color: ACCENT,
    fontWeight: '600',
  },
});
