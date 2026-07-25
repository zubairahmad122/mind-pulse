import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Bell, BellRing, ChevronRight, Clock, Heart, Maximize2, Play, Sparkles, Volume2, Waves, X } from 'lucide-react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroCard } from '@/components/ui/HeroCard';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ALARM_RINGTONES, SNOOZE_DURATIONS, SMART_ALARM_WINDOWS, VIBRATION_PATTERNS, getRingtoneRequire, type AlarmRingtoneOption, type VibrationPatternOption } from '@/constants/alarmSounds';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { colors } from '@/constants/colors';
import { FONTS, PILLAR_COLORS, SPACING, TYPOGRAPHY } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

// This page belongs to the Sleep pillar — same frozen indigo accent as the
// Sleep tab, Routine, Analysis, and the Set Bedtime/Wake Time sheet. (It used
// to run its own light/dark theme with `colors.accent.purple`, which despite
// the name is actually blue #1A8FFF — the one screen in the app out of step
// with the rest of the design system.)
const ACCENT = PILLAR_COLORS.sleep;

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onToggle, color = ACCENT }: { value: boolean; onToggle: () => void; color?: string }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[toggleStyles.track, { backgroundColor: value ? color : '#252542' }]}
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
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
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
            style={[
              pillStyles.pill,
              active && {
                backgroundColor: ACCENT + '22',
                borderColor: ACCENT,
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 8,
                shadowOpacity: 0.3,
                elevation: 4,
              },
            ]}
          >
            <Text style={[pillStyles.label, active && { color: '#fff', fontWeight: '800' as const }]}>
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
    gap: spacing.sm + 2,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
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
        style={[
          ringtoneStyles.card,
          selected && { backgroundColor: ACCENT + '14', borderColor: ACCENT + '55' },
        ]}
      >
        <View style={[ringtoneStyles.iconWrap, { backgroundColor: ringtone.color + '18', borderColor: ringtone.color + '30' }]}>
          <RingIcon size={20} color={ringtone.color} strokeWidth={1.8} />
        </View>
        <View style={ringtoneStyles.textWrap}>
          <Text style={[ringtoneStyles.label, selected && { color: '#fff', fontWeight: '700' as const }]}>
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
          style={[
            ringtoneStyles.playBtn,
            isPreviewing && { backgroundColor: ringtone.color + '25', borderColor: ringtone.color },
          ]}
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
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.3)',
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
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playLabel: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
});

// ─── Selected Ringtone Row (opens picker) ────────────────────────────────────

function SelectedRingtoneRow({
  ringtone,
  isPreviewing,
  onPlayPreview,
  onPress,
}: {
  ringtone: AlarmRingtoneOption;
  isPreviewing: boolean;
  onPlayPreview: () => void;
  onPress: () => void;
}) {
  const pulseOpacity = useSharedValue(0.4);
  const RingIcon = ringtone.icon;

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (isPreviewing) {
      pulseOpacity.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
    } else {
      pulseOpacity.value = withTiming(0.4, { duration: 200 });
    }
  }, [isPreviewing, pulseOpacity]);

  return (
    <TouchableOpacity
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.85}
      style={selectedRingtoneStyles.row}
    >
      <View style={[selectedRingtoneStyles.iconWrap, { backgroundColor: ringtone.color + '18', borderColor: ringtone.color + '30' }]}>
        <RingIcon size={20} color={ringtone.color} strokeWidth={1.8} />
      </View>
      <View style={selectedRingtoneStyles.textWrap}>
        <Text style={selectedRingtoneStyles.label}>{ringtone.label}</Text>
        <Text style={selectedRingtoneStyles.subtitle}>{ringtone.subtitle}</Text>
      </View>
      <TouchableOpacity
        onPress={e => {
          e.stopPropagation?.();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPlayPreview();
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          selectedRingtoneStyles.playBtn,
          isPreviewing && { backgroundColor: ringtone.color + '25', borderColor: ringtone.color },
        ]}
      >
        <Animated.View style={isPreviewing ? pulseAnim : undefined}>
          {isPreviewing ? (
            <Volume2 size={15} color={ringtone.color} strokeWidth={2.5} />
          ) : (
            <Play size={15} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
          )}
        </Animated.View>
      </TouchableOpacity>
      <ChevronRight size={18} color="rgba(255,255,255,0.3)" strokeWidth={2} />
    </TouchableOpacity>
  );
}

const selectedRingtoneStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.3)',
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

// ─── Ringtone Picker Modal ────────────────────────────────────────────────────

