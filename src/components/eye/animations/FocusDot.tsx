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
      {/* Restrained outer halo */}
      <Circle cx={cx} cy={cx} r={size * 0.44} fill={color} opacity={0.14} />
      {/* Outer ring — crisp but not overpowering */}
      <Circle cx={cx} cy={cx} r={size * 0.36} fill="none" stroke={color} strokeWidth={2} opacity={0.75} />
      {/* White core body */}
      <Circle cx={cx} cy={cx} r={size * 0.26} fill="#FFFFFF" />
      {/* Crisp center highlight */}
      <Circle cx={cx} cy={cx} r={size * 0.10} fill="#FFFFFF" opacity={0.92} />
      {/* Focal point — the brightest spot */}
      <Circle cx={cx} cy={cx} r={size * 0.06} fill={color} />
    </Svg>
  );
}
