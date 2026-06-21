import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ArrowLeft, Bell, BellRing, ChevronRight, Clock, Heart, Maximize2, Moon, Play, Sparkles, Sun, Volume2, Waves, X } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ALARM_RINGTONES, SNOOZE_DURATIONS, SMART_ALARM_WINDOWS, VIBRATION_PATTERNS, getRingtoneRequire, type AlarmRingtoneOption, type VibrationPatternOption } from '@/constants/alarmSounds';
import { useAlarmSettings } from '@/hooks/useAlarmSettings';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

// ─── Theme ────────────────────────────────────────────────────────────────────

interface ThemeColors {
  bg: string;
  surface: string;
  surfaceHi: string;
  border: string;
  borderHi: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDim: string;
  skeleton: string;
  trackBg: string;
  trackBorder: string;
  inputBg: string;
  inputBorder: string;
  glowPurple: string;
  glowBlue: string;
  pillLabel: string;
  playIcon: string;
  previewBg: string;
  previewBorder: string;
  previewText: string;
  barInactive: string;
  iconMuted: string;
  iconDim: string;
  smartIconOff: string;
  bellMuted: string;
  titleDim: string;
  divider: string;
  glassSkeletonBg: string;
  glassSkeletonBorder: string;
  thumbColor: string;
}

type Theme = ThemeColors;

const DARK: ThemeColors = {
  bg: '#0A0E1A',
  surface: 'rgba(255,255,255,0.05)',
  surfaceHi: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.1)',
  borderHi: 'rgba(255,255,255,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.35)',
  textDim: 'rgba(255,255,255,0.2)',
  skeleton: 'rgba(255,255,255,0.07)',
  trackBg: 'rgba(255,255,255,0.06)',
  trackBorder: 'rgba(255,255,255,0.1)',
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.12)',
  glowPurple: 'rgba(123, 97, 255, 0.06)',
  glowBlue: 'rgba(79, 195, 247, 0.04)',
  pillLabel: 'rgba(255,255,255,0.6)',
  playIcon: 'rgba(255,255,255,0.5)',
  previewBg: 'rgba(255,255,255,0.06)',
  previewBorder: 'rgba(255,255,255,0.1)',
  previewText: 'rgba(255,255,255,0.5)',
  barInactive: 'rgba(255,255,255,0.08)',
  iconMuted: 'rgba(255,255,255,0.4)',
  iconDim: 'rgba(255,255,255,0.04)',
  smartIconOff: 'rgba(255,255,255,0.04)',
  bellMuted: 'rgba(255,255,255,0.3)',
  titleDim: 'rgba(255,255,255,0.5)',
  divider: 'rgba(123, 97, 255, 0.12)',
  glassSkeletonBg: 'rgba(255,255,255,0.03)',
  glassSkeletonBorder: 'rgba(255,255,255,0.06)',
  thumbColor: '#fff',
};

