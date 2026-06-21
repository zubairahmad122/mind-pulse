import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ACHIEVEMENT_DEFINITIONS, COLORS } from '@/constants';
import type { AchievementExtras } from '@/constants/achievements';
import { useAuth } from '@/context/AuthContext';
import { useSleep } from '@/context/SleepContext';
import { useEyeProgress } from '@/hooks/useEyeProgress';

function todayKey() { return new Date().toISOString().slice(0, 10); }

export default function AchievementsScreen() {
  const { user } = useAuth();
  const { sessions } = useSleep();
  const { streak: eyeStreak } = useEyeProgress(user?.uid ?? undefined);
  const [extras, setExtras] = useState<AchievementExtras>({ eyeStreak: 0, recoveryToday: 0, totalJournalEntries: 0 });

  useEffect(() => {
    const uid = user?.uid ?? 'guest';
    void Promise.all([
      AsyncStorage.getItem(`@mindpulse/recovery:${uid}`),
      AsyncStorage.getItem(`@mindpulse/journal:${uid}`),
    ]).then(([recoveryRaw, journalRaw]) => {
      let recoveryToday = 0;
      if (recoveryRaw) {
        try {
          const arr: { completedAt: number }[] = JSON.parse(recoveryRaw);
          recoveryToday = arr.filter(s => new Date(s.completedAt).toISOString().slice(0, 10) === todayKey()).length;
        } catch { /* ignore */ }
      }
      let totalJournalEntries = 0;
      if (journalRaw) {
        try { totalJournalEntries = (JSON.parse(journalRaw) as unknown[]).length; } catch { /* ignore */ }
      }
      setExtras(prev => ({ ...prev, recoveryToday, totalJournalEntries }));
    });
  }, [user?.uid]);

  useEffect(() => {
    setExtras(prev => ({ ...prev, eyeStreak }));
  }, [eyeStreak]);

  const extrasWithEye: AchievementExtras = { ...extras, eyeStreak };
  const earned = ACHIEVEMENT_DEFINITIONS.filter(a => a.check(sessions, extrasWithEye));
  const locked  = ACHIEVEMENT_DEFINITIONS.filter(a => !a.check(sessions, extrasWithEye));
  const pct = (earned.length / ACHIEVEMENT_DEFINITIONS.length) * 100;

  return (
    <ScreenShell safeBottom>
      <ScreenHeader title="Achievements" showBack />

      {/* Progress */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text style={styles.progressLabel}>{earned.length} of {ACHIEVEMENT_DEFINITIONS.length} unlocked</Text>
          <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as DimensionValue }]} />
        </View>
      </View>

      {earned.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>✦ Unlocked</Text>
          {earned.map(a => (
            <View key={a.id} style={styles.earnedCard}>
              <View style={[styles.badge, { borderColor: a.color + '70', shadowColor: a.color }]}>
                <View style={[styles.badgeInner, { backgroundColor: a.color + '1a' }]}>
                  <Text style={{ fontSize: 24 }}>{a.icon}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achieveTitle}>{a.title}</Text>
                <Text style={styles.achieveDesc}>{a.desc}</Text>
              </View>
              <View style={[styles.checkBadge, { backgroundColor: a.color + '1a', borderColor: a.color + '50' }]}>
                <Text style={{ color: a.color, fontSize: 12, fontWeight: '800' }}>✓</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {locked.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>🔒 Locked</Text>
          {locked.map(a => (
            <View key={a.id} style={styles.lockedCard}>
              <View style={styles.lockedBadge}>
                <Text style={{ fontSize: 22, opacity: 0.3 }}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedTitle}>{a.title}</Text>
                <Text style={styles.lockedDesc}>{a.desc}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  progressLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  progressPct:   { color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: {
    height: '100%', backgroundColor: COLORS.purple, borderRadius: 3,
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },
  sectionLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  earnedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderHi,
    borderRadius: 18, padding: 14, marginBottom: 10, gap: 14,
  },
  badge: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  badgeInner: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  achieveTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  achieveDesc:  { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  checkBadge: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  lockedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, padding: 14, marginBottom: 10, gap: 14, opacity: 0.45,
  },
  lockedBadge: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
  },
  lockedTitle: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  lockedDesc:  { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
});
