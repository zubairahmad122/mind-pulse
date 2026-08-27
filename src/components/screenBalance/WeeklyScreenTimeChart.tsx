import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS } from '@/constants/designSystem';
import { formatScreenTimeMs } from '@/utils/screenUsageFormat';
import { chartMaxScreenTimeMs, weekDayAccessibilityLabel, type WeekDayTrend } from '@/utils/weeklyTrends';

const ACCENT = PILLAR_COLORS.reset;
const CHART_H = 88;
const UNAVAILABLE_COLOR = 'rgba(255,255,255,0.1)';

/**
 * 7-day screen-time bar chart for Weekly Trends. Bars scale relative to the
 * highest available day in [days] — never a fixed/arbitrary axis. A day
 * with `screenTimeMs === null` (Usage Access unavailable that day) renders
 * a flat gray bar with a "–" value, distinct from a genuine zero-usage day.
 */
export function WeeklyScreenTimeChart({ days }: { days: WeekDayTrend[] }) {
  const max = chartMaxScreenTimeMs(days);

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>SCREEN TIME</Text>
      <View style={styles.barsRow}>
        {days.map(day => {
          const unavailable = day.screenTimeMs === null;
          const barHeight =
            unavailable || max === null ? 6 : Math.max(6, Math.round(((day.screenTimeMs ?? 0) / max) * CHART_H));
          const barColor = unavailable ? UNAVAILABLE_COLOR : ACCENT;
          const valueText = unavailable
            ? '–'
            : day.screenTimeMs === 0
              ? '0m'
              : formatScreenTimeMs(day.screenTimeMs ?? 0);

          return (
            <View
              key={day.date}
              style={styles.barCol}
              accessible
              accessibilityLabel={weekDayAccessibilityLabel(day)}
            >
              <Text style={[styles.valueAbove, { color: unavailable ? colors.text.tertiary : barColor }]}>
                {valueText}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: barHeight, backgroundColor: barColor },
                    day.isToday &&
                      !unavailable && {
                        borderWidth: 1.5,
                        borderColor: barColor,
                        shadowColor: barColor,
                        shadowOpacity: 0.6,
                        shadowRadius: 6,
                      },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {day.isToday ? 'Today' : day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(245,247,251,0.55)',
    textTransform: 'uppercase',
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
  valueAbove: {
    fontSize: 9.5,
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
    fontFamily: FONTS.body,
    fontSize: 9,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  dayLabelToday: {
    color: colors.text.primary,
    fontWeight: '800',
  },
});
