import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { QUICK_ACTIONS } from '@/constants/homeDashboard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const CARD_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  sleep: { bg: '#7B61FF15', icon: '#7B61FF', border: '#7B61FF30' },
  audio: { bg: '#4FC3F715', icon: '#4FC3F7', border: '#4FC3F730' },
  eye:   { bg: '#6ee7b715', icon: '#6ee7b7', border: '#6ee7b730' },
  stress:{ bg: '#FF6B9D15', icon: '#FF6B9D', border: '#FF6B9D30' },
};

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Quick Actions</Text>
        <View style={styles.headerAccent} />
      </View>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map(action => {
          const palette = CARD_COLORS[action.id] ?? CARD_COLORS.sleep;
          const IconComponent = action.icon;
          return (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.route as never);
              }}
              style={styles.cardTouch}
            >
              <GlassCard
                style={{ ...styles.item, borderColor: palette.border }}
              >
                <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
                  <View style={[styles.iconInner, { backgroundColor: palette.icon + '20' }]}>
                    <IconComponent size={22} color={palette.icon} strokeWidth={1.8} />
                  </View>
                </View>
                <Text style={styles.label}>{action.label}</Text>
                <View style={styles.arrowHint}>
                  <View style={[styles.arrowDot, { backgroundColor: palette.icon + '40' }]} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerAccent: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    ...typography.headingSmall,
    color: colors.text.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardTouch: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
  item: {
    gap: spacing.sm,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    position: 'relative',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  arrowHint: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    flexDirection: 'row',
    gap: 3,
  },
  arrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
