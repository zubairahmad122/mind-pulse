import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowRight, TimerReset } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { MiniTrendStrip, type TrendPoint } from '@/components/home/MiniTrendStrip';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, RADIUS } from '@/constants/designSystem';
import { ROUTES } from '@/constants/routes';
import { useScreenUsage } from '@/hooks/useScreenUsage';
import { loadScreenBalanceStats, type ScreenBalanceStats } from '@/services/screenBalancePersistence';
import { loadDigitalSunsetSummary, formatHHMMForDisplay, type DigitalSunsetSummary } from '@/services/digitalSunset';
import { getFocusRemainingMs, loadFocusBlockState, type FocusBlockState } from '@/services/focusBlockPersistence';
import { getDailyHistory } from '@/services/screenBalanceHistoryPersistence';
import { getScreenTimeHistory } from '@/services/screenUsageService';
import { selectScreenBalanceCardState } from '@/utils/screenBalanceCard';
import { getScreenBalanceSuggestion } from '@/utils/screenBalanceSuggestion';
import { formatScreenTimeMs, formatSpokenDurationMs } from '@/utils/screenUsageFormat';

const TEAL = PILLAR_COLORS.reset;
const VIOLET = PILLAR_COLORS.mind;
/** Focus tab's "today" bar — violet→blue, distinct from Balance's cyan→blue. */
const FOCUS_TODAY_GRADIENT = ['#9D5CFF', '#5A9EFF'] as const;
/** Purely illustrative duration hint on the empty Focus state — not a control, matches FocusBlockScreen's own presets. */
const FOCUS_DURATION_PRESETS = [15, 25, 45] as const;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'YYYY-MM-DD' → 'Mon' / 'Tue' / … for the trend chart's day labels. */
function toDayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return WEEKDAY_SHORT[d.getDay()] ?? '';
}

type Mode = 'balance' | 'focus';

/**
 * Deliberate second exception to "every card uses the flat neutral fill"
 * (GlassCard's doc comment names the Hero card as the only other one) — the
 * Featured module needs its own identity so it doesn't read as a second Hero
 * card. Dark navy glass, not the Hero's violet gradient, not the flat card fill.
 *
 * Bright enough to read as its own surface: the app's global background
 * (`BACKGROUND.overlay`, `#131028`→`#0C0B17`) sits in almost exactly this
 * same dark range, so an earlier, darker version of this tint (`#121A34`→
 * `#0A0E1F`) was visually indistinguishable from the bare screen behind it —
 * the card had no real color of its own, just a border outline.
 */
const NAVY_TINT = ['#1C2A50', '#111A36'] as const;

