import { Crown } from 'lucide-react-native';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { COLORS } from '@/constants/colors';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = {
  style?: ViewStyle;
};

/** Small gold "PRO" pill — shown next to the user's name when isPremium is true. */
export function PremiumBadge({ style }: Props) {
  return (
    <View style={[styles.badge, style]}>
      <Crown size={12} color={COLORS.bg} />
      <Text style={styles.text}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: COLORS.gold,
  },
  text: {
    ...typography.caption,
    color: COLORS.bg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
