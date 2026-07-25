import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SLEEP_QUALITY_OPTIONS, type SleepQualityOption } from '@/constants/sleepQuality';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { FONTS, RADIUS, TYPOGRAPHY } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';

type Props = {
  visible: boolean;
  selectedQuality: number;
  onSelectQuality: (value: number) => void;
  onSave: () => void;
  onSkip?: () => void;
};

// Same icon-circle + label shape as Relax's "How do you feel?" mood picker
// (RelaxHome's MoodCell) — this is the same kind of interaction (pick one of
// N qualitative states), so it should look like the same component family.
function QualityButton({
  opt,
  active,
  onPress,
}: {
  opt: SleepQualityOption;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const Icon = opt.icon;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      style={styles.option}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          animStyle,
          active && { backgroundColor: opt.color + '1f', borderColor: opt.color },
        ]}
      >
        <Icon size={19} color={active ? opt.color : 'rgba(255,255,255,0.5)'} strokeWidth={1.9} />
      </Animated.View>
      <Text
        style={[styles.label, active && { color: opt.color, fontWeight: '700' }]}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {opt.label}
      </Text>
    </TouchableOpacity>
  );
}

export function SleepQualityModal({ visible, selectedQuality, onSelectQuality, onSave, onSkip }: Props) {
  const [closing, setClosing] = useState(false);

  const handleSave = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onSave();
    }, 200);
  };

  const handleSkip = onSkip ?? handleSave;

  const selectedOpt = SLEEP_QUALITY_OPTIONS.find(o => o.value === selectedQuality);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        {/* Tap outside the sheet to skip */}
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={handleSkip} />
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={styles.sheet}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Title — same screenTitle/subtitle scale as every other screen header */}
          <Text style={styles.title}>How did you sleep?</Text>
          <Text style={styles.subtitle}>Rate your last sleep session</Text>

          {/* Quality options */}
          <View style={styles.row}>
            {SLEEP_QUALITY_OPTIONS.map(opt => (
              <QualityButton
                key={opt.value}
                opt={opt}
                active={selectedQuality === opt.value}
                onPress={() => onSelectQuality(opt.value)}
              />
            ))}
          </View>

          {/* Selected label highlight */}
          {selectedOpt && (
            <View style={[styles.selectedHint, { borderColor: selectedOpt.color + '30' }]}>
              <View style={[styles.selectedDot, { backgroundColor: selectedOpt.color }]} />
              <Text style={styles.selectedHintText}>
                {selectedOpt.label}
              </Text>
            </View>
          )}

          {/* Save button — same frozen primary-button gradient as every other screen */}
          <GradientCTA
            label="Save session"
            onPress={handleSave}
            loading={closing}
            style={styles.saveBtn}
          />

          {/* Skip — rating is optional */}
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  // Same bottom-sheet tokens as the other sheets in the Sleep flow (Ringtone
  // picker, alarm-window picker) — bg, radius, and border kept identical.
  sheet: {
    backgroundColor: '#11162a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.screenTitle.fontSize,
    fontWeight: TYPOGRAPHY.screenTitle.fontWeight,
    color: TYPOGRAPHY.screenTitle.color,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: TYPOGRAPHY.subtitle.color,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  selectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: spacing.lg,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedHintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    width: '100%',
  },
  skipBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
});
