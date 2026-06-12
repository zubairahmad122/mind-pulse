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
import { COLORS } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type Props = {
  visible: boolean;
  selectedQuality: number;
  onSelectQuality: (value: number) => void;
  onSave: () => void;
};

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
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={[
          styles.option,
          active && styles.optionActive,
        ]}
      >
        {/* Active indicator bar */}
        {active && <View style={[styles.activeBar, { backgroundColor: opt.color }]} />}

        {/* Icon container */}
        <View style={[styles.iconWrap, { backgroundColor: opt.color + '18', borderColor: opt.color + '35' }]}>
          <Icon size={22} color={active ? opt.color : 'rgba(255,255,255,0.5)'} strokeWidth={1.5} />
        </View>

        <Text style={[styles.label, active && { color: '#fff', fontWeight: '700' }]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SleepQualityModal({ visible, selectedQuality, onSelectQuality, onSave }: Props) {
  const [closing, setClosing] = useState(false);

  const handleSave = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onSave();
    }, 200);
  };

  const selectedOpt = SLEEP_QUALITY_OPTIONS.find(o => o.value === selectedQuality);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSave}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={styles.sheet}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Title */}
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

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { opacity: closing ? 0.6 : 1 }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>Save session</Text>
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
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.xs,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  optionActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  selectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
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
    backgroundColor: COLORS.purple,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
