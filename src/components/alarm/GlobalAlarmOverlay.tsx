import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  useEffect(() => {
    if (!visible) {
      setIsBreathing(false);
    }
  }, [visible]);

  const handleStop = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onStop();
  };

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
          <Ionicons name="alarm-outline" size={72} color="#fff" style={{ marginBottom: spacing.md }} />
          <Text style={styles.title}>Wake up!</Text>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>Your sleep alarm is ringing</Text>

          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() => setIsBreathing(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.stopText}>BEGIN BREATHING RESET</Text>
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
  },
  title: {
    ...typography.headingLarge,
    color: colors.text.primary,
    fontSize: 36,
    fontWeight: '800',
  },
  label: {
    ...typography.bodyLarge,
    color: colors.accent.purple,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hint: { ...typography.body, color: colors.text.secondary, marginTop: spacing.sm },
  stopBtn: {
    marginTop: spacing.xxl,
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.accent.purple,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  stopText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 2,
  },
});
