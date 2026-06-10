import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { QUICK_ACTIONS } from '@/constants/homeDashboard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.id}
            activeOpacity={0.85}
            onPress={() => router.push(action.route as never)}
          >
            <GlassCard style={styles.item}>
              <View style={styles.iconWrap}>
                <Ionicons name={action.icon} size={22} color={colors.accent.purple} />
              </View>
              <Text style={styles.label}>{action.label}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  title: { ...typography.headingSmall, color: colors.text.primary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    width: 158,
    minHeight: 96,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.label, color: colors.text.primary },
});