function RingtonePickerModal({
  visible,
  ringtones,
  selectedId,
  previewingId,
  onSelect,
  onPlayPreview,
  onClose,
}: {
  visible: boolean;
  ringtones: AlarmRingtoneOption[];
  selectedId: string;
  previewingId: string | null;
  onSelect: (id: string) => void;
  onPlayPreview: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={pickerStyles.sheet}
        >
          <View style={pickerStyles.handleBar} />
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Alarm Sound</Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={pickerStyles.closeBtn}
            >
              <X size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pickerStyles.list}>
            {ringtones.map(r => (
              <RingtoneCard
                key={r.id}
                ringtone={r}
                selected={selectedId === r.id}
                isPreviewing={previewingId === r.id}
                onSelect={() => onSelect(r.id)}
                onPlayPreview={() => onPlayPreview(r.id)}
              />
            ))}
            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#11162a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '78%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <View style={sectionStyles.row}>
      <View style={sectionStyles.iconBox}>
        <Icon size={18} color={ACCENT} strokeWidth={1.8} />
      </View>
      <Text style={sectionStyles.label}>{label}</Text>
    </View>
  );
}

// Same 40×40/radius-14 icon container as the app's other card headers (e.g.
// the AI Recommendation/Insight cards) — the old 28×28/radius-10 box read as
// noticeably smaller than the Smart Alarm card's 44×44 icon right above it.
const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT + '26',
  },
  label: {
    fontSize: TYPOGRAPHY.cardTitle.fontSize,
    fontWeight: TYPOGRAPHY.cardTitle.fontWeight,
    color: '#FFFFFF',
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
                backgroundColor: i < activeBars ? ACCENT : 'rgba(255,255,255,0.08)',
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
      style={[
        vibStyles.row,
        selected && { backgroundColor: ACCENT + '1A', borderColor: ACCENT + '55' },
      ]}
    >
      <View style={vibStyles.iconWrap}>
        {pattern.id === 'heartbeat' ? (
          <Heart size={18} color={selected ? ACCENT : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        ) : pattern.id === 'gentle' ? (
          <Waves size={18} color={selected ? ACCENT : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        ) : pattern.id === 'none' ? (
          <BellRing size={18} color={selected ? ACCENT : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        ) : (
          <Bell size={18} color={selected ? ACCENT : 'rgba(255,255,255,0.4)'} strokeWidth={1.8} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[vibStyles.label, selected && { color: '#fff', fontWeight: '700' as const }]}>
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
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  label: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  desc: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.3)',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
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
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.3)',
    paddingLeft: 4,
  },
});

// ─── Hero — same "Today's Journey" language as Home's hero card ──────────────

function AlarmHeroCard({
  smartAlarm,
  smartAlarmWindow,
  ringtoneLabel,
  alarmVolume,
  isTestingAlarm,
  onTestAlarm,
}: {
  smartAlarm: boolean;
  smartAlarmWindow: number;
  ringtoneLabel: string;
  alarmVolume: number;
  isTestingAlarm: boolean;
  onTestAlarm: () => void;
}) {
  const message = smartAlarm
    ? `Wakes you gently during light sleep, within ${smartAlarmWindow} min of your alarm.`
    : `${ringtoneLabel} at ${Math.round(alarmVolume * 100)}% volume.`;

  return (
    <HeroCard style={styles.heroCard}>
      <View style={styles.heroInner}>
        <View style={styles.heroHeaderRow}>
          <Text style={styles.heroLabel}>ALARM SETUP</Text>
          <Text style={styles.heroBadge}>{smartAlarm ? 'SMART' : 'FIXED'}</Text>
        </View>

        <Text style={styles.heroMessage}>{message}</Text>

        <View style={styles.heroCta}>
          <GradientCTA
            label={isTestingAlarm ? 'Stop Test' : 'Test Alarm'}
            icon={<Volume2 size={17} color="#03212C" strokeWidth={2.5} />}
            textColor="#03212C"
            onPress={onTestAlarm}
          />
        </View>
      </View>
    </HeroCard>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, r = 12, pulseStyle, style }: { w: number | string; h: number; r?: number; pulseStyle: object; style?: any }) {
  return (
    <Animated.View
      style={[{
        // Reanimated animated styles need `as any` because RN Web types
        // don't allow animated values in the `width` property.
        width: w as any,
        height: h,
        borderRadius: r,
        backgroundColor: 'rgba(255,255,255,0.07)',
      }, pulseStyle, style]}
    />
  );
}

function SkeletonGlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      padding: 16,
      gap: 12,
    }, style]}>
      {children}
    </View>
  );
}

