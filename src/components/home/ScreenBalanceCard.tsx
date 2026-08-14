import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pause } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { FONTS, PILLAR_COLORS, RADIUS, SHADOWS, SURFACE_TINT } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { colors } from '@/constants/colors';
import {
  loadScreenBalanceStats,
  type ResetType,
  type ScreenBalanceStats,
} from '@/services/screenBalancePersistence';
import { useScreenUsage } from '@/hooks/useScreenUsage';
import { selectScreenBalanceCardState } from '@/utils/screenBalanceCard';
import { getScreenBalanceSuggestion } from '@/utils/screenBalanceSuggestion';
import { formatScreenTimeMs } from '@/utils/screenUsageFormat';

const ACCENT = PILLAR_COLORS.reset;

const ENABLE_EXPLAINER =
  "Screen Balance uses Android Usage Access to calculate screen time and session patterns on this device.\n\nYour reset activities continue to work even if you don't enable access.";

/** Only shown once the user has genuinely completed a reset today — never fabricated. */
function statsLine(stats: ScreenBalanceStats): string | null {
  if (stats.resetsCompletedToday <= 0) return null;
  const resets = `${stats.resetsCompletedToday} reset${stats.resetsCompletedToday === 1 ? '' : 's'} today`;
  return stats.offlineMinutesToday > 0
    ? `${resets} · ${stats.offlineMinutesToday} min offline`
    : resets;
}

function Header() {
  return (
    <View style={styles.headerRow}>
      <View style={styles.iconWrap}>
        <Pause size={15} color={ACCENT} strokeWidth={2} fill={ACCENT} />
      </View>
      <Text style={styles.eyebrow}>Screen Balance</Text>
    </View>
  );
}

/**
 * The Home Screen Balance card — entry point into the reset flow (Eye
 * Break / Breathe / Move / Go Offline) via `onTakeReset`, and, once real
 * Android usage data is available, into the Screen Balance Details screen.
 * "Take a Reset" is always immediate and never routes through Details (see
 * `ResetPickerSheet`) — Home owns the one sheet instance so this card and
 * the Quick Actions "Reset" pillar open the same picker.
 *
 * Render state comes from `selectScreenBalanceCardState` (see its doc for
 * the `legacy` / `enable` / `data` states). Within `data`, the visual
 * emphasis (normal / long-session / frequent-switching) is additionally
 * driven by `getScreenBalanceSuggestion` — the same pure priority logic
 * the Details screen and reset-recommendation flow use.
 */
export function ScreenBalanceCard({
  uid,
  onTakeReset,
}: {
  uid?: string;
  /** `recommendedReset` is set only when a smart suggestion is currently active, so `ResetPickerSheet` can highlight it. */
  onTakeReset: (recommendedReset?: ResetType) => void;
}) {
  const router = useRouter();
  const [stats, setStats] = useState<ScreenBalanceStats | null>(null);
  const { supported, snapshot, refresh, requestAccess } = useScreenUsage();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadScreenBalanceStats(uid).then(s => {
        if (active) setStats(s);
      });
      void refresh();
      return () => {
        active = false;
      };
    }, [uid, refresh]),
  );

  const cardState = selectScreenBalanceCardState({ supported, snapshot });

  const onEnable = () => {
    Alert.alert('Screen Balance', ENABLE_EXPLAINER, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Continue to Settings', onPress: () => void requestAccess() },
    ]);
  };

  const openDetails = () => router.push(ROUTES.appScreenBalance as never);

  if (cardState.kind === 'enable') {
    return (
      <GlassCard noPadding style={{ borderRadius: RADIUS.card, ...SHADOWS.small }} tint={SURFACE_TINT.card}>
        <View style={styles.inner}>
          <Header />
          <Text style={styles.title}>Understand your screen habits</Text>
          <Text style={styles.body}>See your screen time and get timely reset suggestions.</Text>
          <View style={styles.ctaWrap}>
            <GradientCTA label="Enable Screen Balance" compact textColor="#03212C" onPress={onEnable} />
          </View>
          <TouchableOpacity onPress={() => onTakeReset()} activeOpacity={0.7} style={styles.secondaryLink}>
            <Text style={styles.secondaryLinkText}>Take a Reset</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  }

  if (cardState.kind === 'data') {
    const { screenTimeTodayMs, sessionMs, sessionKind } = cardState;
    const resets = stats && statsLine(stats);
    const suggestion = snapshot
      ? getScreenBalanceSuggestion(snapshot, { lastResetCompletedAt: stats?.lastResetCompletedAt ?? null })
      : { reason: 'none' as const };
    const frequentSwitching = suggestion.reason === 'frequent-switching';
    const longSession = suggestion.reason === 'long-session-no-break' || suggestion.reason === 'long-session';
    const recommendedReset = suggestion.reason !== 'none' ? suggestion.recommendedReset : undefined;

    return (
      <GlassCard noPadding style={{ borderRadius: RADIUS.card, ...SHADOWS.small }} tint={SURFACE_TINT.card}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={openDetails} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="View Screen Balance details">
            <Header />
            {frequentSwitching ? (
              <>
                <Text style={styles.hero}>A lot of app switching</Text>
                {snapshot?.appSwitchesLast60Min != null && (
                  <Text style={styles.meta}>{snapshot.appSwitchesLast60Min} switches in the last hour</Text>
                )}
                <Text style={styles.body}>Take a short reset before continuing.</Text>
              </>
            ) : longSession ? (
              <>
                <Text style={styles.hero}>{formatScreenTimeMs(sessionMs ?? 0)} on screen</Text>
                <Text style={styles.body}>You&apos;ve been on screen for a while.</Text>
                {screenTimeTodayMs != null && (
                  <Text style={styles.meta}>{formatScreenTimeMs(screenTimeTodayMs)} today</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.hero}>
                  {screenTimeTodayMs != null ? formatScreenTimeMs(screenTimeTodayMs) : '—'}
                </Text>
                <Text style={styles.meta}>Screen time today</Text>
                {sessionMs != null && sessionKind && (
                  <Text style={styles.sessionLine}>
                    {sessionKind === 'current' ? 'Current session' : 'Last session'} · {formatScreenTimeMs(sessionMs)}
                  </Text>
                )}
                {resets && <Text style={styles.body}>{resets}</Text>}
              </>
            )}
          </TouchableOpacity>
          <View style={styles.ctaWrap}>
            <GradientCTA
              label="Take a Reset"
              compact
              textColor="#03212C"
              onPress={() => onTakeReset(recommendedReset)}
            />
          </View>
        </View>
      </GlassCard>
    );
  }

  // 'legacy' — unsupported platform, or still loading a snapshot.
  const body = (stats && statsLine(stats)) ??
    'Step away from the screen for a moment and reset your eyes, mind, or body.';
  return (
    <GlassCard noPadding style={{ borderRadius: RADIUS.card, ...SHADOWS.small }} tint={SURFACE_TINT.card}>
      <View style={styles.inner}>
        <Header />
        <Text style={styles.title}>Take a reset</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.ctaWrap}>
          <GradientCTA label="Take a Reset" compact textColor="#03212C" onPress={() => onTakeReset()} />
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
  hero: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.5)',
    marginBottom: 6,
  },
  sessionLine: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  ctaWrap: {
    marginTop: 12,
  },
  secondaryLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
});
