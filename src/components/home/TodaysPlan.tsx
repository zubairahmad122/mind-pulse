import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { getDynamicPlan } from '@/constants/homeDashboard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = { worstArea: string };

export function TodaysPlan({ worstArea }: Props) {
  const router = useRouter();
  const plan = getDynamicPlan(worstArea);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Today&apos;s Plan</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {plan.map(item => (
          <TouchableOpacity key={item.id} activeOpacity={0.85} onPress={() => router.push(item.route as never)}>
            <GlassCard style={styles.card}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.sub}>{item.subtitle}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  title: { ...typography.headingSmall, color: colors.text.primary, marginBottom: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.md },
  card: { width: 168, gap: spacing.xs },
  emoji: { fontSize: 28 },
  cardTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.text.secondary },
});
