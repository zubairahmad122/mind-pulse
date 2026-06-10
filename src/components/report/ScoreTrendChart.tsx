import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { getScoreStatus } from '@/utils/scoreCalculator';

type DayEntry = { date: string; mindPulseScore: number } | null;

type Props = { days: DayEntry[] };

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TODAY_KEY = new Date().toISOString().slice(0, 10);
const CHART_H   = 80;

export function ScoreTrendChart({ days }: Props) {
  if (days.length === 0) return null;

  return (
    <View style={s.card}>
      <Text style={s.title}>7-DAY TREND</Text>
      <View style={s.barsRow}>
        {days.map((entry, i) => {
          const isToday   = entry?.date === TODAY_KEY;
          const score     = entry?.mindPulseScore ?? 0;
          const hasData   = entry !== null;
          const barColor  = hasData ? getScoreStatus(score).color : 'rgba(255,255,255,0.08)';
          const barHeight = hasData ? Math.max(6, Math.round((score / 100) * CHART_H)) : 6;
          const dayLabel  = entry ? DAY_LABELS[new Date(entry.date + 'T12:00:00').getDay()] : DAY_LABELS[new Date(new Date().setDate(new Date().getDate() - (days.length - 1 - i))).getDay()];

          return (
            <View key={i} style={s.barCol}>
              <Text style={[s.scoreAbove, { color: hasData ? barColor : colors.text.tertiary }]}>
                {hasData ? score : '–'}
              </Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { height: barHeight, backgroundColor: barColor },
                    isToday && { borderWidth: 1.5, borderColor: barColor, shadowColor: barColor, shadowOpacity: 0.6, shadowRadius: 6 },
                  ]}
                />
              </View>
              <Text style={[s.dayLabel, isToday && { color: colors.text.primary, fontWeight: '800' }]}>
                {isToday ? 'Today' : dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: spacing.sm,
  },
  title: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text.tertiary,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreAbove: {
    fontSize: 10,
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    height: CHART_H,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 6,
  },
  dayLabel: {
    ...typography.caption,
    fontSize: 9,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