function AlarmSettingsSkeleton() {
  const pulseSV = useSharedValue(0.3);

  useEffect(() => {
    pulseSV.value = withRepeat(
      withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulseSV);
  }, []);

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: pulseSV.value,
  }));

  return (
    <View>
      {/* Hero skeleton */}
      <SkeletonBlock pulseStyle={pulseAnim} w="100%" h={150} r={30} style={{ marginBottom: SPACING.section }} />

      {/* Smart Alarm card */}
      <SkeletonGlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={44} h={44} r={14} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonBlock pulseStyle={pulseAnim} w={130} h={14} r={4} />
            <SkeletonBlock pulseStyle={pulseAnim} w={180} h={10} r={3} />
          </View>
          <SkeletonBlock pulseStyle={pulseAnim} w={48} h={28} r={14} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={80} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={80} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={90} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={80} h={32} r={20} />
        </View>
      </SkeletonGlassCard>

      {/* Alarm Label card */}
      <SkeletonGlassCard style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={28} h={28} r={10} />
          <SkeletonBlock pulseStyle={pulseAnim} w={90} h={14} r={4} />
        </View>
        <SkeletonBlock pulseStyle={pulseAnim} w="100%" h={50} r={14} />
      </SkeletonGlassCard>

      {/* Ringtone card */}
      <SkeletonGlassCard style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={28} h={28} r={10} />
          <SkeletonBlock pulseStyle={pulseAnim} w={70} h={14} r={4} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={44} h={44} r={14} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonBlock pulseStyle={pulseAnim} w={120} h={13} r={4} />
            <SkeletonBlock pulseStyle={pulseAnim} w={75} h={9} r={3} />
          </View>
          <SkeletonBlock pulseStyle={pulseAnim} w={60} h={28} r={8} />
        </View>
      </SkeletonGlassCard>

      {/* Volume card */}
      <SkeletonGlassCard style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={28} h={28} r={10} />
          <SkeletonBlock pulseStyle={pulseAnim} w={100} h={14} r={4} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={16} h={16} r={8} />
          <View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <Animated.View
                key={i}
                style={[{
                  flex: 1,
                  height: 6 + (i % 3) * 4,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                }, pulseAnim]}
              />
            ))}
          </View>
        </View>
      </SkeletonGlassCard>

      {/* Vibration card */}
      <SkeletonGlassCard style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={28} h={28} r={10} />
          <SkeletonBlock pulseStyle={pulseAnim} w={120} h={14} r={4} />
        </View>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <SkeletonBlock pulseStyle={pulseAnim} w={36} h={36} r={10} />
            <View style={{ flex: 1, gap: 3 }}>
              <SkeletonBlock pulseStyle={pulseAnim} w={80 + i * 30} h={12} r={4} />
              <SkeletonBlock pulseStyle={pulseAnim} w={140} h={9} r={3} />
            </View>
            <SkeletonBlock pulseStyle={pulseAnim} w={60} h={28} r={8} />
          </View>
        ))}
      </SkeletonGlassCard>

      {/* Snooze card */}
      <SkeletonGlassCard style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={28} h={28} r={10} />
          <SkeletonBlock pulseStyle={pulseAnim} w={100} h={14} r={4} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <SkeletonBlock pulseStyle={pulseAnim} w={60} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={70} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={65} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={75} h={32} r={20} />
          <SkeletonBlock pulseStyle={pulseAnim} w={65} h={32} r={20} />
        </View>
      </SkeletonGlassCard>

      {/* Spacer */}
      <View style={{ height: 40 }} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlarmSettingsScreen() {
  // ── Persisted State (AsyncStorage) ─────────────────────────────────────────
  const {
    smartAlarm,
    selectedRingtone,
    selectedVibration,
    snoozeDuration,
    smartAlarmWindow,
    alarmVolume,
    alarmLabel,
    loaded,
    setSmartAlarm,
    setSelectedRingtone,
    setSelectedVibration,
    setSnoozeDuration,
    setSmartAlarmWindow,
    setAlarmVolume,
    setAlarmLabel,
  } = useAlarmSettings();

  // ── Selected ringtone ──────────────────────────────────────────────────────
  const selectedRingtoneOption = ALARM_RINGTONES.find(r => r.id === selectedRingtone) ?? ALARM_RINGTONES[0];

  // ── Ringtone preview audio ─────────────────────────────────────────────────
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [ringtonePickerVisible, setRingtonePickerVisible] = useState(false);
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
    // Stop any current preview
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    const currentPlayer = playerRef.current;
    if (currentPlayer) {
      try { currentPlayer.pause(); currentPlayer.remove(); } catch {}
    }

    // Create a fresh player for each preview using the local bundled audio
    try {
      const source = getRingtoneRequire(ringtoneId);
      const player = createAudioPlayer(source);
      playerRef.current = player;
      setPreviewingId(ringtoneId);

      player.play();

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

  // Hero "Test Alarm" — plays the real selected ringtone + vibration pattern,
  // the same preview the Ringtone/Vibration cards trigger individually.
  const isTestingAlarm = previewingId === selectedRingtoneOption.id;
  const handleTestAlarm = useCallback(() => {
    if (isTestingAlarm) {
      handleStopPreview();
      return;
    }
    playRingtonePreview(selectedRingtoneOption.id);
    if (selectedVibration !== 'none') handlePreviewVibration();
  }, [isTestingAlarm, handleStopPreview, playRingtonePreview, selectedRingtoneOption.id, selectedVibration, handlePreviewVibration]);

  return (
    <ScreenShell safeBottom pillar="sleep" ambient={<AmbientBackground />}>
      <ScreenHeader title="Alarm Settings" subtitle="Configure your wake-up experience" showBack />

      {!loaded ? (
        <AlarmSettingsSkeleton />
      ) : (
        <>
          <AlarmHeroCard
            smartAlarm={smartAlarm}
            smartAlarmWindow={smartAlarmWindow}
            ringtoneLabel={selectedRingtoneOption.label}
            alarmVolume={alarmVolume}
            isTestingAlarm={isTestingAlarm}
            onTestAlarm={handleTestAlarm}
          />

          {/* ── Smart Alarm ──────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(100).springify()} layout={Layout.springify().damping(15)}>
            <GlassCard style={styles.smartCard}>
              <View style={styles.smartHeader}>
                <View style={[styles.smartIcon, !smartAlarm && { opacity: 0.5 }]}>
                  <BellRing size={22} color={smartAlarm ? ACCENT : 'rgba(255,255,255,0.3)'} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.smartTitle, !smartAlarm && { color: 'rgba(255,255,255,0.5)' }]}>Smart Stage Alarm</Text>
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
                <Animated.View
                  entering={FadeInDown.duration(250).springify().damping(16)}
                  exiting={FadeOutUp.duration(200)}
                  layout={Layout.springify().damping(18)}
                  style={{ marginTop: spacing.md, gap: spacing.sm }}
                >
                  {/* Divider */}
                  <View style={styles.divider} />

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
                    Your alarm will fire anytime within the window when you&apos;re in light sleep.
                  </Text>
                </Animated.View>
              )}
            </GlassCard>
          </Animated.View>

          {/* ── Alarm Label ──────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <GlassCard style={{ gap: spacing.sm, marginTop: SPACING.section }}>
              <SectionTitle icon={Bell} label="Alarm Label" />
              <AlarmLabelInput value={alarmLabel} onChange={setAlarmLabel} />
            </GlassCard>
          </Animated.View>

          {/* ── Ringtone ──────────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <GlassCard style={{ gap: spacing.sm, marginTop: SPACING.section }}>
              <SectionTitle icon={Volume2} label="Ringtone" />
              <SelectedRingtoneRow
                ringtone={selectedRingtoneOption}
                isPreviewing={previewingId === selectedRingtoneOption.id}
                onPlayPreview={() => {
                  if (previewingId === selectedRingtoneOption.id) handleStopPreview();
                  else playRingtonePreview(selectedRingtoneOption.id);
                }}
                onPress={() => setRingtonePickerVisible(true)}
              />
            </GlassCard>
          </Animated.View>

          {/* ── Volume ─────────────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <GlassCard style={{ gap: spacing.sm, marginTop: SPACING.section }}>
              <SectionTitle icon={Volume2} label="Alarm Volume" />
              <VolumeSlider value={alarmVolume} onChange={setAlarmVolume} />
            </GlassCard>
          </Animated.View>

          {/* ── Vibration & Snooze ─────────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <GlassCard style={{ gap: spacing.sm, marginTop: SPACING.section }}>
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
            <GlassCard style={{ gap: spacing.sm, marginTop: SPACING.section }}>
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
        </>
      )}

      <RingtonePickerModal
        visible={ringtonePickerVisible}
        ringtones={ALARM_RINGTONES}
        selectedId={selectedRingtone}
        previewingId={previewingId}
        onSelect={id => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelectedRingtone(id);
          handleStopPreview();
        }}
        onPlayPreview={id => {
          if (previewingId === id) handleStopPreview();
          else playRingtonePreview(id);
        }}
        onClose={() => {
          handleStopPreview();
          setRingtonePickerVisible(false);
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: SPACING.section,
  },
  heroInner: {
    padding: SPACING.cardPadding,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.sectionLabel.fontSize,
    fontWeight: TYPOGRAPHY.sectionLabel.fontWeight,
    letterSpacing: TYPOGRAPHY.sectionLabel.letterSpacing,
    textTransform: TYPOGRAPHY.sectionLabel.textTransform,
    color: 'rgba(255,255,255,0.5)',
  },
  heroBadge: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    color: ACCENT,
  },
  heroMessage: {
    fontSize: TYPOGRAPHY.body.fontSize,
    lineHeight: 20,
    color: colors.text.primary,
    fontWeight: TYPOGRAPHY.body.fontWeight,
    marginTop: 6,
  },
  heroCta: {
    marginTop: SPACING.titleGap + 10,
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
    backgroundColor: ACCENT + '26',
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(123,127,255,0.12)',
    borderRadius: 1,
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
    color: ACCENT,
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
