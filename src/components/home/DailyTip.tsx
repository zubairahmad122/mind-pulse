import { Eye, Lightbulb, Moon, Sparkles, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import type { FocusArea } from '@/utils/scoring';

const FOCUS_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  Eyes:  { icon: Eye,      color: '#6ee7b7' },
  Sleep: { icon: Moon,     color: '#a78bfa' },
  Mind:  { icon: Sparkles, color: '#4FC3F7' },
};

type Props = { tip: string; focusArea?: FocusArea };

export function DailyTip({ tip, focusArea }: Props) {
  const config = focusArea ? FOCUS_ICON[focusArea] : null;
  const Icon = config?.icon ?? Lightbulb;
  const iconColor = config?.color ?? '#4FC3F7';

  return (
    <GlassCard className="mb-4">
      <View style={{ borderLeftWidth: 3, borderLeftColor: iconColor, paddingLeft: 12 }}>
        <View className="flex-row items-center gap-2 mb-2">
          <View
            className="w-7 h-7 rounded-lg items-center justify-center"
            style={{ backgroundColor: iconColor + '18' }}
          >
            <Icon size={14} color={iconColor} strokeWidth={2} />
          </View>
          <Text className="text-xs font-bold tracking-wide" style={{ color: iconColor }}>
            Tip for Today
          </Text>
        </View>
        <Text className="text-[13px] text-white/50 leading-5">{tip}</Text>
      </View>
    </GlassCard>
  );
}
