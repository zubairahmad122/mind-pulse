import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  ChevronRight,
  LockKeyhole,
  MoonStar,
  Pause,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ResetPickerSheet } from '@/components/home/ResetPickerSheet';
import { MiniTrendStrip, type TrendPoint } from '@/components/home/MiniTrendStrip';
import { colors } from '@/constants/colors';
import { APP_SWITCH_HIGH_THRESHOLD } from '@/constants/screenBalance';
import { FONTS, PILLAR_COLORS, SHADOWS } from '@/constants/designSystem';
import { useAuth } from '@/context/AuthContext';
import { useScreenUsage } from '@/hooks/useScreenUsage';
import { useDigitalSunsetSetting } from '@/hooks/useDigitalSunsetSetting';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import { useSmartResetReminderSetting } from '@/hooks/useSmartResetReminderSetting';
import {
  loadScreenBalanceStats,
  type ResetType,
  type ScreenBalanceStats,
} from '@/services/screenBalancePersistence';
import {
  loadFocusBlockState,
  type FocusBlockState,
} from '@/services/focusBlockPersistence';
import { getDailyHistory } from '@/services/screenBalanceHistoryPersistence';
import { getScreenTimeHistory, WEEKLY_TRENDS_DAYS } from '@/services/screenUsageService';
import type { AppUsageItem } from '@/types/screenUsage.types';
import { formatScreenTimeMs, formatTopAppDurationMs } from '@/utils/screenUsageFormat';
import { selectTopAppsSectionState } from '@/utils/topAppsSection';
import { buildWeeklyTrends, type WeeklyTrends } from '@/utils/weeklyTrends';
import { ROUTES } from '@/constants/routes';

const ACCENT = PILLAR_COLORS.reset;
const VIOLET = PILLAR_COLORS.mind;
const CYAN = PILLAR_COLORS.eye;
const AMBER = '#F3B74D';
const CTA_TEXT = '#03212C';
/** Focus's "today" bar — violet→blue, matching the Home Featured card's Focus tab. */
const FOCUS_TODAY_GRADIENT = ['#7B5CFF', '#6C63FF'] as const;
const CTA_GLOW = 'rgba(108,99,255,0.22)';
/** Local, not `SPACING.section` (32, frozen app-wide) — this screen's own
 * density pass tightens its section rhythm without touching the shared
 * token other screens (including Home) still rely on. */
const SECTION_GAP = 22;
/** Shared CTA height for this screen's primary buttons — shorter than
 * `GradientCTA`'s own 56dp default, passed per-instance rather than
 * changed on the shared component. */
const CTA_HEIGHT = 48;

/**
 * Base glass tint per card level — this is the actual fix for the screen
 * "feeling flat/gray": every `TintedSurface` used to omit `GlassCard`'s
 * `tint` prop entirely, silently falling back to the app-wide flat neutral
 * fill (`SURFACE_TINT.card`, `rgba(255,255,255,0.05)`) with only a very
 * faint colored gradient washed on top — so no matter how the wash was
 * tuned, the *surface itself* still read as generic gray. These three tiers
 * are real navy/indigo fills (same family as the Home Featured card),
 * matching the "hero strongest, focus/week medium, tools/apps/switching
 * dark supporting" hierarchy from the level-3 spec.
 */
const HERO_TINT = ['#251E54', '#151130'] as const;
const MEDIUM_TINT = ['#1E1842', '#120F28'] as const;
const SUPPORT_TINT = ['#191436', '#100D24'] as const;

/**
 * Ambient ombre wash per card level, layered over the tint above. Full-bleed
 * (`StyleSheet.absoluteFill`, no inner box) so there's never a hard-edged
 * seam where a smaller glow rectangle would otherwise cut off against the
 * flat fill around it — the same fix applied to the Home Featured card and
 * the reset sheet.
 */
const SURFACE_GRADIENTS = {
  focus: ['rgba(123,92,255,0.14)', 'rgba(108,99,255,0.05)', 'rgba(255,255,255,0.02)'] as const,
  tools: ['rgba(123,92,255,0.05)', 'rgba(255,255,255,0.015)'] as const,
  week: ['rgba(77,225,193,0.09)', 'rgba(123,92,255,0.05)', 'rgba(255,255,255,0.015)'] as const,
  apps: ['rgba(61,232,208,0.06)', 'rgba(123,92,255,0.03)', 'rgba(255,255,255,0.015)'] as const,
  switching: ['rgba(108,99,255,0.05)', 'rgba(123,92,255,0.04)', 'rgba(255,255,255,0.015)'] as const,
} as const;

