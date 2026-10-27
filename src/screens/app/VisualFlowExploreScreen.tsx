import { useRouter } from 'expo-router';
import { ChevronRight, Infinity as InfinityIcon, Target, Waves, MoveHorizontal } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

import { PILLAR_COLORS, SURFACE_TINT } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { spacing } from '@/constants/spacing';
import { VISUAL_FLOW_ACTIVITIES, VISUAL_FLOW_DEFAULT_SEQUENCE } from '@/constants/visualFlowActivities';

const ACCENT = PILLAR_COLORS.eye;
const ICONS = { 'infinity-flow': InfinityIcon, 'wave-flow': Waves, 'target-switch': Target, 'sweep-flow': MoveHorizontal } as const;

export default function VisualFlowExploreScreen() {
  const router = useRouter();

  return (
    <ScreenShell bannerAd pillar="eye" ambient={<AmbientBackground subtle />}>
      <ScreenHeader title="Explore Visual Flow" subtitle="Run any activity on its own." />

      <GlassCard simple noPadding tint={SURFACE_TINT.card} style={styles.listCard}>
        {VISUAL_FLOW_DEFAULT_SEQUENCE.map((id, idx) => {
          const activity = VISUAL_FLOW_ACTIVITIES[id];
          const Icon = ICONS[id];
          return (
            <TouchableOpacity
              key={id}
              style={[styles.row, idx < VISUAL_FLOW_DEFAULT_SEQUENCE.length - 1 && styles.rowDivider]}
              onPress={() => router.push({ pathname: ROUTES.appVisualFlow, params: { ids: id } } as never)}
              activeOpacity={0.75}
            >
              <View style={[styles.rowIcon, { backgroundColor: ACCENT + '16', borderColor: ACCENT + '30' }]}>
                <Icon size={18} color={ACCENT} strokeWidth={1.9} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{activity.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{activity.description}</Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.rowDuration}>{activity.durationSeconds}s</Text>
                <ChevronRight size={16} color={ACCENT} strokeWidth={2.2} />
              </View>
            </TouchableOpacity>
          );
        })}
      </GlassCard>

      <View style={{ height: 40 }} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  listCard: { marginTop: spacing.lg, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 16, minHeight: 68,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#f6f8fc' },
  rowSub: { fontSize: 12, color: 'rgba(245,247,251,0.6)' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  rowDuration: { fontSize: 11.5, fontWeight: '600', color: 'rgba(245,247,251,0.5)' },
});
