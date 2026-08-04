import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';
import { PILLAR_COLORS, STATUS_COLORS } from '@/constants/designSystem';
import type { SymbolSpec } from '@/utils/neonCipherSymbols';

export type NeonCipherSymbolState = 'default' | 'correct' | 'wrong';

interface Props {
  spec: SymbolSpec;
  size: number;
  state?: NeonCipherSymbolState;
  highContrast?: boolean;
}

const VIEWBOX = 100;
const CENTER = 50;

/** Accent-dot anchor points — a fixed, non-color trait independent of the
 *  base shape's own geometry. */
const ACCENT_POSITIONS: readonly [number, number][] = [
  [50, 8],
  [14, 82],
  [86, 82],
];

function shapeElement(baseShape: SymbolSpec['baseShape'], strokeWidth: number, color: string) {
  switch (baseShape) {
    case 'triangle':
      return <Polygon points="50,16 86,80 14,80" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />;
    case 'diamond':
      return <Polygon points="50,10 90,50 50,90 10,50" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />;
    case 'hex':
      return (
        <Polygon
          points="50,12 83,31 83,69 50,88 17,69 17,31"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case 'chevron':
      return (
        <Path
          d="M30,18 L70,50 L30,82"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'prism':
      return (
        <Polygon
          points="32,20 68,20 88,80 12,80"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case 'orbitRing':
      return (
        <>
          <Circle cx={CENTER} cy={CENTER} r={34} stroke={color} strokeWidth={strokeWidth} fill="none" />
          <Circle cx={CENTER} cy={16} r={6} fill={color} />
        </>
      );
    case 'spark':
      return (
        <Path
          d="M50,10 L58,42 L90,50 L58,58 L50,90 L42,58 L10,50 L42,42 Z"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case 'arcCross':
      return (
        <>
          <Path d="M20,50 A30,30 0 1 1 50,80" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <Path d="M50,40 L50,60 M40,50 L60,50" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
  }
}

/**
 * Renders one original, procedurally-generated Neon Cipher symbol. Every
 * distinguishing trait (base shape, rotation, mirroring, accent dots,
 * stroke weight) is geometry-based — color is decorative feedback only
 * (state: correct/wrong), never load-bearing for telling symbols apart.
 */
export function NeonCipherSymbolGlyph({ spec, size, state = 'default', highContrast = false }: Props) {
  const color = useMemo(() => {
    if (state === 'correct') return PILLAR_COLORS.eye;
    if (state === 'wrong') return STATUS_COLORS.error;
    return highContrast ? '#FFFFFF' : 'rgba(233,240,255,0.82)';
  }, [state, highContrast]);

  const strokeWidth = spec.strokeWeight === 'bold' ? 7 : 4;
  // Rotation/mirror apply to the base shape only — accent dots stay at
  // fixed screen-relative anchors so accent count reads as an independent
  // trait, not one that rotates or flips away with the shape.
  const transform = `rotate(${spec.rotationDeg} ${CENTER} ${CENTER}) scale(${spec.mirrored ? -1 : 1}, 1) translate(${spec.mirrored ? -VIEWBOX : 0}, 0)`;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <G transform={transform}>{shapeElement(spec.baseShape, strokeWidth, color)}</G>
        {ACCENT_POSITIONS.slice(0, spec.accentCount).map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={4.5} fill={color} opacity={0.9} />
        ))}
      </Svg>
    </View>
  );
}
