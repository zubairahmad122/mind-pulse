import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { colors } from '@/constants/colors';
import { APP_SWITCH_HIGH_THRESHOLD } from '@/constants/screenBalance';
import { FONTS, PILLAR_COLORS, SHADOWS, SPACING } from '@/constants/designSystem';
import { useAuth } from '@/context/AuthContext';
import { useScreenUsage } from '@/hooks/useScreenUsage';
import { useSmartResetReminderSetting } from '@/hooks/useSmartResetReminderSetting';
import {
  loadScreenBalanceStats,
  type ResetType,
  type ScreenBalanceStats,
} from '@/services/screenBalancePersistence';
import type { AppUsageItem } from '@/types/screenUsage.types';
import { formatScreenTimeMs, formatTopAppDurationMs } from '@/utils/screenUsageFormat';
import { selectTopAppsSectionState } from '@/utils/topAppsSection';

const ACCENT = PILLAR_COLORS.reset;

const RESET_TYPE_LABELS: Record<ResetType, string> = {
  'eye-break': 'Eye Break',
  breathe: 'Breathe',
  move: 'Move',
  offline: 'Go Offline',
};

const ENABLE_EXPLAINER =
  "Screen Balance uses Android Usage Access to calculate screen time and session patterns on this device.\n\nYour reset activities continue to work even if you don't enable access.";

/** Deterministic per-package color, so the same app always gets the same monogram color. */
const MONOGRAM_COLORS = [
  PILLAR_COLORS.eye,
  PILLAR_COLORS.relax,
  PILLAR_COLORS.mind,
  PILLAR_COLORS.sleep,
  PILLAR_COLORS.challenge,
  PILLAR_COLORS.reset,
];

function monogramColorFor(packageName: string): string {
  let hash = 0;
  for (let i = 0; i < packageName.length; i++) hash = (hash * 31 + packageName.charCodeAt(i)) >>> 0;
  return MONOGRAM_COLORS[hash % MONOGRAM_COLORS.length];
}

