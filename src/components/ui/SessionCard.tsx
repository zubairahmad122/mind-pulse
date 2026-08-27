import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from './GlassCard';
import { ICON_CONTAINERS, ICON_SIZES, SESSION_CARD, SURFACE_TINT, TYPOGRAPHY } from '@/constants/designSystem';

type Props = {
  icon: LucideIcon;
  title: string;
  /** Meta parts joined with " • " (e.g. ["5 min", "Beginner", "Sleep"]). */
  meta: string[];
  accent: string;
  /** Override the title color — for destructive rows (e.g. Log Out). Defaults to white. */
  titleColor?: string;
  /** Trailing slot — typically a small start/continue/completed pill. */
  trailing?: ReactNode;
  onPress?: () => void;
};

/**
 * The single canonical session list item — icon + title + meta line +
 * trailing action, height 108, radius 28, padding 20, no extra badges
 * beyond the trailing slot (spec section 13).
 */
export function SessionCard({ icon: Icon, title, meta, accent, titleColor, trailing, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
      <GlassCard simple noPadding style={styles.card} tint={SURFACE_TINT.card}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { borderColor: accent + '38', backgroundColor: accent + '18' }]}>
            <Icon size={ICON_SIZES.card} color={accent} strokeWidth={1.9} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, titleColor && { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta.join('  •  ')}
            </Text>
          </View>
          {trailing}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SESSION_CARD.radius,
    minHeight: SESSION_CARD.height,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: SESSION_CARD.padding,
  },
  iconBox: {
    width: ICON_CONTAINERS.sessionCard,
    height: ICON_CONTAINERS.sessionCard,
    borderRadius: ICON_CONTAINERS.sessionCard / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: TYPOGRAPHY.cardTitle.fontSize,
    fontWeight: TYPOGRAPHY.cardTitle.fontWeight,
    color: '#FFFFFF',
  },
  meta: {
    fontSize: TYPOGRAPHY.meta.fontSize,
    fontWeight: TYPOGRAPHY.meta.fontWeight,
    color: TYPOGRAPHY.meta.color,
  },
});
