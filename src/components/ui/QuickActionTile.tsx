import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ICON_CONTAINERS, ICON_SIZES, SHADOWS } from '@/constants/designSystem';

type Props = {
  icon: LucideIcon;
  label: string;
  accent: string;
  onPress?: () => void;
  /** Selected = accent border + glow. Inactive (default) = gray border + gray icon. */
  selected?: boolean;
  /** Circle diameter override — defaults to the standard 64dp tile. */
  size?: number;
  /** Icon stroke size override — defaults to the standard tile icon size. */
  iconSize?: number;
};

/**
 * The single canonical Quick Action tile — 64×64 circle, label beneath,
 * selected state gets an accent border + glow, inactive gets a gray border
 * + gray icon. Used for every "Quick Actions" row across the app.
 */
export function QuickActionTile({
  icon: Icon,
  label,
  accent,
  onPress,
  selected = true,
  size = ICON_CONTAINERS.quickAction,
  iconSize = ICON_SIZES.quickAction,
}: Props) {
  const handlePress = () => {
    if (!onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const borderColor = selected ? accent + '55' : 'rgba(255,255,255,0.12)';

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
            backgroundColor: selected ? accent + '1A' : 'rgba(255,255,255,0.04)',
            shadowColor: selected ? accent : 'transparent',
            shadowOpacity: selected ? 0.45 : 0,
            opacity: selected ? 1 : 0.75,
          },
        ]}
      >
        <Icon size={iconSize} color={accent} strokeWidth={1.8} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: ICON_CONTAINERS.quickAction,
    height: ICON_CONTAINERS.quickAction,
    borderRadius: ICON_CONTAINERS.quickAction / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.quickAction,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
});
