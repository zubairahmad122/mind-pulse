import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = { tip: string };

export function DailyTip({ tip }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="bulb-outline" size={14} color={colors.accent.blue} />
        <Text style={styles.title}>Daily Tip</Text>
      </View>
      <Text style={styles.body}>{tip}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { ...typography.label, color: colors.accent.blue },
  body: { ...typography.body, color: colors.text.secondary, lineHeight: 20 },
});
