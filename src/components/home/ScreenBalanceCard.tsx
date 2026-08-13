import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Pause } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { PILLAR_COLORS, RADIUS, SHADOWS, SURFACE_TINT } from '@/constants/designSystem';
import { colors } from '@/constants/colors';
import { loadScreenBalanceStats, type ScreenBalanceStats } from '@/services/screenBalancePersistence';

const ACCENT = PILLAR_COLORS.reset;

/** Only shown once the user has genuinely completed a reset today — never fabricated. */
function statsLine(stats: ScreenBalanceStats): string | null {
  if (stats.resetsCompletedToday <= 0) return null;
  const resets = `${stats.resetsCompletedToday} reset${stats.resetsCompletedToday === 1 ? '' : 's'} today`;
  return stats.offlineMinutesToday > 0
    ? `${resets} · ${stats.offlineMinutesToday} min offline`
    : resets;
}

/**
 * Replaces the old "Today's Tip" slot — a lightweight entry point into the
 * Screen Balance reset flow (Eye Break / Breathe / Move / Go Offline). No
 * device screen-time data here; that's a separate future task.
 *
 * `onTakeReset` opens the shared `ResetPickerSheet` — Home owns the one
 * sheet instance so this card and the Quick Actions "Reset" pillar open the
 * same picker instead of each growing their own copy.
 */
export function ScreenBalanceCard({ uid, onTakeReset }: { uid?: string; onTakeReset: () => void }) {
  const [stats, setStats] = useState<ScreenBalanceStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadScreenBalanceStats(uid).then(s => {
        if (active) setStats(s);
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );

  const body = (stats && statsLine(stats)) ??
    'Step away from the screen for a moment and reset your eyes, mind, or body.';

  return (
    <GlassCard
      noPadding
      style={{ borderRadius: RADIUS.card, ...SHADOWS.small }}
      tint={SURFACE_TINT.card}
    >
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Pause size={15} color={ACCENT} strokeWidth={2} fill={ACCENT} />
          </View>
          <Text style={styles.eyebrow}>Screen Balance</Text>
        </View>

        <Text style={styles.title}>Take a reset</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.ctaWrap}>
          <GradientCTA
            label="Take a Reset"
            compact
            textColor="#03212C"
            onPress={onTakeReset}
          />
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT + '1F',
    borderWidth: 1,
    borderColor: ACCENT + '33',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(245,247,251,0.55)',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 3,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  ctaWrap: {
    marginTop: 12,
  },
});