const LIGHT: ThemeColors = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceHi: '#F0F1F4',
  border: 'rgba(0,0,0,0.08)',
  borderHi: 'rgba(0,0,0,0.12)',
  text: '#1A1A2E',
  textSecondary: 'rgba(0,0,0,0.55)',
  textTertiary: 'rgba(0,0,0,0.3)',
  textDim: 'rgba(0,0,0,0.15)',
  skeleton: 'rgba(0,0,0,0.06)',
  trackBg: 'rgba(0,0,0,0.06)',
  trackBorder: 'rgba(0,0,0,0.1)',
  inputBg: '#F0F1F4',
  inputBorder: 'rgba(0,0,0,0.1)',
  glowPurple: 'rgba(123, 97, 255, 0.04)',
  glowBlue: 'rgba(79, 195, 247, 0.03)',
  pillLabel: 'rgba(0,0,0,0.5)',
  playIcon: 'rgba(0,0,0,0.4)',
  previewBg: '#EEEEF0',
  previewBorder: 'rgba(0,0,0,0.08)',
  previewText: 'rgba(0,0,0,0.4)',
  barInactive: 'rgba(0,0,0,0.08)',
  iconMuted: 'rgba(0,0,0,0.4)',
  iconDim: 'rgba(0,0,0,0.04)',
  smartIconOff: '#EEEEF0',
  bellMuted: 'rgba(0,0,0,0.3)',
  titleDim: 'rgba(0,0,0,0.4)',
  divider: 'rgba(123, 97, 255, 0.15)',
  glassSkeletonBg: 'rgba(0,0,0,0.02)',
  glassSkeletonBorder: 'rgba(0,0,0,0.06)',
  thumbColor: '#fff',
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onToggle, color = colors.accent.purple, theme }: { value: boolean; onToggle: () => void; color?: string; theme: Theme }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[
        toggleStyles.track,
        { backgroundColor: theme.trackBg, borderColor: theme.trackBorder },
        value && { backgroundColor: color, borderColor: color },
      ]}
    >
      <View style={[toggleStyles.thumb, { backgroundColor: theme.thumbColor }, value && toggleStyles.thumbOn]} />
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
  theme,
}: {
  options: readonly T[];
  selected: T['value'];
  onSelect: (value: T['value']) => void;
  theme: Theme;
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
              { backgroundColor: theme.surface, borderColor: theme.border },
              active && { backgroundColor: 'rgba(123, 97, 255, 0.2)', borderColor: colors.accent.purple, shadowColor: colors.accent.purple, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, shadowOpacity: 0.3, elevation: 4 },
            ]}
          >
            <Text style={[pillStyles.label, { color: theme.pillLabel }, active && { color: '#fff', fontWeight: '800' as const }]}>
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
    borderWidth: 1,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

// ─── Ringtone Card ────────────────────────────────────────────────────────────

function RingtoneCard({
  ringtone,
  selected,
  isPreviewing,
  onSelect,
  onPlayPreview,
  theme,
}: {
  ringtone: AlarmRingtoneOption;
  selected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPlayPreview: () => void;
  theme: Theme;
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
          { backgroundColor: theme.surface, borderColor: theme.border },
          selected && { backgroundColor: 'rgba(123, 97, 255, 0.08)', borderColor: 'rgba(123, 97, 255, 0.35)' },
        ]}
      >
        <View style={[ringtoneStyles.iconWrap, { backgroundColor: ringtone.color + '18', borderColor: ringtone.color + '30' }]}>
          <RingIcon size={20} color={ringtone.color} strokeWidth={1.8} />
        </View>
        <View style={ringtoneStyles.textWrap}>
          <Text style={[ringtoneStyles.label, { color: theme.text }, selected && { color: '#fff', fontWeight: '700' as const }]}>
            {ringtone.label}
          </Text>
          <Text style={[ringtoneStyles.subtitle, { color: theme.textTertiary }]}>{ringtone.subtitle}</Text>
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
            { backgroundColor: theme.previewBg, borderColor: theme.previewBorder },
            isPreviewing && { backgroundColor: ringtone.color + '25', borderColor: ringtone.color },
          ]}
        >
          <Animated.View style={isPreviewing ? pulseAnim : undefined}>
            {isPreviewing ? (
              <Volume2 size={14} color={ringtone.color} strokeWidth={2.5} />
            ) : (
              <Play size={14} color={theme.playIcon} strokeWidth={2.5} />
            )}
          </Animated.View>
          <Text style={[ringtoneStyles.playLabel, { color: theme.previewText }, isPreviewing && { color: ringtone.color }]}>
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
  },
  subtitle: {
    ...typography.caption,
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
  },
  playLabel: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
});

// ─── Selected Ringtone Row (opens picker) ────────────────────────────────────

