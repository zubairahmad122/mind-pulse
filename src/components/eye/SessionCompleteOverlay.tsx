import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { STATUS_COLORS } from '@/constants/designSystem';

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function SessionCompleteOverlay({ visible, onDone }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withTiming(1, { duration: 280 });
    translateY.value = withTiming(0, { duration: 320 });
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, animStyle]}>
      <View style={styles.card}>
        <Text style={styles.check}>✓</Text>
        <Text style={styles.title}>Session Complete</Text>
        <View style={styles.divider} />
        <View style={styles.rows}>
          <Text style={styles.row}>Guided screen break complete</Text>
          <Text style={styles.row}>Recovery +12%</Text>
          <Text style={styles.rowMuted}>MindPulse improving</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5,7,20,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  card: {
    width: '78%',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: STATUS_COLORS.success,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  check: { fontSize: 40, color: STATUS_COLORS.success },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  divider: { height: 1, width: '100%', backgroundColor: 'rgba(50,213,131,0.2)' },
  rows: { gap: 8, alignItems: 'center' },
  row: { fontSize: 14, fontWeight: '600', color: '#fff' },
  rowMuted: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
});
