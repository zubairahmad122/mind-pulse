import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

type Props = {
  bedtime: string;
  sleepScore: number;
};

export function SleepGoalCard({ bedtime, sleepScore }: Props) {
  const router = useRouter();
  const clamped = Math.min(100, Math.max(0, sleepScore));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`${ROUTES.appSleep}?tab=tonight` as never)}
    >
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>Tonight&apos;s goal</Text>
          <Text style={styles.bedtime}>{bedtime}</Text>
          <Text style={styles.sub}>Bedtime target</Text>
        </View>
        <View style={styles.ringWrap}>
          <View style={styles.ringOuter}>
            <View style={[styles.ringProgress, { opacity: clamped / 100 }]} />
            <View style={styles.ringInner}>
              <Text style={styles.score}>{clamped}</Text>
              <Text style={styles.scoreLabel}>%</Text>
            </View>
          </View>
          <Text style={styles.ringCaption}>Sleep score</Text>
        </View>
      </View>
    </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1, gap: spacing.xs },
  label: { ...typography.label, color: colors.text.secondary, textTransform: 'uppercase' },
  bedtime: { ...typography.headingLarge, color: colors.text.primary },
  sub: { ...typography.caption, color: colors.text.tertiary },
  ringWrap: { alignItems: 'center', gap: spacing.xs },
  ringOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.accent.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    ...StyleSheet.absoluteFill,
    borderRadius: 44,
    backgroundColor: colors.accent.purpleGlow,
  },
  ringInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  score: { ...typography.headingSmall, color: colors.accent.purple },
  scoreLabel: { ...typography.caption, color: colors.text.secondary, marginTop: 4 },
  ringCaption: { ...typography.caption, color: colors.text.tertiary },
});
