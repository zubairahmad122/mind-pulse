import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { COLORS } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
};

/**
 * Dismissible "soft" paywall prompt — never blocks app usage.
 * Used for the post-onboarding nudge and the 3-day streak nudge.
 */
export function SoftPaywallModal({
  visible,
  emoji,
  title,
  subtitle,
  ctaLabel = 'Unlock Pro',
  onUpgrade,
  onDismiss,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(20).stiffness(150)}
          exiting={FadeOutDown.duration(200)}
          style={styles.sheet}
        >
          <View style={styles.handleBar} />
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <PrimaryButton label={ctaLabel} onPress={onUpgrade} style={styles.upgradeBtn} />

          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Maybe later</Text>
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
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  upgradeBtn: {
    width: '100%',
    marginBottom: spacing.md,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
});
