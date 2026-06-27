import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { GlassCard } from './GlassCard';
import { ScoreBreakdownItem, ScoreTheme } from '@/utils/scoring';

interface Props {
  title: string;
  score: number;
  theme: ScoreTheme;
  breakdown: ScoreBreakdownItem[];
  /**
   * Skip the repeated score number + theme label — use when they're already
   * shown right above (e.g. the Eye screen's big score card), so the same
   * "26/100 · Screen Time Adding Up" doesn't appear twice in a row.
   */
  hideScoreHeader?: boolean;
}

/** "Why this score?" — every row's points sum to the total score. */
export function ScoreBreakdownCard({ title, score, theme, breakdown, hideScoreHeader }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {!hideScoreHeader && (
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: theme.color }]}>{score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        )}
      </View>
      {!hideScoreHeader && (
        <Text style={[styles.themeLabel, { color: theme.color }]}>{theme.emoji}  {theme.label}</Text>
      )}

      <View style={styles.list}>
        {breakdown.map(row => {
          const pct = row.maxPoints > 0 ? (row.points / row.maxPoints) * 100 : 0;
          return (
            <View key={row.key} style={styles.row}>
              {/* Mini progress bar instead of radio circles */}
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: row.positive ? '#6ee7b7' : colors.text.tertiary,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.rowInfo}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowPoints}>{row.points} / {row.maxPoints}</Text>
                </View>
                <Text style={styles.rowDetail}>{row.detail}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text.tertiary,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontSize: 22, fontWeight: '900' },
  scoreMax: { fontSize: 12, color: colors.text.tertiary, fontWeight: '600' },
  themeLabel: { fontSize: 14, fontWeight: '700' },
  list: { gap: spacing.sm, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  progressWrap: { width: 40, marginTop: 1 },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 2.5,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: '600' },
  rowPoints: { ...typography.caption, color: colors.text.tertiary, fontWeight: '700' },
  rowDetail: { ...typography.caption, color: colors.text.secondary, lineHeight: 16 },
});