/** mm:ss clock for active/paused Focus — same shape as FocusBlockScreen. */
function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Compact segmented control — switches the card content in place, not navigation. */
function SegmentedControl({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.segmentTrack} accessibilityRole="tablist">
      {(['balance', 'focus'] as const).map(m => {
        const active = mode === m;
        const accent = m === 'balance' ? TEAL : VIOLET;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m === 'balance' ? 'Balance' : 'Focus'}
            hitSlop={{ top: 8, bottom: 8 }}
            style={[
              styles.segmentBtn,
              active ? { backgroundColor: accent + '20', borderColor: accent + '4A', borderTopColor: accent + '66' } : null,
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {m === 'balance' ? 'BALANCE' : 'FOCUS'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type FooterActionKind = 'view' | 'reset';

/**
 * Primary footer action — ~60% of the row, restrained cyan→blue gradient
 * (deliberately less saturated than `BUTTON.primaryGradient`, since a
 * full-bloom hero-style CTA reads too loud next to this compact glass
 * card), dark navy text, small top sheen, soft shadow. Mirrors
 * `GradientCTA`'s press-scale pattern locally since this button needs a
 * smaller radius/text size than the app-wide `GradientCTA` exposes.
 */
function FooterPrimaryButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <Animated.View style={[styles.footerPrimaryShell, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <LinearGradient
          colors={['#3FBEDE', '#4C86E6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.footerPrimaryFill}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.footerPrimarySheen}
          />
          <Text style={styles.footerPrimaryText} numberOfLines={1}>{label}</Text>
          <ArrowRight size={16} color="#03212C" strokeWidth={2.6} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Secondary footer action — ~40% of the row, dark translucent navy/indigo
 * glass with a low-opacity teal border. Same height/radius family as the
 * primary button so the pair reads as one designed footer, not a button
 * next to loose text. */
function FooterSecondaryButton({ label, onPress, accessibilityLabel, kind }: { label: string; onPress: () => void; accessibilityLabel: string; kind: FooterActionKind }) {
  return (
    <TouchableOpacity
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.footerSecondary}
    >
      {kind === 'reset' ? (
        <TimerReset size={15} color="rgba(211,250,255,0.85)" strokeWidth={2.3} />
      ) : (
        <ArrowRight size={15} color="rgba(211,250,255,0.85)" strokeWidth={2.3} />
      )}
      <Text style={styles.footerSecondaryText} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/** The card's one dual-action footer — primary (stronger) always in the
 * left/~60% slot, secondary (quieter) always in the right/~40% slot. Which
 * action is primary vs. secondary is decided entirely by the caller (state
 * logic untouched), this just renders whichever pair it's given. */
function CardFooter({
  primary,
  secondary,
}: {
  primary: { label: string; onPress: () => void; accessibilityLabel: string };
  secondary: { label: string; onPress: () => void; accessibilityLabel: string; kind: FooterActionKind };
}) {
  return (
    <View style={styles.footerRow}>
      <FooterPrimaryButton {...primary} />
      <FooterSecondaryButton {...secondary} />
    </View>
  );
}

/** Equal-width, center-aligned real-data recap under the chart — replaces
 * the old text MetaRow. Separated by whitespace, not vertical divider lines
 * (those read as corporate/spreadsheet-y). "—" for anything unavailable,
 * never fabricated. */
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

/**
 * Home FEATURED module — a compact, product-like dashboard card (deliberately
 * distinct from the TodaysJourneyCard hero above it) holding both Screen
 * Balance and Focus, switched by a segmented control. Reuses the exact
 * existing state selection / suggestion / focus services; this is
 * presentation only.
 */
export function FeaturedSection({
  uid,
  onTakeReset,
}: {
  uid?: string;
  /** Opens the existing Home ResetPickerSheet (owned by HomeDashboardScreen). */
  onTakeReset?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('balance');
  const [stats, setStats] = useState<ScreenBalanceStats | null>(null);
  const [sunset, setSunset] = useState<DigitalSunsetSummary | null>(null);
  const [focusState, setFocusState] = useState<FocusBlockState | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[] | null>(null);
  const [focusTrendPoints, setFocusTrendPoints] = useState<TrendPoint[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { supported, snapshot, refresh } = useScreenUsage();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Newly mounted / refocused Home defaults back to the Balance segment.
      setMode('balance');
      void loadScreenBalanceStats(uid).then(s => {
        if (active) setStats(s);
      });
      void loadFocusBlockState(uid).then(s => {
        if (active) {
          setFocusState(s);
          setNow(Date.now());
        }
      });
      const loadSunset = () => {
        void loadDigitalSunsetSummary(uid).then(s => {
          if (active) setSunset(s);
        });
      };
      loadSunset();
      const sunsetTimer = setInterval(loadSunset, 60_000);
      // Feeds the Balance trend chart — same 7-day source as Weekly Trends;
      // unavailable/no-permission days come back as `null` (never
      // fabricated), which the chart renders as an unavailable bar.
      if (supported) {
        void getScreenTimeHistory().then(history => {
          if (!active) return;
          setTrendPoints(
            history.days.map((d, i) => ({
              key: d.date,
              dayLabel: toDayLabel(d.date),
              value: d.screenTimeMs,
              isToday: i === history.days.length - 1,
            })),
          );
        });
      }
      // Feeds the Focus trend chart — MindPulse's own local daily aggregate
      // (not gated by Usage Access), so it's available regardless of `supported`.
      void getDailyHistory(uid).then(days => {
        if (!active) return;
        setFocusTrendPoints(
          days.map((d, i) => ({
            key: d.date,
            dayLabel: toDayLabel(d.date),
            value: d.focusMinutes,
            isToday: i === days.length - 1,
          })),
        );
      });
      void refresh();
      return () => {
        active = false;
        clearInterval(sunsetTimer);
      };
    }, [uid, refresh, supported]),
  );

  // Tick once per second only while a Focus session is live, so the clock stays current.
  useEffect(() => {
    if (focusState?.activeFocusSession?.status !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [focusState]);

  const cardState = selectScreenBalanceCardState({ supported, snapshot });
  const sunsetActive = Boolean(sunset?.settings.digitalSunsetEnabled && sunset.window.active);

  const openDetails = () => router.push(ROUTES.appScreenBalance as never);
  const openSunset = () => router.push(ROUTES.appDigitalSunset as never);
  const openFocus = () => router.push(ROUTES.appFocusBlock as never);
  const openReset = () => onTakeReset?.();

  const suggestion = snapshot
    ? getScreenBalanceSuggestion(snapshot, { lastResetCompletedAt: stats?.lastResetCompletedAt ?? null })
    : { reason: 'none' as const };

  // Real-data-only inputs for the Balance insight strip — "—" stands in for anything unavailable, never a fabricated value.
  const topAppName = snapshot?.topAppsToday?.[0]?.appName ?? null;
  const resetsToday = stats?.resetsCompletedToday ?? 0;

  const focusSession = focusState?.activeFocusSession ?? null;
  const remainingSeconds = focusSession ? Math.ceil(getFocusRemainingMs(focusSession, now) / 1000) : 0;
  const minutesToday = focusState?.todayStats.focusMinutesToday ?? 0;
  const blocksToday = focusState?.todayStats.focusBlocksToday ?? 0;
  const longestToday = focusState?.todayStats.longestFocusBlockMinutes ?? 0;
  const currentGoal = focusSession?.goal || focusState?.todayStats.lastFocusGoal || null;

  // ── Balance mode content ────────────────────────────────────────────────
  const renderBalance = () => {
    // Existing Home priority: an active Digital Sunset window wins.
    if (sunsetActive && sunset) {
      const bedtime = formatHHMMForDisplay(sunset.schedule.bedtime);
      return (
        <View style={styles.content} accessibilityLabel={`Digital Sunset. Time to wind down. Bedtime ${bedtime}.`}>
          <Text style={styles.eyebrow}>DIGITAL SUNSET</Text>
          <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            Time to wind down
          </Text>
          <Text style={styles.metricLabel}>Bedtime · {bedtime}</Text>
          <CardFooter
            primary={{ label: 'Wind Down', onPress: openSunset, accessibilityLabel: 'Wind Down' }}
            secondary={{ label: 'View Balance', onPress: openDetails, accessibilityLabel: 'View Screen Balance', kind: 'view' }}
          />
        </View>
      );
    }

    if (cardState.kind === 'enable') {
      return (
        <View style={styles.content} accessibilityLabel="Screen Balance. Usage tracking is off. Enable tracking to see your daily balance.">
          <Text style={styles.eyebrow}>SCREEN BALANCE</Text>
          <Text style={styles.emptyTitle}>See your screen balance</Text>
          <Text style={styles.body}>Enable tracking to see your daily balance.</Text>
          <MiniTrendStrip variant="ghost" />
          <Text style={styles.capabilityLine}>Screen time · Sessions · Top apps · Resets</Text>
          <CardFooter
            primary={{ label: 'Enable Tracking', onPress: openDetails, accessibilityLabel: 'Enable Tracking' }}
            secondary={{ label: 'Take a Reset', onPress: openReset, accessibilityLabel: 'Take a Reset', kind: 'reset' }}
          />
        </View>
      );
    }

    if (cardState.kind === 'data') {
      const today =
        cardState.screenTimeTodayMs != null ? formatScreenTimeMs(cardState.screenTimeTodayMs) : null;
      const session = cardState.sessionMs != null ? formatScreenTimeMs(cardState.sessionMs) : null;

      // One fixed metric hierarchy for every "data" state — primary = screen
      // time today, secondary = current session — never inverted. Earlier
      // versions swapped the primary number to the session length (or a
      // switch count) whenever `getScreenBalanceSuggestion` flagged frequent
      // switching or a long session, which read as confusing ("34 min" huge,
      // "51 min" small below it). The suggestion now only ever changes which
      // CTA is primary — "state-aware" lives in the action, not the number.
      const elevated =
        suggestion.reason === 'frequent-switching' ||
        suggestion.reason === 'long-session-no-break' ||
        suggestion.reason === 'long-session';

      const switches = suggestion.reason === 'frequent-switching' ? snapshot?.appSwitchesLast60Min ?? null : null;
      const spokenSession = cardState.sessionMs != null ? formatSpokenDurationMs(cardState.sessionMs) : '';
      const spokenToday = cardState.screenTimeTodayMs != null ? formatSpokenDurationMs(cardState.screenTimeTodayMs) : '';
      // The suggestion reason still reaches screen-reader users (and the
      // Digital-Sunset-style "why now" context), it just no longer resizes
      // the visible numbers.
      const elevatedHint =
        switches != null
          ? ` ${switches} app switches in the last hour.`
          : elevated
            ? ` ${spokenSession || 'A long'} current session${spokenToday ? `, ${spokenToday} screen time today` : ''} — a short reset may help.`
            : '';

      return (
        <View
          style={styles.content}
          accessibilityLabel={`Screen Balance. ${today ?? 'Screen time today'}${session ? `, ${session} current session` : ''}.${elevatedHint}`}
        >
          <Text style={styles.eyebrow}>SCREEN BALANCE</Text>
          <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {today ?? '—'}
          </Text>
          <Text style={styles.metricLabel}>Screen time today</Text>
          <Text style={styles.body}>{session ? `Current session · ${session}` : 'Check in on your daily habits.'}</Text>
          {trendPoints ? (
            <MiniTrendStrip variant="live" points={trendPoints} accent={TEAL} formatValue={formatScreenTimeMs} />
          ) : null}
          <InsightStrip
            items={[
              { value: session ?? '—', label: 'Session' },
              { value: topAppName ?? '—', label: 'Top app' },
              { value: String(resetsToday), label: 'Resets' },
            ]}
          />
          {elevated ? (
            <CardFooter
              primary={{ label: 'Take a Reset', onPress: openReset, accessibilityLabel: 'Take a Reset' }}
              secondary={{ label: 'View Balance', onPress: openDetails, accessibilityLabel: 'View Screen Balance', kind: 'view' }}
            />
          ) : (
            <CardFooter
              primary={{ label: 'View Balance', onPress: openDetails, accessibilityLabel: 'View Screen Balance' }}
              secondary={{ label: 'Take a Reset', onPress: openReset, accessibilityLabel: 'Take a Reset', kind: 'reset' }}
            />
          )}
        </View>
      );
    }

    // 'legacy' — unsupported platform, or still loading a snapshot. Resets still work.
    const resets =
      stats && stats.resetsCompletedToday > 0
        ? `${stats.resetsCompletedToday} reset${stats.resetsCompletedToday === 1 ? '' : 's'} today`
        : null;
    return (
      <View style={styles.content} accessibilityLabel={`Screen Balance. ${resets ?? 'Take a reset'}.`}>
        <Text style={styles.eyebrow}>SCREEN BALANCE</Text>
        <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {resets ?? 'Take a reset'}
        </Text>
        <Text style={styles.body}>Eye, breathe, move, or go offline.</Text>
        <CardFooter
          primary={{ label: 'Take a Reset', onPress: openReset, accessibilityLabel: 'Take a Reset' }}
          secondary={{ label: 'View Balance', onPress: openDetails, accessibilityLabel: 'View Screen Balance', kind: 'view' }}
        />
      </View>
    );
  };

  // ── Focus mode content ──────────────────────────────────────────────────
  const renderFocus = () => {
    const focusAccessibility = (detail: string) => `Focus. ${detail}`;

    if (focusSession?.status === 'active') {
      const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
      const elapsed = focusSession.durationSeconds > 0 ? 1 - remainingSeconds / focusSession.durationSeconds : 0;
      return (
        <View style={styles.content} accessibilityLabel={focusAccessibility(`${minutes} minutes remaining. Resume focus.`)}>
          <Text style={styles.eyebrow}>FOCUS</Text>
          <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatClock(remainingSeconds)}
          </Text>
          <Text style={styles.metricLabel}>Remaining</Text>
          {currentGoal ? (
            <Text style={styles.body} numberOfLines={1}>
              Goal · {currentGoal}
            </Text>
          ) : null}
          <ProgressBar progress={elapsed} fill={VIOLET} style={styles.focusProgressTrack} />
          <CardFooter
            primary={{ label: 'Resume Focus', onPress: openFocus, accessibilityLabel: 'Resume Focus' }}
            secondary={{ label: 'View Focus', onPress: openFocus, accessibilityLabel: 'View Focus', kind: 'view' }}
          />
        </View>
      );
    }

    if (focusSession?.status === 'paused') {
      const elapsed = focusSession.durationSeconds > 0 ? 1 - remainingSeconds / focusSession.durationSeconds : 0;
      return (
        <View style={styles.content} accessibilityLabel={focusAccessibility(`Paused. ${formatSpokenDurationMs(remainingSeconds * 1000)} remaining. Resume focus.`)}>
          <Text style={styles.eyebrow}>FOCUS</Text>
          <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            Paused
          </Text>
          <Text style={styles.metricLabel}>{formatClock(remainingSeconds)} remaining</Text>
          {currentGoal ? (
            <Text style={styles.body} numberOfLines={1}>
              Goal · {currentGoal}
            </Text>
          ) : null}
          <ProgressBar progress={elapsed} fill="rgba(157,92,255,0.4)" style={styles.focusProgressTrack} />
          <CardFooter
            primary={{ label: 'Resume Focus', onPress: openFocus, accessibilityLabel: 'Resume Focus' }}
            secondary={{ label: 'View Focus', onPress: openFocus, accessibilityLabel: 'View Focus', kind: 'view' }}
          />
        </View>
      );
    }

    if (focusState && minutesToday > 0) {
      return (
        <View style={styles.content} accessibilityLabel={focusAccessibility(`${minutesToday} minutes focused today. Start another block.`)}>
          <Text style={styles.eyebrow}>FOCUS</Text>
          <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {minutesToday} min
          </Text>
          <Text style={styles.metricLabel}>Focused today</Text>
          {focusTrendPoints ? (
            <MiniTrendStrip
              variant="live"
              points={focusTrendPoints}
              accent={VIOLET}
              formatValue={v => `${Math.round(v)} min`}
              todayGradient={FOCUS_TODAY_GRADIENT}
            />
          ) : null}
          <InsightStrip
            items={[
              { value: `${blocksToday} block${blocksToday === 1 ? '' : 's'}`, label: 'Today' },
              { value: `${longestToday} min`, label: 'Longest' },
            ]}
          />
          <CardFooter
            primary={{ label: 'Start Focus', onPress: openFocus, accessibilityLabel: 'Start Focus' }}
            secondary={{ label: 'View Focus', onPress: openFocus, accessibilityLabel: 'View Focus', kind: 'view' }}
          />
        </View>
      );
    }

    return (
      <View style={styles.content} accessibilityLabel={focusAccessibility('Start a 25 minute focus block.')}>
        <Text style={styles.eyebrow}>FOCUS</Text>
        <Text style={styles.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {focusState ? '25 min' : '—'}
        </Text>
        <Text style={styles.metricLabel}>Ready when you are</Text>
        <View style={styles.durationHintRow}>
          {FOCUS_DURATION_PRESETS.map((m, i) => {
            const active = m === 25;
            return (
              <View key={m} style={styles.durationHintItem}>
                {i > 0 ? <View style={styles.durationHintDot} /> : null}
                <View>
                  <View style={styles.durationHintValueRow}>
                    <Text style={[styles.durationHintValue, active && { color: VIOLET }]}>{m}</Text>
                    <Text style={styles.durationHintUnit}>min</Text>
                  </View>
                  {active ? <View style={styles.durationHintUnderline} /> : null}
                </View>
              </View>
            );
          })}
        </View>
        <CardFooter
          primary={{ label: 'Start Focus', onPress: openFocus, accessibilityLabel: 'Start Focus' }}
          secondary={{ label: 'View Focus', onPress: openFocus, accessibilityLabel: 'View Focus', kind: 'view' }}
        />
      </View>
    );
  };

  return (
    <View>
      <SectionLabel first>FEATURED</SectionLabel>
      <GlassCard noPadding tint={NAVY_TINT} style={styles.card}>
        {/* Fixed ambient depth — cyan glow behind the metric area up top,
            a barely-there violet echo low down. Static regardless of
            Balance/Focus so the card doesn't read as two different surfaces
            when the tab switches; mode identity comes from the segmented
            control and chart accent instead.
            Full card width, no inner box bounds: an earlier version used
            box-sized gradients (e.g. 55%-wide) anchored to one corner, which
            rendered as a visible rectangular seam where the box's own edge
            cut off against the flat fill around it — a hard-edged "panel",
            not a soft glow. Spanning the full width and fading to fully
            transparent well inside the card avoids that edge entirely. */}
        <LinearGradient
          colors={['rgba(0,224,255,0.11)', 'rgba(0,224,255,0.03)', 'rgba(0,224,255,0)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glowTop}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(157,92,255,0)', 'rgba(157,92,255,0.03)', 'rgba(157,92,255,0.09)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glowBottom}
          pointerEvents="none"
        />
        <View style={styles.inner}>
          <SegmentedControl mode={mode} onChange={setMode} />
          {mode === 'balance' ? renderBalance() : renderFocus()}
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card + 2,
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  inner: {
    padding: 16,
  },
  /** Centered, fixed-proportion track (not content-hugging) — its own
   * horizontal center lines up with the card's centered content below it
   * (SCREEN BALANCE label / metric / chart), rather than sitting flush
   * against the card's left padding. Width is a percentage of the card
   * with dp clamps so it holds a consistent ~55-60% look across widths
   * without ever spanning the full card. */
  segmentTrack: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '58%',
    minWidth: 190,
    maxWidth: 210,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 3,
    gap: 3,
  },
  /** `flex: 1` (not content-based padding) so Balance/Focus always split
   * the track exactly 50/50, regardless of label length. */
  segmentBtn: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(245,247,251,0.45)',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  content: {
    marginTop: 15,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(211,250,255,0.62)',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  metric: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
    lineHeight: 38,
    textAlign: 'center',
  },
  /** Smaller than `metric` — the "enable tracking" empty state deliberately
   * avoids a giant dead headline. */
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 3,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 1,
    textAlign: 'center',
  },
  body: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.text.secondary,
    marginTop: 3,
    textAlign: 'center',
  },
  capabilityLine: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.38)',
    marginTop: 10,
    textAlign: 'center',
  },
  focusProgressTrack: {
    marginTop: 10,
  },
  insightStrip: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
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
  /** One dual-action footer row — primary ~60% / secondary ~40%, same
   * height/radius family, 9dp gap, so the pair reads as one designed
   * component instead of a CTA next to loose text. */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
  },
  footerPrimaryShell: {
    flex: 3,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: 'rgba(63,190,222,0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  footerPrimaryFill: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  footerPrimarySheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  footerPrimaryText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 15.5,
    fontWeight: '600',
    color: '#03212C',
  },
  footerSecondary: {
    flex: 2,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: 'rgba(28,42,80,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(94,234,255,0.18)',
  },
  footerSecondaryText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(211,250,255,0.85)',
  },
  durationHintRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 10,
  },
  durationHintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  durationHintDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 10,
    marginTop: 8,
  },
  durationHintValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  durationHintValue: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.55)',
  },
  durationHintUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(245,247,251,0.35)',
    marginLeft: 2,
  },
  /** Tiny underline instead of a pill — marks the active preset without turning this into a big segmented control. */
  durationHintUnderline: {
    height: 2,
    borderRadius: 1,
    backgroundColor: VIOLET,
    marginTop: 3,
  },
});
