import { View } from 'react-native';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { MPButton } from '@/components/atoms/MPButton';
import { COLORS, SPACING } from '@/theme';

type Props = {
  iconName: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export function MPEmptyState({ iconName, title, subtitle, ctaLabel, onCtaPress }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING['4xl'],
        paddingHorizontal: 40,
        gap: 16,
      }}
    >
      {/* Large icon */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: COLORS.elevated,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <MPIcon name={iconName} size="xl" color="muted" />
      </View>

      <MPText variant="h3" color="primary" style={{ textAlign: 'center' }}>
        {title}
      </MPText>

      <MPText variant="body-sm" color="secondary" style={{ textAlign: 'center', lineHeight: 20 }}>
        {subtitle}
      </MPText>

      {ctaLabel && onCtaPress && (
        <View style={{ marginTop: 8 }}>
          <MPButton variant="primary" size="md" title={ctaLabel} onPress={onCtaPress} />
        </View>
      )}
    </View>
  );
}
