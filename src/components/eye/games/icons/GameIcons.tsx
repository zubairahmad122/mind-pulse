import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// ─── Saccade Sniper — Crosshair ──────────────────────────────────────────────
export function SaccadeSniperIcon({ size = 40, color = '#e24b4a' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Outer crosshair ring */}
      <Circle cx="20" cy="20" r="16" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Inner ring */}
      <Circle cx="20" cy="20" r="8"  stroke={color} strokeWidth="1.5" fill="none" />
      {/* Center dot */}
      <Circle cx="20" cy="20" r="2.5" fill={color} />
      {/* Crosshair ticks */}
      <Line x1="20" y1="2"  x2="20" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="20" y1="30" x2="20" y2="38" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="2"  y1="20" x2="10" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="30" y1="20" x2="38" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Focus Sprint — Firefly ──────────────────────────────────────────────────
export function FocusSprintIcon({ size = 40, color = '#6ee7b7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Glow */}
      <Circle cx="20" cy="22" r="12" fill={color} opacity={0.15} />
      {/* Wings */}
      <Ellipse cx="11" cy="18" rx="9" ry="5" fill={color} opacity={0.4} transform="rotate(-20, 11, 18)" />
      <Ellipse cx="29" cy="18" rx="9" ry="5" fill={color} opacity={0.4} transform="rotate(20, 29, 18)" />
      {/* Body */}
      <Ellipse cx="20" cy="24" rx="5" ry="8" fill={color} />
      {/* Head */}
      <Circle cx="20" cy="14" r="5" fill={color} />
      {/* Eyes */}
      <Circle cx="18" cy="13" r="1.5" fill="#06121a" />
      <Circle cx="22" cy="13" r="1.5" fill="#06121a" />
      {/* Antennae */}
      <Path d="M 18 10 Q 14 5 12 3" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Circle cx="12" cy="3" r="1.5" fill={color} />
      <Path d="M 22 10 Q 26 5 28 3" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Circle cx="28" cy="3" r="1.5" fill={color} />
      {/* Tail glow */}
      <Circle cx="20" cy="33" r="3" fill="#ffffff" opacity={0.8} />
    </Svg>
  );
}

// ─── Comet Trace — Target / following dot ──────────────────────────────────
export function CometTraceIcon({ size = 40, color = '#60a5fa' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Outer ring */}
      <Circle cx="20" cy="20" r="16" stroke={color} strokeWidth="1.2" fill="none" opacity={0.35} />
      {/* Mid ring */}
      <Circle cx="20" cy="20" r="10" stroke={color} strokeWidth="1.5" fill="none" opacity={0.55} />
      {/* Inner ring */}
      <Circle cx="20" cy="20" r="5" stroke={color} strokeWidth="1.8" fill="none" opacity={0.8} />
      {/* Center dot — the thing you follow */}
      <Circle cx="20" cy="20" r="3" fill={color} />
      <Circle cx="20" cy="20" r="1.2" fill="#ffffff" opacity={0.9} />
    </Svg>
  );
}

// ─── 4th game — Spiral / Hypnotic ────────────────────────────────────────────
export function SpiralIcon({ size = 40, color = '#22d3ee' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Outer glow ring */}
      <Circle cx="20" cy="20" r="18" stroke={color} strokeWidth="0.5" fill="none" opacity={0.2} />
      {/* Spiral path */}
      <Path
        d="M 20 20
           Q 20 15 25 15
           Q 32 15 32 20
           Q 32 28 20 28
           Q 10 28 10 18
           Q 10 8 22 8
           Q 36 8 36 22
           Q 36 34 20 34
           Q 6 34 6 20"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Center dot */}
      <Circle cx="20" cy="20" r="2.5" fill={color} />
    </Svg>
  );
}

// ─── Dichoptic Reaction — Two distinct eyes side-by-side ─────────────────
export function DichopticReactionIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Left eye — almond shape + iris + pupil */}
      <Path d="M 5 20 Q 12 10 20 20 Q 12 30 5 20 Z" fill="#FF3366" opacity={0.6} />
      <Circle cx="12" cy="20" r="4.5" fill="#FF3366" opacity={0.8} />
      <Circle cx="12" cy="20" r="2" fill="#06121a" />
      <Circle cx="12" cy="19" r="0.8" fill="#fff" opacity={0.9} />
      {/* Right eye — almond shape + iris + pupil */}
      <Path d="M 20 20 Q 28 10 35 20 Q 28 30 20 20 Z" fill="#00D4FF" opacity={0.6} />
      <Circle cx="28" cy="20" r="4.5" fill="#00D4FF" opacity={0.8} />
      <Circle cx="28" cy="20" r="2" fill="#06121a" />
      <Circle cx="28" cy="19" r="0.8" fill="#fff" opacity={0.9} />
    </Svg>
  );
}

export const GAME_ICON_COLORS: Record<string, string> = {
  'saccade-sniper': '#e24b4a',
  'focus-sprint': '#6ee7b7',
  'comet-trace': '#60a5fa',
  spiral: '#22d3ee',
  'dichoptic-reaction': '#22d3ee',
};

type EyeGameIconProps = {
  gameId: string;
  size?: number;
};

export function EyeGameIcon({ gameId, size = 36 }: EyeGameIconProps) {
  const color = GAME_ICON_COLORS[gameId] ?? '#22d3ee';

  switch (gameId) {
    case 'saccade-sniper':
      return <SaccadeSniperIcon size={size} color={color} />;
    case 'focus-sprint':
      return <FocusSprintIcon size={size} color={color} />;
    case 'comet-trace':
      return <CometTraceIcon size={size} color={color} />;
    case 'dichoptic-reaction':
      return <DichopticReactionIcon size={size} color={color} />;
    default:
      return <SpiralIcon size={size} color={color} />;
  }
}
