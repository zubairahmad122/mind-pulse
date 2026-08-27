import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Eye, MoonStar, PhoneOff } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SHADOWS, SPACING } from '@/constants/designSystem';
import { useAuth } from '@/context/AuthContext';
import { useDigitalSunsetSetting } from '@/hooks/useDigitalSunsetSetting';
import { useSleepSchedule } from '@/hooks/useSleepSchedule';
import {
  formatDateTimeForDisplay,
  formatHHMMForDisplay,
  getDigitalSunsetWindow,
  markDigitalSunsetOpened,
} from '@/services/digitalSunset';
import {
  digitalSunsetEyeResetRoute,
  digitalSunsetOfflineRoute,
  digitalSunsetSleepRoute,
  digitalSunsetWindDownRoute,
} from '@/utils/digitalSunsetRoutes';

const SUNSET_ACCENT = '#F3B74D';
const VIOLET = PILLAR_COLORS.sleep;

function ActionRow({
  icon,
  title,
  meta,
  body,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      style={styles.actionRow}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionText}>
        <View style={styles.actionTitleRow}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionMeta}>{meta}</Text>
        </View>
        <Text style={styles.actionBody}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DigitalSunsetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { schedule, loading } = useSleepSchedule(user?.uid, user?.isAnonymous ?? true);
  const {
    summary,
    loading: settingsLoading,
    toggle: toggleDigitalSunset,
    setOffset: setDigitalSunsetOffset,
  } = useDigitalSunsetSetting(user?.uid, schedule);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void markDigitalSunsetOpened(user?.uid);
  }, [user?.uid]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const window = useMemo(
    () => getDigitalSunsetWindow(
      now,
      schedule?.bedtime ?? '23:00',
      summary?.settings.digitalSunsetOffsetMinutes ?? 60,
    ),
    [now, schedule?.bedtime, summary?.settings.digitalSunsetOffsetMinutes],
  );

  const bedtimeLabel = schedule ? formatHHMMForDisplay(schedule.bedtime) : '—';
  const untilLabel = window.active && window.minutesUntilBedtime != null
    ? `${window.minutesUntilBedtime} min until bedtime`
    : `Starts ${formatDateTimeForDisplay(window.nextStartsAt)}`;

  return (
    <ScreenShell safeBottom pillar="sleep" ambient={<AmbientBackground subtle />}>
      <ScreenHeader
        title="Digital Sunset"
        subtitle="Choose how you want to end your screen time tonight."
        showBack
        subtitleLines={2}
      />

      <GlassCard style={{ marginTop: 4, ...SHADOWS.small }}>
        <Text style={styles.eyebrow}>DIGITAL SUNSET</Text>
        <Text style={styles.title}>Time to wind down</Text>
        <Text style={styles.body}>Choose a calm next step before sleep.</Text>
        <View style={styles.contextPill}>
          <MoonStar size={15} color={SUNSET_ACCENT} strokeWidth={2} />
          <Text style={styles.contextText}>
            {loading ? 'Loading bedtime' : `Bedtime · ${bedtimeLabel}`}
          </Text>
          <Text style={styles.contextDot}>•</Text>
          <Text style={styles.contextText}>{untilLabel}</Text>
        </View>
      </GlassCard>

      {/* ── Settings — toggle + timing, the deeper config moved here ── */}
      <View style={{ marginTop: SPACING.section }}>
        <GlassCard style={{ ...SHADOWS.small }}>
          <View style={styles.settingsRow}>
            <View style={styles.settingsText}>
              <Text style={styles.settingsTitle}>Digital Sunset</Text>
              <Text style={styles.settingsSubtitle}>
                Gentle nudge before your bedtime.
              </Text>
            </View>
            <Switch
              value={Boolean(summary?.settings.digitalSunsetEnabled)}
              disabled={settingsLoading}
              onValueChange={next => void toggleDigitalSunset(next)}
              trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(243,183,77,0.72)' }}
              thumbColor={summary?.settings.digitalSunsetEnabled ? SUNSET_ACCENT : 'rgba(245,247,251,0.8)'}
              accessibilityLabel="Digital Sunset"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.offsetRow}>
            <View style={styles.settingsText}>
              <Text style={styles.settingsTitle}>Remind me</Text>
              <Text style={styles.settingsSubtitle}>
                {summary?.settings.digitalSunsetEnabled
                  ? 'A notification before your wind-down starts.'
                  : 'Timing applies when Digital Sunset is on.'}
              </Text>
            </View>
            <View style={styles.offsetOptions}>
              {([30, 60] as const).map(offset => {
                const selected = summary?.settings.digitalSunsetOffsetMinutes === offset;
                return (
                  <TouchableOpacity
                    key={offset}
                    onPress={() => void setDigitalSunsetOffset(offset)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${offset} minutes before bedtime`}
                    style={[styles.offsetOption, selected && styles.offsetOptionSelected]}
                  >
                    <Text style={[styles.offsetOptionText, selected && styles.offsetOptionTextSelected]}>
                      {offset} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={{ marginTop: SPACING.section }}>
        <GlassCard style={{ ...SHADOWS.small }}>
          <ActionRow
            icon={<PhoneOff size={22} color={SUNSET_ACCENT} strokeWidth={1.9} />}
            title="Go Offline"
            meta="15 min"
            body="Put your phone down for a while."
            onPress={() => router.push(digitalSunsetOfflineRoute() as never)}
          />
          <View style={styles.divider} />
          <ActionRow
            icon={<MoonStar size={22} color={VIOLET} strokeWidth={1.9} />}
            title="Wind Down"
            meta="Relax"
            body="Slow things down before sleep."
            onPress={() => router.push(digitalSunsetWindDownRoute() as never)}
          />
          <View style={styles.divider} />
          <ActionRow
            icon={<Eye size={22} color={PILLAR_COLORS.eye} strokeWidth={1.9} />}
            title="Eye Reset"
            meta="Short visual break"
            body="Rest your eyes before bed."
            onPress={() => router.push(digitalSunsetEyeResetRoute() as never)}
          />
          <View style={styles.divider} />
          <ActionRow
            icon={<Bed size={22} color={PILLAR_COLORS.sleep} strokeWidth={1.9} />}
            title="Sleep"
            meta="Start Sleep Routine"
            body="Open your existing sleep flow."
            onPress={() => router.push(digitalSunsetSleepRoute() as never)}
          />
        </GlassCard>
      </View>

      <View style={styles.ctaWrap}>
        <GradientCTA label="Done" compact textColor="#241604" onPress={() => router.back()} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(243,183,77,0.78)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    marginTop: 6,
  },
  contextPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(243,183,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(243,183,77,0.22)',
  },
  contextText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.78)',
  },
  contextDot: {
    color: 'rgba(245,247,251,0.34)',
  },
  actionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 11,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    flexShrink: 0,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  actionMeta: {
    fontSize: 11.5,
    fontWeight: '800',
    color: SUNSET_ACCENT,
    flexShrink: 0,
  },
  actionBody: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  settingsText: {
    flex: 1,
    minWidth: 0,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  settingsSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: 3,
  },
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  offsetOptions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  offsetOption: {
    minWidth: 58,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  offsetOptionSelected: {
    backgroundColor: 'rgba(243,183,77,0.16)',
    borderColor: 'rgba(243,183,77,0.55)',
  },
  offsetOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(245,247,251,0.6)',
  },
  offsetOptionTextSelected: {
    color: SUNSET_ACCENT,
  },
  ctaWrap: {
    marginTop: SPACING.section,
  },
});