function TopAppRow({ app, maxMs }: { app: AppUsageItem; maxMs: number }) {
  const color = monogramColorFor(app.packageName);
  const letter = app.appName.trim().charAt(0).toUpperCase() || '?';
  const barWidth = Math.max((app.foregroundTimeMs / maxMs) * 100, 6);

  return (
    <View
      style={styles.topAppRow}
      accessibilityLabel={`${app.appName}, ${formatTopAppDurationMs(app.foregroundTimeMs)}`}
    >
      <View style={[styles.monogram, { backgroundColor: color + '26', borderColor: color + '40' }]}>
        <Text style={[styles.monogramText, { color }]}>{letter}</Text>
      </View>
      <View style={styles.topAppInfo}>
        <Text style={styles.topAppName} numberOfLines={1} ellipsizeMode="tail">
          {app.appName}
        </Text>
        <View style={styles.topAppBarTrack}>
          <View style={[styles.topAppBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={styles.topAppDuration}>{formatTopAppDurationMs(app.foregroundTimeMs)}</Text>
    </View>
  );
}

export default function ScreenBalanceDetailsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ScreenBalanceStats | null>(null);
  const { supported, snapshot, refresh, requestAccess } = useScreenUsage();
  const {
    enabled: smartResetRemindersEnabled,
    loading: smartResetRemindersLoading,
    notificationsGranted: smartResetNotificationsGranted,
    refresh: refreshSmartResetReminders,
    toggle: toggleSmartResetReminders,
  } = useSmartResetReminderSetting(user?.uid);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadScreenBalanceStats(user?.uid).then(s => {
        if (active) setStats(s);
      });
      void refresh();
      void refreshSmartResetReminders();
      return () => {
        active = false;
      };
    }, [user?.uid, refresh, refreshSmartResetReminders]),
  );

  const onEnable = () => {
    Alert.alert('Screen Balance', ENABLE_EXPLAINER, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Continue to Settings', onPress: () => void requestAccess() },
    ]);
  };

  const hasPermission = snapshot?.hasPermission ?? false;
  const sessionKind: 'current' | 'last' | null =
    snapshot?.currentSessionAvailable && snapshot.currentSessionMs != null
      ? 'current'
      : snapshot?.lastSessionMs != null
        ? 'last'
        : null;
  const sessionMs =
    sessionKind === 'current' ? (snapshot?.currentSessionMs ?? null)
    : sessionKind === 'last' ? (snapshot?.lastSessionMs ?? null)
    : null;

  const topApps = snapshot?.topAppsToday ?? [];
  const topAppsMaxMs = topApps[0]?.foregroundTimeMs ?? 1;
  const topAppsState = selectTopAppsSectionState(snapshot);

  return (
    <ScreenShell safeBottom pillar="reset" ambient={<AmbientBackground subtle />}>
      <ScreenHeader
        title="Screen Balance"
        subtitle="Understand your screen habits and take intentional breaks."
        showBack
        subtitleLines={2}
      />

      {!supported && (
        <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
          <Text style={styles.unsupportedText}>
            Real screen-time tracking isn&apos;t available on this device yet. Your resets below still count.
          </Text>
        </GlassCard>
      )}

      {supported && !hasPermission && (
        <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
          <Text style={styles.title}>Enable Screen Balance</Text>
          <Text style={styles.body}>
            See your real screen time and session length here, and get timely reset suggestions.
          </Text>
          <View style={styles.ctaWrap}>
            <GradientCTA label="Enable Screen Balance" compact textColor="#03212C" onPress={onEnable} />
          </View>
        </GlassCard>
      )}

      {supported && hasPermission && (
        <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.hero}>
            {snapshot?.screenTimeTodayMs != null ? formatScreenTimeMs(snapshot.screenTimeTodayMs) : '—'}
          </Text>
          <Text style={styles.heroCaption}>Screen time</Text>

          {sessionMs != null && sessionKind && (
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>
                {sessionKind === 'current' ? 'Current session' : 'Last session'}
              </Text>
              <Text style={styles.sessionValue}>{formatScreenTimeMs(sessionMs)}</Text>
            </View>
          )}
        </GlassCard>
      )}

      <View style={{ marginTop: SPACING.section }}>
        <SectionLabel first>TODAY&apos;S BALANCE</SectionLabel>
        <GlassCard style={{ ...SHADOWS.small }}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Resets</Text>
            <Text style={styles.statValue}>{stats?.resetsCompletedToday ?? 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Offline</Text>
            <Text style={styles.statValue}>{stats?.offlineMinutesToday ?? 0} min</Text>
          </View>
          {stats?.lastResetType && (
            <>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Last reset</Text>
                <Text style={styles.statValue}>{RESET_TYPE_LABELS[stats.lastResetType]}</Text>
              </View>
            </>
          )}
        </GlassCard>
      </View>

      {supported && hasPermission && (
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>MOST USED TODAY</SectionLabel>
          <GlassCard style={{ ...SHADOWS.small }}>
            {topAppsState.kind === 'unavailable' ? (
              <Text style={styles.topAppsEmptyText}>Usage data unavailable right now.</Text>
            ) : topAppsState.kind === 'empty' ? (
              <Text style={styles.topAppsEmptyText}>No app usage yet today.</Text>
            ) : (
              topApps.map((app, index) => (
                <View key={app.packageName}>
                  <TopAppRow app={app} maxMs={topAppsMaxMs} />
                  {index < topApps.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </GlassCard>
        </View>
      )}

      {supported && hasPermission && (
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>APP SWITCHING</SectionLabel>
          <GlassCard style={{ ...SHADOWS.small }}>
            {!snapshot?.appSwitchingAvailable || snapshot.appSwitchesLast60Min == null ? (
              <Text style={styles.topAppsEmptyText}>Recent switching data unavailable.</Text>
            ) : (
              <>
                <Text style={styles.hero}>{snapshot.appSwitchesLast60Min}</Text>
                <Text style={styles.heroCaption}>switches in the last hour</Text>
                <Text style={styles.switchingBody}>
                  {snapshot.appSwitchesLast60Min >= APP_SWITCH_HIGH_THRESHOLD
                    ? "You've been moving between apps frequently."
                    : 'Your recent app switching looks steady.'}
                </Text>
              </>
            )}
          </GlassCard>
        </View>
      )}

      {supported && (
        <View style={{ marginTop: SPACING.section }}>
          <SectionLabel first>SMART RESET REMINDERS</SectionLabel>
          <GlassCard style={{ ...SHADOWS.small }}>
            <View style={styles.reminderRow}>
              <View style={styles.reminderText}>
                <Text style={styles.reminderTitle}>Smart Reset Reminders</Text>
                <Text style={styles.reminderBody}>
                  Get a gentle reminder when a long screen session or frequent app switching suggests it may be time for a reset.
                </Text>
              </View>
              <Switch
                value={smartResetRemindersEnabled}
                disabled={!hasPermission || smartResetRemindersLoading}
                onValueChange={next => void toggleSmartResetReminders(next)}
                trackColor={{ false: 'rgba(255,255,255,0.16)', true: ACCENT + '80' }}
                thumbColor={smartResetRemindersEnabled ? ACCENT : 'rgba(245,247,251,0.8)'}
              />
            </View>
            {!hasPermission && (
              <Text style={styles.reminderUnavailable}>Enable Usage Access before turning reminders on.</Text>
            )}
            {hasPermission && !smartResetNotificationsGranted && (
              <Text style={styles.reminderUnavailable}>Notifications are off. Turn this on to request permission.</Text>
            )}
          </GlassCard>
        </View>
      )}

      <View style={styles.privacyRow}>
        {hasPermission ? (
          <LockKeyhole size={13} color="rgba(245,247,251,0.4)" strokeWidth={2} />
        ) : (
          <ShieldCheck size={13} color="rgba(245,247,251,0.4)" strokeWidth={2} />
        )}
        <Text style={styles.privacyText}>Screen usage and app activity are processed on this device.</Text>
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sessionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  unsupportedText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  ctaWrap: {
    marginTop: 14,
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
  topAppsEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    paddingVertical: 4,
  },
  switchingBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: 10,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderText: {
    flex: 1,
    minWidth: 0,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  reminderBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  reminderUnavailable: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(245,247,251,0.48)',
    marginTop: 12,
  },
  topAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  monogram: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  monogramText: {
    fontSize: 14,
    fontWeight: '800',
  },
  topAppInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  topAppName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  topAppBarTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  topAppBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  topAppDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    flexShrink: 0,
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
