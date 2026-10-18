import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LockKeyhole } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { WeeklyScreenTimeChart } from '@/components/screenBalance/WeeklyScreenTimeChart';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SHADOWS, SPACING } from '@/constants/designSystem';
import { useAuth } from '@/context/AuthContext';
import { getDailyHistory } from '@/services/screenBalanceHistoryPersistence';
import { getScreenTimeHistory, isScreenUsageSupported, WEEKLY_TRENDS_DAYS } from '@/services/screenUsageService';
import { formatScreenTimeMs } from '@/utils/screenUsageFormat';
import {
  bestFocusDay,
  buildWeeklyTrends,
  dayDetailText,
  weeklyAverageScreenTimeMs,
  type WeeklyTrends,
} from '@/utils/weeklyTrends';

const ACCENT = PILLAR_COLORS.reset;

export default function WeeklyTrendsScreen() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<WeeklyTrends | null>(null);
  const supported = isScreenUsageSupported();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([
        getScreenTimeHistory(WEEKLY_TRENDS_DAYS),
        getDailyHistory(user?.uid, WEEKLY_TRENDS_DAYS),
      ]).then(([screenTimeHistory, dailyHistory]) => {
        if (active) setTrends(buildWeeklyTrends(screenTimeHistory, dailyHistory));
      });
      return () => {
        active = false;
      };
    }, [user?.uid]),
  );

  const best = trends ? bestFocusDay(trends.days) : null;
  const dailyAverageMs = trends ? weeklyAverageScreenTimeMs(trends.days) : null;
  const hasAnyLocalActivity =
    trends != null &&
    (trends.totals.focusMinutes > 0 || trends.totals.offlineMinutes > 0 || trends.totals.resetsCompleted > 0);

  return (
    <ScreenShell safeBottom pillar="reset" ambient={<AmbientBackground subtle />}>
      <ScreenHeader
        title="Weekly Trends"
        subtitle="Your last 7 days of screen balance."
        showBack
        subtitleLines={2}
      />

      {!supported && (
        <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
          <Text style={styles.unsupportedText}>
            Real screen-time history isn&apos;t available on this device yet. Your focus, offline, and reset
            trends below still work.
          </Text>
        </GlassCard>
      )}

      {supported && trends && !trends.hasScreenTimePermission && (
        <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
          <Text style={styles.unsupportedText}>
            Screen time history requires Screen Balance access. Enable it from Screen Balance to see your
            weekly screen time.
          </Text>
        </GlassCard>
      )}

      {trends && (
        <>
          <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
            <Text style={styles.eyebrow}>THIS WEEK</Text>
            <Text style={styles.hero}>
              {trends.hasScreenTimePermission ? formatScreenTimeMs(trends.totals.screenTimeMs) : '—'}
            </Text>
            <Text style={styles.heroCaption}>
              Screen time
              {dailyAverageMs !== null ? ` · ${formatScreenTimeMs(dailyAverageMs)}/day average` : ''}
            </Text>

            <View style={styles.secondaryRow}>
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{formatScreenTimeMs(trends.totals.focusMinutes * 60_000)}</Text>
                <Text style={styles.secondaryLabel}>Focus</Text>
              </View>
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{trends.totals.offlineMinutes} min</Text>
                <Text style={styles.secondaryLabel}>Offline</Text>
              </View>
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{trends.totals.resetsCompleted}</Text>
                <Text style={styles.secondaryLabel}>Resets</Text>
              </View>
            </View>
          </GlassCard>

          <View style={{ marginTop: SPACING.section }}>
            <SectionLabel first>SCREEN TIME</SectionLabel>
            <WeeklyScreenTimeChart days={trends.days} />
          </View>

          <View style={{ marginTop: SPACING.section }}>
            <SectionLabel first>BALANCE THIS WEEK</SectionLabel>
            <GlassCard style={{ ...SHADOWS.small }}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Focus</Text>
                <Text style={styles.statValue}>{formatScreenTimeMs(trends.totals.focusMinutes * 60_000)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Offline</Text>
                <Text style={styles.statValue}>{trends.totals.offlineMinutes} min</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Resets</Text>
                <Text style={styles.statValue}>{trends.totals.resetsCompleted}</Text>
              </View>
              {best && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Best focus day</Text>
                    <Text style={styles.statValue}>
                      {best.focusMinutes} min · {best.isToday ? 'Today' : best.label}
                    </Text>
                  </View>
                </>
              )}
              {!hasAnyLocalActivity && (
                <Text style={styles.emptyText}>No focus activity recorded yet.</Text>
              )}
            </GlassCard>
          </View>

          <View style={{ marginTop: SPACING.section }}>
            <SectionLabel first>LAST 7 DAYS</SectionLabel>
            <GlassCard style={{ ...SHADOWS.small }}>
              {trends.days
                .slice()
                .reverse()
                .map((day, index, arr) => (
                  <View key={day.date}>
                    <View style={styles.dayRow}>
                      <Text style={[styles.dayRowLabel, day.isToday && styles.dayRowLabelToday]}>
                        {day.isToday ? 'Today' : day.label}
                      </Text>
                      <Text style={styles.dayRowDetail} numberOfLines={1}>
                        {dayDetailText(day)}
                      </Text>
                    </View>
                    {index < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
            </GlassCard>
          </View>
        </>
      )}

      <View style={styles.privacyRow}>
        <LockKeyhole size={13} color="rgba(245,247,251,0.4)" strokeWidth={2} />
        <Text style={styles.privacyText}>Weekly trends are calculated and stored on this device only.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(245,247,251,0.55)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hero: {
    fontFamily: FONTS.heading,
    fontSize: 40,
    fontWeight: '700',
    color: colors.text.primary,
  },
  heroCaption: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  secondaryStat: {
    alignItems: 'flex-start',
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  secondaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  unsupportedText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    paddingTop: 10,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  dayRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    width: 48,
  },
  dayRowLabelToday: {
    color: colors.text.primary,
  },
  dayRowDetail: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: SPACING.section,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 11.5,
    color: 'rgba(245,247,251,0.4)',
  },
});