function SelectedRingtoneRow({
  ringtone,
  isPreviewing,
  onPlayPreview,
  onPress,
  theme,
}: {
  ringtone: AlarmRingtoneOption;
  isPreviewing: boolean;
  onPlayPreview: () => void;
  onPress: () => void;
  theme: Theme;
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
      style={[selectedRingtoneStyles.row, { backgroundColor: theme.surfaceHi, borderColor: theme.border }]}
    >
      <View style={[selectedRingtoneStyles.iconWrap, { backgroundColor: ringtone.color + '18', borderColor: ringtone.color + '30' }]}>
        <RingIcon size={20} color={ringtone.color} strokeWidth={1.8} />
      </View>
      <View style={selectedRingtoneStyles.textWrap}>
        <Text style={[selectedRingtoneStyles.label, { color: theme.text }]}>{ringtone.label}</Text>
        <Text style={[selectedRingtoneStyles.subtitle, { color: theme.textTertiary }]}>{ringtone.subtitle}</Text>
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
          { backgroundColor: theme.previewBg, borderColor: theme.previewBorder },
          isPreviewing && { backgroundColor: ringtone.color + '25', borderColor: ringtone.color },
        ]}
      >
        <Animated.View style={isPreviewing ? pulseAnim : undefined}>
          {isPreviewing ? (
            <Volume2 size={15} color={ringtone.color} strokeWidth={2.5} />
          ) : (
            <Play size={15} color={theme.playIcon} strokeWidth={2.5} />
          )}
        </Animated.View>
      </TouchableOpacity>
      <ChevronRight size={18} color={theme.textTertiary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const selectedRingtoneStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
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
  },
  subtitle: {
    ...typography.caption,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  theme,
}: {
  visible: boolean;
  ringtones: AlarmRingtoneOption[];
  selectedId: string;
  previewingId: string | null;
  onSelect: (id: string) => void;
  onPlayPreview: (id: string) => void;
  onClose: () => void;
  theme: Theme;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={[pickerStyles.sheet, { backgroundColor: theme.bg, borderColor: theme.border }]}
        >
          <View style={[pickerStyles.handleBar, { backgroundColor: theme.borderHi }]} />
          <View style={pickerStyles.header}>
            <Text style={[pickerStyles.title, { color: theme.text }]}>Alarm Sound</Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[pickerStyles.closeBtn, { backgroundColor: theme.surfaceHi, borderColor: theme.borderHi }]}
            >
              <X size={18} color={theme.textSecondary} />
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
                theme={theme}
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '78%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, theme }: { icon: any; label: string; theme: Theme }) {
  return (
    <View style={sectionStyles.row}>
      <View style={[sectionStyles.iconBox, { backgroundColor: 'rgba(123, 97, 255, 0.15)' }]}>
        <Icon size={16} color={colors.accent.purple} strokeWidth={1.8} />
      </View>
      <Text style={[sectionStyles.label, { color: theme.text }]}>{label}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.headingSmall,
    fontSize: 17,
    fontWeight: '700',
  },
});

// ─── Volume Slider ────────────────────────────────────────────────────────────

