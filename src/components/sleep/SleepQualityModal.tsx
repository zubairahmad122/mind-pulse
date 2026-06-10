import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SLEEP_QUALITY_OPTIONS } from '@/constants';
import { COLORS } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type Props = {
  visible: boolean;
  selectedQuality: number;
  onSelectQuality: (value: number) => void;
  onSave: () => void;
};

export function SleepQualityModal({ visible, selectedQuality, onSelectQuality, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>How did you sleep?</Text>
          <View style={styles.row}>
            {SLEEP_QUALITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, selectedQuality === opt.value && styles.optionActive]}
                onPress={() => onSelectQuality(opt.value)}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <Text style={styles.label}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveText}>Save session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  option: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: 12 },
  optionActive: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.purple },
  emoji: { fontSize: 28 },
  label: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
  saveBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
