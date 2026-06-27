import { View, TouchableOpacity, Switch } from 'react-native';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { MPBadge } from '@/components/atoms/MPBadge';
import { COLORS, SIZES } from '@/theme';

type Accessory =
  | { kind: 'chevron' }
  | { kind: 'toggle'; value: boolean; onToggle: (v: boolean) => void }
  | { kind: 'badge'; label: string; variant?: 'default' | 'success' | 'warning' | 'premium' | 'info' }
  | { kind: 'none' };

type Props = {
  iconName: string;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  accessory?: Accessory;
  onPress?: () => void;
};

export function MPListItem({
  iconName,
  iconBgColor,
  title,
  subtitle,
  accessory = { kind: 'chevron' },
  onPress,
}: Props) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 14,
        minHeight: SIZES.touchTarget,
      }}
    >
      {/* Icon circle — 40px per spec */}
      <MPIcon
        name={iconName}
        size="sm"
        iconColor={COLORS.textPrimary}
        containerBg={iconBgColor}
        containerSize={SIZES.listItemCircle}
      />

      {/* Text */}
      <View style={{ flex: 1, gap: 2 }}>
        <MPText variant="body" color="primary" style={{ fontWeight: '600' }}>
          {title}
        </MPText>
        {subtitle && (
          <MPText variant="body-sm" color="secondary">
            {subtitle}
          </MPText>
        )}
      </View>

      {/* Accessory */}
      {accessory.kind === 'chevron' && (
        <MPIcon name="ChevronRight" size="xs" color="muted" />
      )}
      {accessory.kind === 'toggle' && (
        <Switch
          value={accessory.value}
          onValueChange={accessory.onToggle}
          trackColor={{ false: COLORS.elevated, true: COLORS.purple }}
          thumbColor={COLORS.textPrimary}
        />
      )}
      {accessory.kind === 'badge' && (
        <MPBadge text={accessory.label} variant={accessory.variant ?? 'default'} />
      )}
    </Container>
  );
}
