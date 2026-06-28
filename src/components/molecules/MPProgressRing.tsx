import React, { useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SIZES } from '@/theme';

type PresetSize = 'sm' | 'md' | 'lg';

interface LegacyProps {
  /** Legacy API — preferred for new code only when using preset sizes. */
  percentage: number;
  size?: PresetSize;
  label?: string;
  sublabel?: string;
}

interface ExplicitProps {
  /** Explicit pixel size — supersedes `size` preset. */
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Percentage 0-100 rendered as the arc. */
  progress: number;
  value?: string | number;
  valueSuffix?: string;
  gradient?: {
    id: string;
    stops: { offset: string; color: string }[];
  };
}

type Props = LegacyProps | ExplicitProps;

const SIZE_MAP: Record<PresetSize, number> = { sm: 64, md: 100, lg: 140 };
const STROKE_WIDTH = SIZES.progressStroke;
const CAP = 'round' as const;

let counter = 0;

function isLegacy(p: Props): p is LegacyProps {
  return (p as LegacyProps).percentage !== undefined;
}

export function MPProgressRing(props: Props) {
  const legacy = isLegacy(props);
  const sizeProp = props.size ?? (legacy ? 'md' : 140);
  // `label`/`sublabel` only exist in the legacy API; explicit mode uses them as
  // a value/suffix fallback (see below), so read them defensively.
  const label = legacy ? props.label : undefined;
  const sublabel = legacy ? props.sublabel : undefined;

  const dimension: number = typeof sizeProp === 'number' ? sizeProp : SIZE_MAP[sizeProp];
  const strokeWidth: number = legacy ? STROKE_WIDTH : (props.strokeWidth ?? STROKE_WIDTH);
  const clamped = Math.max(0, Math.min(100, legacy ? props.percentage : props.progress));
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  const idRef = useRef(`ring-${counter++}`);
  const gradientId = legacy ? idRef.current : (props.gradient?.id ?? idRef.current);

  const gradientDef = legacy ? (
    <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
      <Stop offset="0%" stopColor={COLORS.purple} />
      <Stop offset="100%" stopColor={COLORS.blue} />
    </LinearGradient>
  ) : props.gradient ? (
    <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
      {props.gradient.stops.map((s, i) => (
        <Stop key={i} offset={s.offset} stopColor={s.color} />
      ))}
    </LinearGradient>
  ) : null;

  // Legacy and explicit-gradient rings reference the gradient by id; an
  // explicit ring with only a `color` uses that solid color, falling back to
  // the default purple.
  const resolvedStroke =
    legacy || props.gradient ? `url(#${gradientId})` : (props.color ?? COLORS.purple);

  const valueText = legacy ? label : (props.value ?? label);
  const suffix = legacy ? sublabel : (props.valueSuffix ?? sublabel);

  return (
    <View style={{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={dimension} height={dimension}>
        <Defs>{gradientDef}</Defs>
        {/* Background track */}
        <Circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={COLORS.elevated}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={resolvedStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap={CAP}
          transform={`rotate(-90 ${dimension / 2} ${dimension / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {valueText !== undefined && (
          <MPText
            variant={
              dimension >= 120
                ? 'h2'
                : dimension >= 90
                ? 'h3'
                : 'body'
            }
            color="primary"
          >
            {valueText}
          </MPText>
        )}
        {suffix && (
          <MPText variant={dimension >= 120 ? 'body-sm' : 'caption-xs'} color="secondary">
            {suffix}
          </MPText>
        )}
      </View>
    </View>
  );
}
