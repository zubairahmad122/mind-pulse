import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = { message: string };

export function AIRecommendation({ message }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.badgeRow}>
        <Ionicons name="sparkles-outline" size={14} color={colors.accent.purple} />
        <Text style={styles.badge}>AI Recommendation</Text>
      </View>
      <Text style={styles.body}>{message}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { ...typography.label, color: colors.accent.purple },
  body: { ...typography.bodyLarge, color: colors.text.secondary, lineHeight: 22 },
});
