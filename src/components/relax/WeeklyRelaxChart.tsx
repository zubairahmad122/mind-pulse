import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMemo } from 'react';

import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { FONTS, SURFACE_TINT } from '@/constants/designSystem';
import { getSessionById } from '@/constants/relaxSessions';
import type { SessionCompletionRecord } from '@/context/RelaxContext';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_H = 44;
/** Muted violet/indigo — matches the hero's gradient family. */
const HISTORICAL_COLOR = '#6E5AC4';
/** Cyan/violet highlight reserved for today's bar — same accent family as the hero CTA. */
const TODAY_COLOR = '#4DE1C1';

interface DayBucket {
  date: string;
  label: string;
  isToday: boolean;
  minutes: number;
  sessionCount: number;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Buckets [records] into the trailing 7 calendar days (oldest → newest, last = today). */
function buildWeek(records: SessionCompletionRecord[], now: Date): DayBucket[] {
  const byDate = new Map<string, { minutes: number; count: number }>();
  for (const r of records) {
    const key = localDateKey(new Date(r.completedAt));
    const session = getSessionById(r.sessionId);
    const minutes = (session?.durationSeconds ?? 0) / 60;
    const cur = byDate.get(key) ?? { minutes: 0, count: 0 };
    cur.minutes += minutes;
    cur.count += 1;
    byDate.set(key, cur);
  }

  const todayKey = localDateKey(now);
  const days: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const bucket = byDate.get(key);
    days.push({
      date: key,
      label: WEEKDAY_SHORT[d.getDay()],
      isToday: key === todayKey,
      minutes: bucket?.minutes ?? 0,
      sessionCount: bucket?.count ?? 0,
    });
  }
  return days;
}

/**
 * Compact "Weekly Relax" module — a real 7-day bar chart plus a one-line
 * summary, built entirely from `completedSessions` (no fabricated values).
 * Falls back to a short empty state (day labels + flat placeholder dashes,
 * never bars that look like real data) when there's no history yet.
 */
export function WeeklyRelaxChart({
  completedSessions,
  onPress,
}: {
  completedSessions: SessionCompletionRecord[];
  onPress?: () => void;
}) {
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => buildWeek(completedSessions, now), [completedSessions, now]);

  if (completedSessions.length === 0) {
    return (
      <GlassCard style={styles.card} tint={SURFACE_TINT.card}>
        <Text style={styles.title}>WEEKLY RELAX</Text>
        <View style={styles.emptyTextBlock}>
          <Text style={styles.emptyHeadline}>No relax sessions yet</Text>
          <Text style={styles.emptySub}>Your weekly activity will appear after your first session.</Text>
        </View>
        <View style={styles.barsRow} accessible accessibilityLabel="No relax activity yet this week">
          {WEEKDAY_SHORT.map((label, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={styles.dayLabel}>{label}</Text>
              <View style={styles.emptyDash} />
            </View>
          ))}
        </View>
      </GlassCard>
    );
  }

  const totalMinutes = Math.round(days.reduce((sum, d) => sum + d.minutes, 0));
  const sessionsThisWeek = days.reduce((sum, d) => sum + d.sessionCount, 0);
  const activeDays = days.filter(d => d.sessionCount > 0).length;
  const avgMinutes = sessionsThisWeek > 0 ? Math.round(totalMinutes / sessionsThisWeek) : 0;
  const maxMinutes = Math.max(1, ...days.map(d => d.minutes));

  const content = (
    <GlassCard style={styles.card} tint={SURFACE_TINT.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>WEEKLY RELAX</Text>
        <Text style={styles.totalValue}>{totalMinutes} min</Text>
      </View>

      <View style={styles.barsRow}>
        {days.map(day => {
          const barHeight = day.minutes > 0 ? Math.max(6, Math.round((day.minutes / maxMinutes) * CHART_H)) : 4;
          const barColor = day.isToday ? TODAY_COLOR : HISTORICAL_COLOR;
          const a11yLabel = `${day.isToday ? 'Today' : day.label}, ${day.minutes > 0 ? `${Math.round(day.minutes)} minutes relax` : 'no relax activity'}`;
          return (
            <View key={day.date} style={styles.barCol} accessible accessibilityLabel={a11yLabel}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: barHeight, backgroundColor: day.minutes > 0 ? barColor : 'rgba(255,255,255,0.09)' },
                    day.isToday && day.minutes > 0 && styles.barFillToday,
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

      <Text style={styles.summaryLine}>
        <Text style={styles.summaryValue}>{sessionsThisWeek}</Text> session{sessionsThisWeek === 1 ? '' : 's'}
        {avgMinutes > 0 && (
          <>
            {'  ·  '}
            <Text style={styles.summaryValue}>{avgMinutes}m</Text> avg
          </>
        )}
        {'  ·  '}
        <Text style={styles.summaryValue}>{activeDays}</Text> active day{activeDays === 1 ? '' : 's'}
      </Text>
    </GlassCard>
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(245,247,251,0.55)',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: colors.text.primary,
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
    gap: 5,
  },
  barTrack: {
    width: '100%',
    height: CHART_H,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barFillToday: {
    shadowColor: TODAY_COLOR,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  dayLabel: {
    fontFamily: FONTS.body,
    fontSize: 9.5,
    color: 'rgba(245,247,251,0.55)',
    textAlign: 'center',
  },
  dayLabelToday: {
    color: colors.text.primary,
    fontWeight: '800',
  },

  // ── One-line real-data summary ──
  summaryLine: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(245,247,251,0.6)',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  summaryValue: {
    fontFamily: FONTS.heading,
    fontSize: 12.5,
    color: colors.text.primary,
  },

  // ── Empty state ──
  emptyTextBlock: {
    gap: 2,
  },
  emptyHeadline: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(245,247,251,0.55)',
  },
  emptyDash: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
