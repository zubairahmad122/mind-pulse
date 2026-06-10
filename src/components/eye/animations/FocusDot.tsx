import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface FocusDotProps {
  /** Total diameter. Default 32. */
  size?: number;
  /** Accent color for rings + center dot. */
  color: string;
}

/**
 * Concentric target-style dot — acts like a scope reticle.
 * Multiple rings naturally draw the eye to the center,
 * making it far easier to focus on than a plain circle.
 */
export function FocusDot({ size = 32, color }: FocusDotProps) {
  const cx = size / 2;
  return (
    <Svg width={size} height={size}>
      {/* Glow layers */}
      <Circle cx={cx} cy={cx} r={size * 0.45} fill={color} opacity={0.20} />
      <Circle cx={cx} cy={cx} r={size * 0.35} fill={color} opacity={0.10} />
      {/* Outer colored ring */}
      <Circle cx={cx} cy={cx} r={size * 0.38} fill="none" stroke={color} strokeWidth={2.5} />
      {/* White body */}
      <Circle cx={cx} cy={cx} r={size * 0.30} fill="#FFFFFF" />
      {/* Inner subtle ring */}
      <Circle cx={cx} cy={cx} r={size * 0.19} fill="none" stroke={color} strokeWidth={0.8} opacity={0.35} />
      {/* Center dot — the focal point */}
      <Circle cx={cx} cy={cx} r={size * 0.10} fill={color} />
    </Svg>
  );
}
