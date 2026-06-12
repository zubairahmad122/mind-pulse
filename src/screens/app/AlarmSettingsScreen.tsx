import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Bell, BellRing, Clock, Heart, Maximize2, Play, Sparkles, Volume2, Waves } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ALARM_RINGTONES, SNOOZE_DURATIONS, SMART_ALARM_WINDOWS, VIBRATION_PATTERNS, type AlarmRingtoneOption, type VibrationPatternOption } from '@/constants/alarmSounds';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onToggle, color = colors.accent.purple }: { value: boolean; onToggle: () => void; color?: string }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[toggleStyles.track, value && { backgroundColor: color, borderColor: color }]}
    >
      <View style={[toggleStyles.thumb, value && toggleStyles.thumbOn]} />
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
});

// ─── Selectable Pill Grid ─────────────────────────────────────────────────────

function PillGrid<T extends { value: any; label: string }>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[];
  selected: T['value'];
  onSelect: (value: T['value']) => void;
}) {
  return (
    <View style={pillStyles.row}>
      {options.map(opt => {
        const active = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.value);
            }}
            activeOpacity={0.7}
            style={[pillStyles.pill, active && pillStyles.pillActive]}
          >
            <Text style={[pillStyles.label, active && pillStyles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pillStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.15)',
    borderColor: colors.accent.purple,
  },
  label: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
});

// ─── Ringtone Card ────────────────────────────────────────────────────────────