function VolumeSlider({ value, onChange, theme }: { value: number; onChange: (v: number) => void; theme: Theme }) {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const activeBars = Math.round(value * 10);

  return (
    <View style={volumeStyles.wrap}>
      <Volume2 size={16} color={theme.iconMuted} />
      <View style={volumeStyles.barRow}>
        {bars.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onChange((i + 1) / 10)}
            activeOpacity={0.6}
            style={[
              volumeStyles.bar,
              {
                backgroundColor: i < activeBars ? colors.accent.purple : theme.barInactive,
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
  theme,
}: {
  pattern: VibrationPatternOption;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        vibStyles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
        selected && { backgroundColor: 'rgba(123, 97, 255, 0.1)', borderColor: 'rgba(123, 97, 255, 0.35)' },
      ]}
    >
      <View style={[vibStyles.iconWrap, { backgroundColor: theme.iconDim }]}>
        {pattern.id === 'heartbeat' ? (
          <Heart size={18} color={selected ? colors.accent.purple : theme.iconMuted} strokeWidth={1.8} />
        ) : pattern.id === 'gentle' ? (
          <Waves size={18} color={selected ? colors.accent.purple : theme.iconMuted} strokeWidth={1.8} />
        ) : pattern.id === 'none' ? (
          <BellRing size={18} color={selected ? colors.accent.purple : theme.iconMuted} strokeWidth={1.8} />
        ) : (
          <Bell size={18} color={selected ? colors.accent.purple : theme.iconMuted} strokeWidth={1.8} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[vibStyles.label, { color: theme.text }, selected && { color: '#fff', fontWeight: '700' as const }]}>
          {pattern.label}
        </Text>
        <Text style={[vibStyles.desc, { color: theme.textTertiary }]}>{pattern.description}</Text>
      </View>
      {pattern.id !== 'none' && (
        <TouchableOpacity
          onPress={onPreview}
          activeOpacity={0.7}
          style={[vibStyles.previewBtn, { backgroundColor: theme.previewBg, borderColor: theme.previewBorder }]}
        >
          <Sparkles size={14} color={theme.iconMuted} />
          <Text style={[vibStyles.previewText, { color: theme.previewText }]}>Test</Text>
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
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  desc: {
    ...typography.caption,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
});

// ─── Alarm Label Input ────────────────────────────────────────────────────────

function AlarmLabelInput({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: Theme }) {
  return (
    <View style={labelStyles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Wake up"
        placeholderTextColor={theme.textDim}
        style={[labelStyles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
      />
      <Text style={[labelStyles.hint, { color: theme.textTertiary }]}>This label shows on the alarm overlay</Text>
    </View>
  );
}

const labelStyles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  input: {
    ...typography.bodyLarge,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    paddingLeft: 4,
  },
});

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function AlarmSettingsSkeleton({ theme }: { theme: Theme }) {
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

  function Block({ w, h, r = 12, style }: { w: number | string; h: number; r?: number; style?: any }) {
    return (
      <Animated.View
        style={[{
          width: w as any,
          height: h,
          borderRadius: r,
          backgroundColor: theme.skeleton,
        }, pulseAnim, style]}
      />
    );
  }

  function Circle({ size }: { size: number }) {
    return (
      <Animated.View
        style={[{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.skeleton,
        }, pulseAnim]}
      />
    );
  }

  function GlassSkeleton({ children, style }: { children: React.ReactNode; style?: any }) {
    return (
      <View style={[{
        backgroundColor: theme.glassSkeletonBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.glassSkeletonBorder,
        padding: 16,
        gap: 12,
      }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.md }}>
      {/* Header skeleton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.sm }}>
        <Circle size={40} />
        <View style={{ gap: 6, flex: 1 }}>
          <Block w={140} h={20} r={6} />
          <Block w={200} h={12} r={4} />
        </View>
      </View>

      {/* Smart Alarm card */}
      <GlassSkeleton>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Circle size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <Block w={130} h={14} r={4} />
            <Block w={180} h={10} r={3} />
          </View>
          <Block w={48} h={28} r={14} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Block w={80} h={32} r={20} />
          <Block w={80} h={32} r={20} />
          <Block w={90} h={32} r={20} />
          <Block w={80} h={32} r={20} />
        </View>
      </GlassSkeleton>

      {/* Alarm Label card */}
      <GlassSkeleton style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Block w={28} h={28} r={8} />
          <Block w={90} h={14} r={4} />
        </View>
        <Block w="100%" h={50} r={14} />
      </GlassSkeleton>

      {/* Ringtone card */}
      <GlassSkeleton style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Block w={28} h={28} r={8} />
          <Block w={70} h={14} r={4} />
        </View>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Block w={44} h={44} r={14} />
            <View style={{ flex: 1, gap: 4 }}>
              <Block w={100 + i * 20} h={13} r={4} />
              <Block w={60 + i * 15} h={9} r={3} />
            </View>
            <Block w={60} h={28} r={8} />
          </View>
        ))}
      </GlassSkeleton>

      {/* Volume card */}
      <GlassSkeleton style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Block w={28} h={28} r={8} />
          <Block w={100} h={14} r={4} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Block w={16} h={16} r={8} />
          <View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <Animated.View
                key={i}
                style={[{
                  flex: 1,
                  height: 6 + (i % 3) * 4,
                  borderRadius: 3,
                  backgroundColor: theme.skeleton,
                }, pulseAnim]}
              />
            ))}
          </View>
        </View>
      </GlassSkeleton>

      {/* Vibration card */}
      <GlassSkeleton style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Block w={28} h={28} r={8} />
          <Block w={120} h={14} r={4} />
        </View>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Block w={36} h={36} r={10} />
            <View style={{ flex: 1, gap: 3 }}>
              <Block w={80 + i * 30} h={12} r={4} />
              <Block w={140} h={9} r={3} />
            </View>
            <Block w={60} h={28} r={8} />
          </View>
        ))}
      </GlassSkeleton>

      {/* Snooze card */}
      <GlassSkeleton style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Block w={28} h={28} r={8} />
          <Block w={100} h={14} r={4} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Block w={60} h={32} r={20} />
          <Block w={70} h={32} r={20} />
          <Block w={65} h={32} r={20} />
          <Block w={75} h={32} r={20} />
          <Block w={65} h={32} r={20} />
        </View>
      </GlassSkeleton>

      {/* Spacer */}
      <View style={{ height: 40 }} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlarmSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Persisted State (AsyncStorage) ─────────────────────────────────────────
  const {
    smartAlarm,
    selectedRingtone,
    selectedVibration,
    snoozeDuration,
    smartAlarmWindow,
    alarmVolume,
    alarmLabel,
    darkMode,
    loaded,
    setSmartAlarm,
    setSelectedRingtone,
    setSelectedVibration,
    setSnoozeDuration,
    setSmartAlarmWindow,
    setAlarmVolume,
    setAlarmLabel,
    setDarkMode,
  } = useAlarmSettings();

  // ── Theme ───────────────────────────────────────────────────────────────────
  const theme = darkMode ? DARK : LIGHT;

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
      {/* Ambient glow decoration */}
      <View style={[styles.glowTop, { backgroundColor: theme.glowPurple }]} />
      <View style={[styles.glowBottom, { backgroundColor: theme.glowBlue }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[styles.backBtn, { backgroundColor: theme.surfaceHi, borderColor: theme.borderHi }]}
        >
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alarm Settings</Text>
          <Text style={[styles.headerSub, { color: theme.textTertiary }]}>
            {loaded ? 'Configure your wake-up experience' : 'Loading your settings…'}
          </Text>
        </View>
        {/* Theme toggle */}
        <TouchableOpacity
          onPress={() => setDarkMode(!darkMode)}
          activeOpacity={0.7}
          style={[styles.backBtn, { backgroundColor: theme.surfaceHi, borderColor: theme.borderHi }]}
        >
          {darkMode ? (
            <Sun size={18} color={theme.textSecondary} strokeWidth={1.8} />
          ) : (
            <Moon size={18} color={theme.textSecondary} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>

      {!loaded ? (
        <AlarmSettingsSkeleton theme={theme} />
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Smart Alarm ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(100).springify()} layout={Layout.springify().damping(15)}>
          <GlassCard style={{ ...styles.smartCard, backgroundColor: theme.surface, borderColor: theme.border }}>
            <View style={styles.smartHeader}>
              <View style={[styles.smartIcon, { backgroundColor: theme.smartIconOff }, !smartAlarm && { opacity: 0.6 }]}>
                <BellRing size={22} color={smartAlarm ? colors.accent.purple : theme.bellMuted} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.smartTitle, { color: theme.text }, !smartAlarm && { color: theme.titleDim }]}>Smart Stage Alarm</Text>
                <Text style={[styles.smartSub, { color: theme.textTertiary }]}>
                  Wakes you during light sleep for a natural feel
                </Text>
              </View>
              <ToggleSwitch
                value={smartAlarm}
                onToggle={() => setSmartAlarm(!smartAlarm)}
                theme={theme}
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
                <View style={{ height: 1, backgroundColor: theme.divider, borderRadius: 1 }} />

                <View style={styles.smartDetail}>
                  <Text style={[styles.smartDetailLabel, { color: theme.textSecondary }]}>Wake window</Text>
                  <Text style={[styles.smartDetailValue, { color: colors.accent.purple }]}>
                    {smartAlarmWindow} min before alarm
                  </Text>
                </View>
                <PillGrid
                  options={SMART_ALARM_WINDOWS}
                  selected={smartAlarmWindow}
                  onSelect={v => setSmartAlarmWindow(v)}
                  theme={theme}
                />
                <Text style={[styles.smartNote, { color: theme.textTertiary }]}>
                  Your alarm will fire anytime within the window when you're in light sleep.
                </Text>
              </Animated.View>
            )}
          </GlassCard>
        </Animated.View>

        {/* ── Alarm Label ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <GlassCard style={{ gap: spacing.sm, backgroundColor: theme.surface, borderColor: theme.border }}>
            <SectionTitle icon={Bell} label="Alarm Label" theme={theme} />
            <AlarmLabelInput value={alarmLabel} onChange={setAlarmLabel} theme={theme} />
          </GlassCard>
        </Animated.View>

        {/* ── Ringtone ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <GlassCard style={{ gap: spacing.sm, backgroundColor: theme.surface, borderColor: theme.border }}>
            <SectionTitle icon={Volume2} label="Ringtone" theme={theme} />
            <SelectedRingtoneRow
              ringtone={selectedRingtoneOption}
              isPreviewing={previewingId === selectedRingtoneOption.id}
              onPlayPreview={() => {
                if (previewingId === selectedRingtoneOption.id) handleStopPreview();
                else playRingtonePreview(selectedRingtoneOption.id);
              }}
              onPress={() => setRingtonePickerVisible(true)}
              theme={theme}
            />
          </GlassCard>
        </Animated.View>

        {/* ── Volume ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <GlassCard style={{ gap: spacing.sm, backgroundColor: theme.surface, borderColor: theme.border }}>
            <SectionTitle icon={Volume2} label="Alarm Volume" theme={theme} />
            <VolumeSlider value={alarmVolume} onChange={setAlarmVolume} theme={theme} />
          </GlassCard>
        </Animated.View>

        {/* ── Vibration & Snooze ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <GlassCard style={{ gap: spacing.sm, backgroundColor: theme.surface, borderColor: theme.border }}>
            <SectionTitle icon={Maximize2} label="Vibration Pattern" theme={theme} />
            <View style={{ gap: spacing.sm }}>
              {VIBRATION_PATTERNS.map(p => (
                <VibrationRow
                  key={p.id}
                  pattern={p}
                  selected={selectedVibration === p.id}
                  onSelect={() => setSelectedVibration(p.id)}
                  onPreview={handlePreviewVibration}
                  theme={theme}
                />
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Snooze ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(600).springify()}>
          <GlassCard style={{ gap: spacing.sm, backgroundColor: theme.surface, borderColor: theme.border }}>
            <SectionTitle icon={Clock} label="Snooze Duration" theme={theme} />
            <PillGrid
              options={SNOOZE_DURATIONS}
              selected={snoozeDuration}
              onSelect={v => setSnoozeDuration(v)}
              theme={theme}
            />
          </GlassCard>
        </Animated.View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
        theme={theme}
      />
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(123, 97, 255, 0.06)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79, 195, 247, 0.04)',
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
