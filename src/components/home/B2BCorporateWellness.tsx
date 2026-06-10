import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ROUTES } from '@/constants/routes';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const INSIGHTS = [
  {
    id: 'digital-fatigue',
    icon: '💻',
    title: 'Digital Fatigue',
    desc: 'Staring at screens reduces blink rates by 60%, causing severe ocular fatigue. Practice the 20-20-20 rule.',
  },
  {
    id: 'posture',
    icon: '🧘',
    title: 'Workplace Posture',
    desc: 'Sedentary desk lifestyles lead to chronic shoulder tension. Try our Muscle Release break to instantly ease tension.',
  },
  {
    id: 'cortisol',
    icon: '🧠',
    title: 'Stress & Cortisol',
    desc: 'Prolonged cognitive work spikes cortisol. A 2-minute ocean breathing break resets your sympathetic nervous system.',
  },
  {
    id: 'focus',
    icon: '🎯',
    title: 'Cognitive Efficiency',
    desc: 'Multitasking induces mental clutter. A Stroop match coordination exercise improves executive control in 1 minute.',
  },
];

const QUICK_BREAKS = [
  {
    id: 'stroop',
    emoji: '🎯',
    title: 'Stroop Focus',
    sub: 'Cognitive check',
    route: ROUTES.appEyeGame('color-match'),
  },
  {
    id: 'breathing',
    emoji: '🌊',
    title: 'Ocean Wave',
    sub: 'Calm breathing',
    route: ROUTES.appCalmWave,
  },
  {
    id: 'grounding',
    emoji: '🌿',
    title: 'Grounding',
    sub: 'Stress relief',
    route: ROUTES.appGrounding,
  },
  {
    id: 'tension',
    emoji: '✊',
    title: 'Muscle Release',
    sub: 'Tension ease',
    route: ROUTES.appTensionRelease,
  },
];

export function B2BCorporateWellness() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>🏢 Corporate Wellness Center</Text>
      
      {/* Quick Office Breaks Scroll */}
      <Text style={styles.subtitle}>Micro-breaks for office hours</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breakRow}>
        {QUICK_BREAKS.map(item => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => router.push(item.route as never)}
          >
            <GlassCard style={styles.breakCard}>
              <Text style={styles.breakEmoji}>{item.emoji}</Text>
              <Text style={styles.breakTitle}>{item.title}</Text>
              <Text style={styles.breakSub}>{item.sub}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Workplace Health Knowledge Insights */}
      <Text style={[styles.subtitle, styles.marginTop]}>2026 Digital Health Insights</Text>
      {INSIGHTS.map(insight => (
        <GlassCard key={insight.id} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>{insight.icon}</Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
          </View>
          <Text style={styles.insightDesc}>{insight.desc}</Text>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  title: {
    ...typography.headingSmall,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  marginTop: {
    marginTop: spacing.md,
  },
  breakRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  breakCard: {
    width: 140,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  breakEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  breakTitle: {
    ...typography.label,
    color: colors.text.primary,
    fontWeight: '700',
  },
  breakSub: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  insightCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightIcon: {
    fontSize: 22,
  },
  insightTitle: {
    ...typography.label,
    color: colors.accent.blue,
    fontWeight: '700',
  },
  insightDesc: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
