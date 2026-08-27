import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAds } from '@/hooks/useAds';

type Props = {
  /** Identifies this slot for when a real ad SDK is wired up. */
  placement: string;
};

/**
 * Renders an ad slot placeholder for non-premium users, nothing for Pro users.
 * No ad SDK is integrated — swap the inner View for the SDK's banner component later.
 */
export function AdPlaceholder({ placement }: Props) {
  const adsEnabled = useAds();
  if (!adsEnabled) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ad · {placement}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
