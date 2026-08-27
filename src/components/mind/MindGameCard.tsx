import { memo, type ReactNode } from 'react';
import { Play } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { FONTS } from '@/constants/designSystem';
import { GameArtworkFrame } from './MindGameArtwork';

type Props = {
  title: string;
  category: string;
  description: string;
  metadata: string;
  accent: string;
  artwork: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
};

export const MindGameCard = memo(function MindGameCard({
  title,
  category,
  description,
  metadata,
  accent,
  artwork,
  accessibilityLabel,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.pressable}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            {
              borderColor: pressed ? `${accent}4D` : `${accent}20`,
              borderBottomColor: pressed ? `${accent}66` : `${accent}38`,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.artworkWell, { borderColor: `${accent}24` }]} pointerEvents="none">
            <GameArtworkFrame accent={accent}>{artwork}</GameArtworkFrame>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.category, { color: accent }]} numberOfLines={1}>{category}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <View style={[styles.play, { backgroundColor: accent }]}>
                <Play size={16} color="#07131D" fill="#07131D" strokeWidth={2.2} />
              </View>
            </View>
            <Text style={styles.description} numberOfLines={1}>{description}</Text>
            <Text style={styles.metadata} numberOfLines={1}>{metadata}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressable: { width: '100%', borderRadius: 22 },
  card: {
    width: '100%',
    minHeight: 114,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: 'rgba(18,21,42,.86)',
  },
  pressed: { opacity: .88, transform: [{ scale: .992 }] },
  artworkWell: {
    width: 82,
    height: 82,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: 'rgba(8,12,29,.82)',
  },
  copy: { flex: 1, minWidth: 0 },
  category: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1.05 },
  titleRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: FONTS.headingSemi, fontSize: 17, color: colors.text.primary },
  description: { fontSize: 11.5, color: colors.text.secondary, marginTop: 1 },
  metadata: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, marginTop: 6 },
  play: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
