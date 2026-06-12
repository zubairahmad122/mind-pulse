import * as Haptics from 'expo-haptics';
import { Bell, Sunrise, Sun } from 'lucide-react-native';
import { useState, useEffect, useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { BreatheToDismiss } from '../sleep/BreatheToDismiss';

type Props = {
  visible: boolean;
  label: string;
  onStop: () => void;
};

export function GlobalAlarmOverlay({ visible, label, onStop }: Props) {
  const insets = useSafeAreaInsets();
  const [isBreathing, setIsBreathing] = useState(false);

  // ── Pulsing glow animation ────────────────────────────────────────────────
  const glowOpacity = useSharedValue(0.15);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (!visible || isBreathing) {
      glowOpacity.value = withTiming(0, { duration: 300 });
      return;
    }
    glowOpacity.value = withRepeat(
      withTiming(0.35, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    glowScale.value = withRepeat(
      withTiming(1.12, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [visible, isBreathing]);

  const glowAnim = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  useEffect(() => {
    if (!visible) {
      setIsBreathing(false);
    }
  }, [visible]);

  const handleStop = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onStop();
  };

  // Extract time for sunrise message
  const timeStr = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleStop}
    >
      {isBreathing ? (
        <BreatheToDismiss onComplete={handleStop} onEmergencySkip={handleStop} />
      ) : (
        <View style={[styles.screen, { paddingTop: insets.top + spacing.xl }]}>
          {/* Animated glow halo */}
          <Animated.View style={[styles.glowHalo, glowAnim]} />

          {/* Sunrise gradient arc */}
          <View style={styles.sunArc} />

          {/* Sun icon */}
          <View style={styles.iconWrap}>
            <Sunrise size={64} color="#FF9800" strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>Wake up</Text>
          <Text style={styles.timeSub}>{timeStr}</Text>
          <Text style={styles.label}>{label}</Text>

          <View style={styles.divider} />

          <View style={styles.hintRow}>
            <Bell size={14} color="rgba(255,255,255,0.35)" />
            <Text style={styles.hint}>Take a moment to breathe</Text>
          </View>

          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => setIsBreathing(true)}
            activeOpacity={0.85}
          >
            <Sun size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.stopText}>Begin Breathing Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Dismiss alarm</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0720',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  glowHalo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FF9800',
    top: '20%',
  },
  sunArc: {
    position: 'absolute',
    top: '12%',
    width: '150%',
    height: 120,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 152, 0, 0.06)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.25)',
  },
  title: {
    ...typography.headingLarge,
    color: colors.text.primary,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  timeSub: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.3)',
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.bodyLarge,
    color: colors.accent.purple,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    marginVertical: spacing.lg,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  hint: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  stopBtn: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.purple,
    paddingVertical: spacing.lg,
    borderRadius: 16,
  },
  stopText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  dismissBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dismissText: {
    ...typography.body,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