/** Feature/supporting card surface: glass card (real navy tint, not the flat
 * neutral default) + a subtle colored wash on top. */
function TintedSurface({
  children,
  gradient,
  tint = SUPPORT_TINT,
  style,
}: {
  children: React.ReactNode;
  gradient: readonly [string, string, ...string[]];
  /** Base fill — defaults to the darkest ("dark supporting") tier. */
  tint?: readonly [string, string];
  style?: ViewStyle;
}) {
  return (
    <GlassCard noPadding tint={tint} style={style}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tintedInner}>{children}</View>
    </GlassCard>
  );
}

/** Equal-width, center-aligned insight recap — same pattern as the Home
 * Featured card's InsightStrip. No dividers, no pills; whitespace only. */
function InsightStrip({ items }: { items: { value: string; label: string }[] }) {
  return (
    <View style={styles.insightStrip}>
      {items.map(item => (
        <View key={item.label} style={styles.insightCol}>
          <Text style={styles.insightValue} numberOfLines={1}>
            {item.value}
          </Text>
          <Text style={styles.insightLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

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

function TopAppRow({ app, maxMs, index }: { app: AppUsageItem; maxMs: number; index: number }) {
  const color = monogramColorFor(app.packageName);
  const letter = app.appName.trim().charAt(0).toUpperCase() || '?';
  const barWidth = Math.max((app.foregroundTimeMs / maxMs) * 100, 6);
  // The top row reads at full strength; the rest stay restrained so the
  // list doesn't turn into a wall of equally-bright colors.
  const barColor = index === 0 ? color : color + 'B3';

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
          <View style={[styles.topAppBarFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
        </View>
      </View>
      <Text style={styles.topAppDuration}>{formatTopAppDurationMs(app.foregroundTimeMs)}</Text>
    </View>
  );
}

/** Ghost / text-link secondary action, matching Home & the rest of MindPulse. */
function SecondaryLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={styles.secondaryLink}
    >
      <Text style={styles.secondaryLinkText}>{label}</Text>
      <ArrowRight size={14} color="rgba(214,250,241,0.78)" strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

/** Compact Quick Tools row — icon, title, subtitle, optional trailing control/chevron. */
function ToolRow({
  icon,
  title,
  subtitle,
  note,
  onPress,
  right,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  note?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  /** Accent for the tinted icon container (teal / cyan / amber). */
  accent?: string;
}) {
  const content = (
    <>
      <View
        style={[
          styles.toolIcon,
          accent ? { backgroundColor: accent + '12', borderColor: accent + '2E', borderTopColor: 'rgba(255,255,255,0.15)' } : null,
        ]}
      >
        {icon}
      </View>
      <View style={styles.toolText}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSubtitle}>{subtitle}</Text>
        {note ? <Text style={styles.toolNote}>{note}</Text> : null}
      </View>
      {right}
      {onPress ? <ChevronRight size={17} color="rgba(255,255,255,0.3)" strokeWidth={2.4} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.toolRow}>{content}</View>;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={styles.toolRow}
    >
      {content}
    </TouchableOpacity>
  );
}

export default function ScreenBalanceDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<ScreenBalanceStats | null>(null);
  const [focusState, setFocusState] = useState<FocusBlockState | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrends | null>(null);
  const [showResetPicker, setShowResetPicker] = useState(false);
  const { schedule: sleepSchedule } = useSleepSchedule(user?.uid, user?.isAnonymous ?? true);
  const {
    summary: digitalSunsetSummary,
    loading: digitalSunsetLoading,
    toggle: toggleDigitalSunset,
    refresh: refreshDigitalSunset,
  } = useDigitalSunsetSetting(user?.uid, sleepSchedule);
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
      void loadFocusBlockState(user?.uid).then(s => {
        if (active) setFocusState(s);
      });
      void Promise.all([
        getScreenTimeHistory(WEEKLY_TRENDS_DAYS),
        getDailyHistory(user?.uid, WEEKLY_TRENDS_DAYS),
      ]).then(([screenTimeHistory, dailyHistory]) => {
        if (active) setWeeklyTrends(buildWeeklyTrends(screenTimeHistory, dailyHistory));
      });
      void refresh();
      void refreshSmartResetReminders();
      void refreshDigitalSunset();
      return () => {
        active = false;
      };
    }, [user?.uid, refresh, refreshSmartResetReminders, refreshDigitalSunset]),
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
  const focusStats = focusState?.todayStats;
  const hasActiveFocus = focusState?.activeFocusSession != null || focusState?.pendingCompletion != null;
  const hasFocusActivity =
    (focusStats?.focusMinutesToday ?? 0) > 0 || (focusStats?.focusBlocksToday ?? 0) > 0;
  const sunsetSettings = digitalSunsetSummary?.settings;
  const sunsetEnabled = Boolean(sunsetSettings?.digitalSunsetEnabled && digitalSunsetSummary?.notificationsGranted);
  const sunsetOffset = sunsetSettings?.digitalSunsetOffsetMinutes ?? 60;

  // Hero insight strip — Session / Top App / Switches, matching the Home
  // Featured card's InsightStrip. "—" for anything unavailable, never fabricated.
  const topAppName = topApps[0]?.appName ?? null;
  const switchesCount = snapshot?.appSwitchesLast60Min ?? null;

  // Same 7-day source `weeklyTrends` already fetches for "This Week" — reused
  // here for the hero chart and again for Focus Today's chart, rather than
  // issuing a second fetch. `screenTimeMs`/`focusMinutes` days that weren't
  // available come back `null`/`0` respectively (never fabricated).
  const screenTrendPoints: TrendPoint[] | null =
    weeklyTrends?.days.map(d => ({ key: d.date, dayLabel: d.label, value: d.screenTimeMs, isToday: d.isToday })) ?? null;
  const focusTrendPoints: TrendPoint[] | null =
    weeklyTrends?.days.map(d => ({ key: d.date, dayLabel: d.label, value: d.focusMinutes, isToday: d.isToday })) ?? null;

  // Last reset detail lives in Quick Tools, not the hero.
  const lastResetLabel = stats?.lastResetType
    ? `Last reset · ${RESET_TYPE_LABELS[stats.lastResetType]}`
    : undefined;

  const smartResetNote =
    !hasPermission
      ? 'Enable Usage Access before turning reminders on.'
      : hasPermission && !smartResetNotificationsGranted
        ? 'Notifications off'
        : undefined;

  return (
    <ScreenShell bannerAd safeBottom pillar="reset" ambient={<AmbientBackground subtle />}>
      <ScreenHeader
        title="Screen Balance"
        subtitle="See your screen habits and reset with intention."
        showBack
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
            <GradientCTA label="Enable Screen Balance" compact textColor={CTA_TEXT} onPress={onEnable} />
          </View>
        </GlassCard>
      )}

      {/* ── 1. Hero Summary — same navy-glass system as the Home Featured
          Balance card, so tapping into this screen feels like its expanded
          detail view, not a different product. ─────────────────────────── */}
      {supported && hasPermission && (
        <GlassCard
          noPadding
          tint={HERO_TINT}
          style={{ marginTop: 4, borderColor: 'rgba(255,255,255,0.08)', ...SHADOWS.small }}
        >
          {/* Ambient depth — cyan glow behind the metric up top, a
              barely-there violet echo low down. Full-bleed (no inner box)
              so there's no hard-edged seam, the same fix already applied to
              the Home Featured card and the reset sheet. */}
          <LinearGradient
            colors={['rgba(77,225,193,0.14)', 'rgba(77,225,193,0.04)', 'rgba(77,225,193,0)']}
            locations={[0, 0.5, 0.8]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(123,92,255,0)', 'rgba(123,92,255,0.03)', 'rgba(123,92,255,0.09)']}
            locations={[0.5, 0.8, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.heroInner}>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.hero}>
              {snapshot?.screenTimeTodayMs != null ? formatScreenTimeMs(snapshot.screenTimeTodayMs) : '—'}
            </Text>
            <Text style={styles.heroCaption}>Screen time today</Text>

            {sessionMs != null && sessionKind && (
              <Text style={styles.sessionLine}>
                {sessionKind === 'current' ? 'Current session' : 'Last session'} ·{' '}
                <Text style={styles.sessionValue}>{formatScreenTimeMs(sessionMs)}</Text>
              </Text>
            )}

            <InsightStrip
              items={[
                { value: sessionMs != null ? formatScreenTimeMs(sessionMs) : '—', label: 'Session' },
                { value: topAppName ?? '—', label: 'Top App' },
                { value: switchesCount != null ? String(switchesCount) : '—', label: 'Switches' },
              ]}
            />

            {screenTrendPoints ? (
              <MiniTrendStrip variant="live" points={screenTrendPoints} accent={ACCENT} formatValue={formatScreenTimeMs} compact />
            ) : null}

            <View style={styles.ctaWrap}>
              <GradientCTA
                label="Take a Reset"
                textColor={CTA_TEXT}
                glowColor={CTA_GLOW}
                height={CTA_HEIGHT}
                onPress={() => setShowResetPicker(true)}
              />
            </View>
            <View style={styles.heroSecondaryWrap}>
              <SecondaryLink
                label="View Weekly Trends"
                onPress={() => router.push(ROUTES.appScreenBalanceWeeklyTrends as never)}
              />
            </View>
          </View>
        </GlassCard>
      )}

      {/* ── 2. Focus Today ──────────────────────────────────────────────── */}
      <View style={{ marginTop: SECTION_GAP }}>
        <SectionLabel first>FOCUS TODAY</SectionLabel>
        <TintedSurface gradient={SURFACE_GRADIENTS.focus} tint={MEDIUM_TINT} style={{ ...SHADOWS.small }}>
          {hasFocusActivity || hasActiveFocus ? (
            <>
              <View style={styles.focusCardHeader}>
                <View style={[styles.focusIconWrap, { backgroundColor: VIOLET + '16', borderColor: VIOLET + '34' }]}>
                  <TimerReset size={20} color={VIOLET} strokeWidth={1.8} />
                </View>
                <View style={styles.focusSummary}>
                  <Text style={styles.focusMinutes}>{focusStats?.focusMinutesToday ?? 0} min</Text>
                  <Text style={styles.heroCaption}>focused today</Text>
                </View>
              </View>
              <Text style={styles.focusInlineStats}>
                {focusStats?.focusBlocksToday ?? 0} block{(focusStats?.focusBlocksToday ?? 0) === 1 ? '' : 's'} · Longest{' '}
                {focusStats?.longestFocusBlockMinutes ?? 0} min
              </Text>
              {focusStats?.lastFocusGoal ? (
                <Text style={styles.focusLastGoal} numberOfLines={1}>
                  Last goal · {focusStats.lastFocusGoal}
                </Text>
              ) : null}
              {focusTrendPoints ? (
                <MiniTrendStrip
                  variant="live"
                  points={focusTrendPoints}
                  accent={VIOLET}
                  formatValue={v => `${Math.round(v)} min`}
                  todayGradient={FOCUS_TODAY_GRADIENT}
                  compact
                />
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.focusEmptyTitle}>Ready to focus?</Text>
              <Text style={styles.focusEmptyBody}>Choose one task and give it 25 focused minutes.</Text>
              <Text style={styles.focusDurations}>15 · 25 · 45 min</Text>
              <Text style={styles.focusTrendHint}>Your focus trend will appear after your first block.</Text>
            </>
          )}
          <View style={styles.ctaWrap}>
            <GradientCTA
              label={hasActiveFocus ? 'Resume Focus' : 'Start Focus'}
              textColor={CTA_TEXT}
              glowColor={CTA_GLOW}
              height={CTA_HEIGHT}
              onPress={() => router.push(ROUTES.appFocusBlock as never)}
            />
          </View>
        </TintedSurface>
      </View>

      {/* ── 3. Quick Tools — Reset + the two automation toggles, compact ── */}
      <View style={{ marginTop: SECTION_GAP }}>
        <SectionLabel first>QUICK TOOLS</SectionLabel>
        <TintedSurface gradient={SURFACE_GRADIENTS.tools} style={{ ...SHADOWS.small }}>
          <ToolRow
            icon={<Pause size={20} color={ACCENT} strokeWidth={2} fill={ACCENT} />}
            title="Reset"
            subtitle="Eye, breathe, move, or go offline"
            note={lastResetLabel}
            accent={ACCENT}
            onPress={() => setShowResetPicker(true)}
          />
          <View style={styles.divider} />
          <ToolRow
            icon={<Sparkles size={20} color={CYAN} strokeWidth={1.9} />}
            title="Smart Reset Reminders"
            subtitle="Gentle reminders during long screen sessions."
            note={smartResetNote}
            accent={CYAN}
            right={
              <Switch
                value={smartResetRemindersEnabled}
                disabled={!hasPermission || smartResetRemindersLoading}
                onValueChange={next => void toggleSmartResetReminders(next)}
                trackColor={{ false: 'rgba(255,255,255,0.16)', true: CYAN + '80' }}
                thumbColor={smartResetRemindersEnabled ? CYAN : 'rgba(245,247,251,0.8)'}
                accessibilityLabel="Smart Reset Reminders"
              />
            }
          />
          <View style={styles.divider} />
          <ToolRow
            icon={<MoonStar size={20} color={AMBER} strokeWidth={1.9} />}
            title="Digital Sunset"
            subtitle={sunsetEnabled ? `${sunsetOffset} min before bedtime` : 'Tap to configure'}
            note={
              sunsetEnabled && !digitalSunsetSummary?.notificationsGranted
                ? 'Notifications off'
                : undefined
            }
            accent={AMBER}
            onPress={() => router.push(ROUTES.appDigitalSunset as never)}
            right={
              <Switch
                value={sunsetEnabled}
                disabled={digitalSunsetLoading}
                onValueChange={next => void toggleDigitalSunset(next)}
                trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(243,183,77,0.72)' }}
                thumbColor={sunsetEnabled ? AMBER : 'rgba(245,247,251,0.8)'}
                accessibilityLabel="Digital Sunset"
              />
            }
          />
        </TintedSurface>
      </View>

      {/* ── 4. This Week — compact preview, secondary weight ────────────── */}
      {weeklyTrends && (
        <View style={{ marginTop: SECTION_GAP }}>
          <SectionLabel first>THIS WEEK</SectionLabel>
          <TintedSurface gradient={SURFACE_GRADIENTS.week} tint={MEDIUM_TINT} style={{ ...SHADOWS.small }}>
            <Text style={styles.weekHero}>
              {weeklyTrends.hasScreenTimePermission ? formatScreenTimeMs(weeklyTrends.totals.screenTimeMs) : '—'}{' '}
              <Text style={styles.weekHeroCaption}>screen time</Text>
            </Text>
            {/* No second copy of the 7-day screen-time chart here — the Hero
                card above already shows it. This card's own job is the
                weekly total + the Focus/Offline/Resets breakdown, neither
                of which the Hero has. */}
            <InsightStrip
              items={[
                { value: `${weeklyTrends.totals.focusMinutes}m`, label: 'Focus' },
                { value: `${weeklyTrends.totals.offlineMinutes}m`, label: 'Offline' },
                { value: String(weeklyTrends.totals.resetsCompleted), label: 'Resets' },
              ]}
            />
            <View style={styles.weekActionWrap}>
              <SecondaryLink
                label="View trends"
                onPress={() => router.push(ROUTES.appScreenBalanceWeeklyTrends as never)}
              />
            </View>
          </TintedSurface>
        </View>
      )}

      {/* ── 5. Most Used Today — compact list, unchanged rows ───────────── */}
      {supported && hasPermission && (
        <View style={{ marginTop: SECTION_GAP }}>
          <SectionLabel first>MOST USED TODAY</SectionLabel>
          <TintedSurface gradient={SURFACE_GRADIENTS.apps} style={{ ...SHADOWS.small }}>
            {topAppsState.kind === 'unavailable' ? (
              <Text style={styles.topAppsEmptyText}>Usage data unavailable right now.</Text>
            ) : topAppsState.kind === 'empty' ? (
              <Text style={styles.topAppsEmptyText}>No app usage yet today.</Text>
            ) : (
              topApps.map((app, index) => (
                <View key={app.packageName}>
                  <TopAppRow app={app} maxMs={topAppsMaxMs} index={index} />
                  {index < topApps.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </TintedSurface>
        </View>
      )}

      {/* ── 6. App Switching — one-line metric + interpretation ─────────── */}
      {supported && hasPermission && (
        <View style={{ marginTop: SECTION_GAP }}>
          <SectionLabel first>APP SWITCHING</SectionLabel>
          <TintedSurface gradient={SURFACE_GRADIENTS.switching} style={{ ...SHADOWS.small }}>
            {!snapshot?.appSwitchingAvailable || snapshot.appSwitchesLast60Min == null ? (
              <Text style={styles.topAppsEmptyText}>Recent switching data unavailable.</Text>
            ) : (
              <View style={styles.switchingRow}>
                <View style={styles.switchingCol}>
                  <Text style={styles.switchingNumber}>{snapshot.appSwitchesLast60Min}</Text>
                  <Text style={styles.switchingLabel}>
                    switch{snapshot.appSwitchesLast60Min === 1 ? '' : 'es'} in the last hour
                  </Text>
                </View>
                <View style={styles.switchingStatusPill}>
                  <Text style={styles.switchingStatusText}>
                    {snapshot.appSwitchesLast60Min >= APP_SWITCH_HIGH_THRESHOLD ? 'Frequent' : 'Steady'}
                  </Text>
                </View>
              </View>
            )}
          </TintedSurface>
        </View>
      )}

      {/* ── Privacy footer ──────────────────────────────────────────────── */}
      <View style={styles.privacyRow}>
        {hasPermission ? (
          <LockKeyhole size={13} color="rgba(245,247,251,0.4)" strokeWidth={2} />
        ) : (
          <ShieldCheck size={13} color="rgba(245,247,251,0.4)" strokeWidth={2} />
        )}
        <Text style={styles.privacyText}>Screen usage and app activity are processed on this device.</Text>
      </View>

      <ResetPickerSheet
        visible={showResetPicker}
        onClose={() => setShowResetPicker(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  tintedInner: {
    padding: 16,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(214,250,241,0.68)',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroInner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  hero: {
    fontFamily: FONTS.heading,
    fontSize: 40,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  heroCaption: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  sessionLine: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sessionValue: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT,
  },
  insightStrip: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  insightCol: {
    flex: 1,
    alignItems: 'center',
  },
  insightValue: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  insightLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(245,247,251,0.4)',
    marginTop: 2,
    textAlign: 'center',
  },
  ctaWrap: {
    marginTop: 12,
  },
  heroSecondaryWrap: {
    marginTop: 4,
    alignItems: 'center',
  },
  secondaryLink: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(214,250,241,0.78)',
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
  focusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  focusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: VIOLET + '16',
    borderWidth: 1,
    borderColor: VIOLET + '34',
  },
  focusSummary: {
    flex: 1,
    minWidth: 0,
  },
  focusMinutes: {
    fontFamily: FONTS.headingSemi,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  focusInlineStats: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.6)',
  },
  focusLastGoal: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.5)',
  },
  focusEmptyTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  focusEmptyBody: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  focusDurations: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(61,232,208,0.7)',
  },
  focusTrendHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(245,247,251,0.4)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    flexShrink: 0,
  },
  toolText: {
    flex: 1,
    minWidth: 0,
  },
  toolTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text.primary,
  },
  toolSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.secondary,
    marginTop: 1,
  },
  toolNote: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(245,247,251,0.48)',
    marginTop: 2,
  },
  weekHero: {
    fontFamily: FONTS.headingSemi,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  weekHeroCaption: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  weekActionWrap: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  topAppsEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    paddingVertical: 4,
  },
  switchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchingCol: {
    flexShrink: 1,
  },
  switchingNumber: {
    fontFamily: FONTS.headingSemi,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  switchingLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 1,
  },
  switchingStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  switchingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: 'rgba(245,247,251,0.65)',
  },
  topAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    minHeight: 50,
  },
  monogram: {
    width: 34,
    height: 34,
    borderRadius: 11,
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
    gap: 4,
  },
  topAppName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.text.primary,
  },
  topAppBarTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
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
    marginTop: SECTION_GAP,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 11.5,
    color: 'rgba(245,247,251,0.4)',
  },
});