function RingtoneCard({
  ringtone,
  selected,
  isPreviewing,
  onSelect,
  onPlayPreview,
}: {
  ringtone: AlarmRingtoneOption;
  selected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPlayPreview: () => void;
}) {
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);
  const RingIcon = ringtone.icon;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (isPreviewing) {
      pulseOpacity.value = withRepeat(
        withTiming(1, { duration: 600 }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = withTiming(0.4, { duration: 200 });
    }
  }, [isPreviewing, pulseOpacity]);

  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 18 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 14 }); };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSelect();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={[ringtoneStyles.card, selected && ringtoneStyles.cardActive]}
      >
        <View style={[ringtoneStyles.iconWrap, { backgroundColor: ringtone.color + '18', borderColor: ringtone.color + '30' }]}>
          <RingIcon size={20} color={ringtone.color} strokeWidth={1.8} />
        </View>
        <View style={ringtoneStyles.textWrap}>
          <Text style={[ringtoneStyles.label, selected && ringtoneStyles.labelActive]}>
            {ringtone.label}
          </Text>
          <Text style={ringtoneStyles.subtitle}>{ringtone.subtitle}</Text>
        </View>

        {/* Preview play button */}
        <TouchableOpacity
          onPress={e => {
            e.stopPropagation?.();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPlayPreview();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[ringtoneStyles.playBtn, isPreviewing && { backgroundColor: ringtone.color + '25', borderColor: ringtone.color }]}
        >
          <Animated.View style={isPreviewing ? pulseAnim : undefined}>
            {isPreviewing ? (
              <Volume2 size={14} color={ringtone.color} strokeWidth={2.5} />
            ) : (
              <Play size={14} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
            )}
          </Animated.View>
          <Text style={[ringtoneStyles.playLabel, isPreviewing && { color: ringtone.color }]}>
            {isPreviewing ? 'Playing' : 'Preview'}
          </Text>
        </TouchableOpacity>

        {selected && !isPreviewing && (
          <View style={[ringtoneStyles.check, { backgroundColor: ringtone.color }]}>
            <Text style={{ color: '#0A0E1A', fontSize: 10, fontWeight: '800' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const ringtoneStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    fontSize: 10,
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <View style={sectionStyles.row}>
      <View style={sectionStyles.iconBox}>
        <Icon size={16} color={colors.accent.purple} strokeWidth={1.8} />
      </View>
      <Text style={sectionStyles.label}>{label}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.headingSmall,
    color: colors.text.primary,
    fontSize: 16,
  },
});

// ─── Volume Slider ────────────────────────────────────────────────────────────

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const activeBars = Math.round(value * 10);

  return (
    <View style={volumeStyles.wrap}>
      <Volume2 size={16} color="rgba(255,255,255,0.4)" />
      <View style={volumeStyles.barRow}>
        {bars.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onChange((i + 1) / 10)}
            activeOpacity={0.6}
            style={[
              volumeStyles.bar,
              {
                backgroundColor: i < activeBars ? colors.accent.purple : 'rgba(255,255,255,0.08)',
                height: 6 + (i % 3) * 4,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const volumeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 18,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 6,
  },
});

// ─── Vibration Row ────────────────────────────────────────────────────────────

function VibrationRow({
  pattern,
  selected,
  onSelect,
  onPreview,
}: {
  pattern: VibrationPatternOption;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[vibStyles.row, selected && vibStyles.rowActive]}
    >
      <View style={vibStyles.iconWrap}>
        {pattern.id === 'heartbeat' ? (
          <Heart size={18} color={selected ? colors.accent.purple : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        ) : pattern.id === 'gentle' ? (
          <Waves size={18} color={selected ? colors.accent.purple : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        ) : pattern.id === 'none' ? (
          <BellRing size={18} color={selected ? colors.accent.purple : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        ) : (
          <Bell size={18} color={selected ? colors.accent.purple : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[vibStyles.label, selected && vibStyles.labelActive]}>
          {pattern.label}
        </Text>
        <Text style={vibStyles.desc}>{pattern.description}</Text>
      </View>
      {pattern.id !== 'none' && (
        <TouchableOpacity
          onPress={onPreview}
          activeOpacity={0.7}
          style={vibStyles.previewBtn}
        >
          <Sparkles size={14} color="rgba(255,255,255,0.4)" />
          <Text style={vibStyles.previewText}>Test</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const vibStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowActive: {
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    borderColor: 'rgba(123, 97, 255, 0.25)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  desc: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    fontSize: 10,
  },
});

// ─── Alarm Label Input ────────────────────────────────────────────────────────

function AlarmLabelInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={labelStyles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Wake up"
        placeholderTextColor="rgba(255,255,255,0.2)"
        style={labelStyles.input}
      />
      <Text style={labelStyles.hint}>This label shows on the alarm overlay</Text>
    </View>
  );
}

const labelStyles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  input: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    color: colors.text.tertiary,
    paddingLeft: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlarmSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [smartAlarm, setSmartAlarm] = useState(true);
  const [selectedRingtone, setSelectedRingtone] = useState('sunrise-chime');
  const [selectedVibration, setSelectedVibration] = useState('standard');
  const [snoozeDuration, setSnoozeDuration] = useState<5 | 10 | 15 | 20 | 30>(10);
  const [smartAlarmWindow, setSmartAlarmWindow] = useState<15 | 30 | 45 | 60>(30);
  const [alarmVolume, setAlarmVolume] = useState(0.8);
  const [alarmLabel, setAlarmLabel] = useState('Wake up');

  // ── Ringtone preview audio ─────────────────────────────────────────────────
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure audio mode is set for playback
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
      }
    };
  }, []);

  const playRingtonePreview = useCallback((ringtoneId: string) => {
    const ringtone = ALARM_RINGTONES.find(r => r.id === ringtoneId);
    if (!ringtone) return;

    // Stop any current preview
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    const currentPlayer = playerRef.current;
    if (currentPlayer) {
      try { currentPlayer.pause(); currentPlayer.remove(); } catch {}
    }

    // Create a fresh player for each preview
    try {
      const player = createAudioPlayer({ uri: ringtone.previewUrl });
      playerRef.current = player;
      setPreviewingId(ringtoneId);

      try { player.play(); } catch {
        setPreviewingId(null);
      }

      // Auto-stop after 8 seconds preview
      previewTimeoutRef.current = setTimeout(() => {
        try { player.pause(); player.remove(); } catch {}
        setPreviewingId(null);
      }, 8000);
    } catch {
      // Audio not available — silently ignore
      setPreviewingId(null);
    }
  }, []);

  const handleStopPreview = useCallback(() => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (playerRef.current) {
      try { playerRef.current.pause(); playerRef.current.remove(); } catch {}
    }
    setPreviewingId(null);
  }, []);

  const handlePreviewVibration = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 200);
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Alarm Settings</Text>
          <Text style={styles.headerSub}>Configure your wake-up experience</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Smart Alarm ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <GlassCard style={styles.smartCard}>
            <View style={styles.smartHeader}>
              <View style={styles.smartIcon}>
                <BellRing size={22} color={colors.accent.purple} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.smartTitle}>Smart Stage Alarm</Text>
                <Text style={styles.smartSub}>
                  Wakes you during light sleep for a natural feel
                </Text>
              </View>
              <ToggleSwitch
                value={smartAlarm}
                onToggle={() => setSmartAlarm(!smartAlarm)}
              />
            </View>

            {smartAlarm && (
              <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <View style={styles.smartDetail}>
                  <Text style={styles.smartDetailLabel}>Wake window</Text>
                  <Text style={styles.smartDetailValue}>
                    {smartAlarmWindow} min before alarm
                  </Text>
                </View>
                <PillGrid
                  options={SMART_ALARM_WINDOWS}
                  selected={smartAlarmWindow}
                  onSelect={v => setSmartAlarmWindow(v)}
                />
                <Text style={styles.smartNote}>
                  Your alarm will fire anytime within the window when you're in light sleep.
                </Text>
              </Animated.View>
            )}
          </GlassCard>
        </Animated.View>

        {/* ── Alarm Label ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <GlassCard style={{ gap: spacing.sm }}>
            <SectionTitle icon={Bell} label="Alarm Label" />
            <AlarmLabelInput value={alarmLabel} onChange={setAlarmLabel} />
          </GlassCard>
        </Animated.View>

        {/* ── Ringtone ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <GlassCard style={{ gap: spacing.sm }}>
            <SectionTitle icon={Volume2} label="Ringtone" />
            <View style={{ gap: spacing.sm }}>
              {ALARM_RINGTONES.map(r => (
                <RingtoneCard
                  key={r.id}
                  ringtone={r}
                  selected={selectedRingtone === r.id}
                  isPreviewing={previewingId === r.id}
                  onSelect={() => {
                    setSelectedRingtone(r.id);
                    handleStopPreview();
                  }}
                  onPlayPreview={() => playRingtonePreview(r.id)}
                />
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Volume ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <GlassCard style={{ gap: spacing.sm }}>
            <SectionTitle icon={Volume2} label="Alarm Volume" />
            <VolumeSlider value={alarmVolume} onChange={setAlarmVolume} />
          </GlassCard>
        </Animated.View>

        {/* ── Vibration & Snooze ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <GlassCard style={{ gap: spacing.sm }}>
            <SectionTitle icon={Maximize2} label="Vibration Pattern" />
            <View style={{ gap: spacing.sm }}>
              {VIBRATION_PATTERNS.map(p => (
                <VibrationRow
                  key={p.id}
                  pattern={p}
                  selected={selectedVibration === p.id}
                  onSelect={() => setSelectedVibration(p.id)}
                  onPreview={handlePreviewVibration}
                />
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Snooze ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(600).springify()}>
          <GlassCard style={{ gap: spacing.sm }}>
            <SectionTitle icon={Clock} label="Snooze Duration" />
            <PillGrid
              options={SNOOZE_DURATIONS}
              selected={snoozeDuration}
              onSelect={v => setSnoozeDuration(v)}
            />
          </GlassCard>
        </Animated.View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    ...typography.headingMedium,
    color: colors.text.primary,
    fontSize: 20,
  },
  headerSub: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  smartCard: {
    gap: spacing.sm,
  },
  smartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  smartIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
  },
  smartSub: {
    ...typography.caption,
    color: colors.text.tertiary,
    lineHeight: 16,
  },
  smartDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smartDetailLabel: {
    ...typography.label,
    color: colors.text.secondary,
  },
  smartDetailValue: {
    ...typography.label,
    color: colors.accent.purple,
    fontWeight: '700',
  },
  smartNote: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
