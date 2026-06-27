// ──────────────────────────────────────────────────────────────────────────────
// MPIcon — Atomic icon component wrapping lucide-react-native
// Supports both string-based `name` (from icon registry) and direct `Icon` prop.
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import {
  Home, Moon, Wind, Eye, User, Settings, Bell, Volume2,
  Vibrate, Play, Check, ChevronRight, Sparkles, Flame, Trophy,
  Crown, Star, Lock, Unlock, Sun, Brain, Gamepad2, Leaf, Target,
  X, ArrowLeft, ChevronDown, Plus, Minus, MoreHorizontal, Pause,
  SkipForward, RotateCcw, Calendar, Clock, TrendingUp, Award,
  Shield, Zap, Heart, Globe, RefreshCw,
} from 'lucide-react-native';
import { COLORS, SIZES } from '@/theme';

export type SizeToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<SizeToken, number> = {
  xs: SIZES.iconXs,
  sm: SIZES.iconSm,
  md: SIZES.iconMd,
  lg: SIZES.iconLg,
  xl: SIZES.iconXl,
};

export type ColorToken =
  | 'primary' | 'secondary' | 'muted' | 'purple' | 'purple-light'
  | 'blue' | 'green' | 'gold' | 'red' | 'cyan' | 'orange';

const COLOR_MAP: Record<ColorToken, string> = {
  primary: COLORS.textPrimary,
  secondary: COLORS.textSecondary,
  muted: COLORS.textMuted,
  purple: COLORS.purple,
  'purple-light': COLORS.purpleLight,
  blue: COLORS.blue,
  green: COLORS.green,
  gold: COLORS.gold,
  red: COLORS.red,
  cyan: COLORS.cyan,
  orange: COLORS.orange,
};

/** Static icon registry — maps string names to lucide-react-native components. */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  Home, Moon, Wind, Eye, User, Settings, Bell, Volume2,
  Vibrate, Play, Check, ChevronRight, Sparkles, Flame, Trophy,
  Crown, Star, Lock, Unlock, Sun, Brain, Gamepad2, Leaf, Target,
  X, ArrowLeft, ChevronDown, Plus, Minus, MoreHorizontal, Pause,
  SkipForward, RotateCcw, Calendar, Clock, TrendingUp, Award,
  Shield, Zap, Heart, Globe, RefreshCw,
};

interface MPIconProps {
  /** Lucide icon component (direct import) */
  Icon?: LucideIcon;
  /** String icon name — resolved from static registry */
  name?: string;
  size?: SizeToken;
  color?: ColorToken;
  /** If provided, wraps icon in a circle with this bg color string */
  containerBg?: string;
  /** Size of the container circle (default: featureIconCircle = 44) */
  containerSize?: number;
  /** Override icon color directly (takes precedence over color token) */
  iconColor?: string;
}

export function MPIcon({
  Icon: IconProp,
  name: iconName,
  size = 'md',
  color = 'primary',
  containerBg,
  containerSize = SIZES.featureIconCircle,
  iconColor,
}: MPIconProps) {
  const ResolvedIcon = IconProp ?? (iconName ? ICON_REGISTRY[iconName] : undefined);
  if (!ResolvedIcon) return null;

  const iconSize = SIZE_MAP[size];
  const resolvedColor = iconColor ?? COLOR_MAP[color];

  if (containerBg) {
    return (
      <View
        style={{
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: containerBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ResolvedIcon size={iconSize} color={resolvedColor} />
      </View>
    );
  }

  return <ResolvedIcon size={iconSize} color={resolvedColor} />;
}
