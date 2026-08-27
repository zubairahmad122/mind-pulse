import { DimensionValue, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { COLORS } from '@/constants';
import { PILLAR_COLORS } from '@/constants/designSystem';
import { useUnlockedAchievements } from '@/hooks/useUnlockedAchievements';

// Same orange as the Challenges tab's badge grid — one "achievement" accent,
// not each achievement's own color, so this and Challenges agree visually.
const ACCENT = PILLAR_COLORS.challenge;

export default function AchievementsScreen() {
  const { earned, locked, unlockedCount, totalCount, percent: pct } = useUnlockedAchievements();

  return (
    <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
      <ScreenHeader title="Achievements" showBack />

      {/* Progress */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text style={styles.progressLabel}>{unlockedCount} of {totalCount} unlocked</Text>
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
            <GlassCard key={a.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 14 }}>
              <View style={styles.badge}>
                <View style={styles.badgeInner}>
                  <a.icon size={22} color={ACCENT} strokeWidth={2} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achieveTitle}>{a.title}</Text>
                {/* Real unlock timestamps aren't tracked yet — this shows the
                    correct style now without inventing a date. */}
                <Text style={styles.achieveMeta}>Unlocked</Text>
              </View>
              <View style={styles.checkBadge}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            </GlassCard>
          ))}
        </>
      )}

      {locked.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>🔒 Locked</Text>
          {locked.map(a => (
            <GlassCard key={a.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 14, opacity: 0.45 }}>
              <View style={styles.lockedBadge}>
                <a.icon size={20} color={COLORS.textMuted} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedTitle}>{a.title}</Text>
                <Text style={styles.lockedDesc}>{a.desc}</Text>
              </View>
            </GlassCard>
          ))}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  progressLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  progressPct:   { color: ACCENT, fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  progressFill: {
    height: '100%', backgroundColor: ACCENT, borderRadius: 999,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },
  sectionLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  badge: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1.5,
    borderColor: ACCENT + '70', shadowColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  badgeInner: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENT + '1a',
    alignItems: 'center', justifyContent: 'center',
  },
  achieveTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  achieveMeta:  { color: '#32D583', fontSize: 12, fontWeight: '600' },
  checkBadge: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    backgroundColor: ACCENT + '1a', borderColor: ACCENT + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: ACCENT, fontSize: 12, fontWeight: '800' },
  lockedBadge: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
  },
  lockedTitle: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  lockedDesc:  { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
});
