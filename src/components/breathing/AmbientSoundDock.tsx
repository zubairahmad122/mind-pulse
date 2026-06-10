import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BREATHING_MUSIC, type BreathingMusicId } from '@/constants/breathingMusic';
import { colors } from '@/constants/colors';

interface AmbientSoundDockProps {
  selectedId: BreathingMusicId;
  onSelect: (id: BreathingMusicId) => void;
  /** Tints active chips; falls back to each track's own color */
  accentColor?: string;
  /** Icon-only pill row, for screens with a more minimal aesthetic */
  compact?: boolean;
}

export function AmbientSoundDock({ selectedId, onSelect, accentColor, compact }: AmbientSoundDockProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {!compact && (
        <>
          <Ionicons name="musical-notes-outline" size={13} color={colors.text.tertiary} style={styles.icon} />
          <Text style={styles.label}>Ambient sound</Text>
        </>
      )}
      <View style={styles.chips}>
        {BREATHING_MUSIC.map(m => {
          const active = selectedId === m.id;
          const tint = accentColor ?? m.color;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => onSelect(m.id)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                compact && styles.chipCompact,
                active && { backgroundColor: tint + '22', borderColor: tint },
              ]}
            >
              <Ionicons name={m.icon} size={compact ? 16 : 14} color={active ? tint : colors.text.tertiary} />
              {!compact && (
                <Text style={[styles.chipLabel, active && { color: tint }]}>{m.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 8,
  },
  rowCompact: { justifyContent: 'center' },
  icon:  { marginRight: 4 },
  label: { fontSize: 11, color: colors.text.tertiary, fontWeight: '600', marginRight: 2 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipCompact: {
    paddingHorizontal: 9, paddingVertical: 9,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipLabel: { fontSize: 11, fontWeight: '700', color: colors.text.tertiary },
});
