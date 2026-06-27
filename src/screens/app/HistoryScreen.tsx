import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, DimensionValue, StyleSheet, Text, View } from 'react-native';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { SleepSummaryCard, type SleepSummaryData, type SleepStageData } from '@/components/sleep/SleepSummaryCard';
import { COLORS, HISTORY_CHART, qualityEmojiForRating } from '@/constants';
import { useSleep } from '@/context/SleepContext';
import { formatHistoryClock, formatHistorySessionDate } from '@/utils/historyDisplay';
import { avgDuration, formatDuration } from '@/utils/sleepUtils';
import { estimateStages } from '@/utils/stageEstimator';

export default function HistoryScreen() {
  const { sessions, loading } = useSleep();
  const lastSession = sessions[0] ?? null;
  const avg = avgDuration(sessions);
  const last7 = sessions.slice(0, 7).reverse();

  if (loading) {
    return (
      <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="Sleep History" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.purple} size="large" />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
      <ScreenHeader title="Sleep History" showBack />

      {sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 pt-20">
          <View style={styles.emptyOrb}>
            <Ionicons name="moon" size={46} color={COLORS.purple} />
          </View>
          <Text className="text-xl font-bold text-white mt-2">No sessions yet</Text>
          <Text className="text-[14px] text-app-muted text-center leading-6">
            Start tracking your sleep from{'\n'}the Sleep tab.
          </Text>
        </View>
      ) : (
        <>
          {/* Latest session summary card */}
          {lastSession && (() => {
            const start = new Date(lastSession.startTime);
            const end = new Date(lastSession.endTime);
            const fmtTime = (d: Date) =>
              d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const summary: SleepSummaryData = {
              durationLabel: formatDuration(lastSession.durationMinutes),
              bedtime: fmtTime(start),
              wakeTime: fmtTime(end),
            };
            const stages: SleepStageData = estimateStages(lastSession.id, lastSession.durationMinutes);
            const insight = lastSession.durationMinutes >= 420
              ? 'You met your sleep target — great consistency.'
              : 'Your sleep was shorter than recommended. Try an earlier bedtime.';
            return (
              <SleepSummaryCard
                summary={summary}
                stages={stages}
                insight={insight}
              />
            );
          })()}

          <GlassCard style={{ marginBottom: 20 }}>
            <View className="flex-row justify-between items-start mb-5">
              <View>
                <Text style={styles.summaryLabel}>
                  {sessions.length >= 7
                    ? 'Last 7 Nights'
                    : `${sessions.length} Session${sessions.length > 1 ? 's' : ''}`}
                </Text>
                <Text style={styles.summaryAvg}>
                  {avg > 0 ? formatDuration(avg) : '—'}
                </Text>
              </View>
              <View style={styles.avgBadge}>
                <Text style={styles.avgBadgeText}>avg / night</Text>
              </View>
            </View>

            {/* Bar chart */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {last7.map(s => {
                const pct = Math.min(s.durationMinutes / HISTORY_CHART.maxMinutesForFullBar, 1);
                const isGood = s.durationMinutes >= HISTORY_CHART.goodSleepMinutes;
                return (
                  <View
                    key={s.id}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                  >
                    <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(pct * 100, 8)}%` as DimensionValue,
                            backgroundColor: isGood ? COLORS.purple : COLORS.border,
                          },
                          isGood && styles.barGlow,
                        ]}
                      />
                    </View>
                    <Text style={styles.barDate}>{s.date.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <Text style={styles.sectionLabel}>All Sessions</Text>

          {sessions.map(session => (
            <GlassCard key={session.id} simple style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 4 }}>
                <Text style={styles.sessionDate}>{formatHistorySessionDate(session.date)}</Text>
                <Text style={styles.sessionTime}>
                  {formatHistoryClock(session.startTime)} {'→'} {formatHistoryClock(session.endTime)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Text style={styles.sessionDuration}>
                  {formatDuration(session.durationMinutes)}
                </Text>
                {(() => {
                  const QualityIcon = qualityEmojiForRating(session.quality);
                  return <QualityIcon size={20} color="rgba(255,255,255,0.6)" />;
                })()}
              </View>
            </GlassCard>
          ))}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  emptyOrb: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 22, padding: 20, marginBottom: 20,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3 },
  summaryAvg:   { color: '#ffffff', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  avgBadge: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  avgBadgeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  bar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barGlow: {
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 5, elevation: 4,
  },
  barDate: { color: COLORS.textMuted, fontSize: 9, marginTop: 5, fontWeight: '500' },
  sectionLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  sessionCard: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sessionDate:     { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  sessionTime:     { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  sessionDuration: { color: COLORS.purpleLight, fontSize: 16, fontWeight: '800' },
});
