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
      <Circle cx="18" cy="13" r="1.5" fill="#0a0818" />
      <Circle cx="22" cy="13" r="1.5" fill="#0a0818" />
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

// ─── Comet Trace — Solid blue disc + simple trail ────────────────────────────
export function CometTraceIcon({ size = 40, color = '#60a5fa' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Trail — fading circles trailing up-left from the core */}
      <Circle cx="13" cy="10" r="1.6" fill={color} opacity={0.18} />
      <Circle cx="17" cy="13" r="2.4" fill={color} opacity={0.32} />
      <Circle cx="22" cy="16" r="3.4" fill={color} opacity={0.5}  />
      {/* Solid core + small white highlight */}
      <Circle cx="29" cy="20" r="6"   fill={color} />
      <Circle cx="29" cy="20" r="2"   fill="#ffffff" opacity={0.9} />
    </Svg>
  );
}

// ─── 4th game — Spiral / Hypnotic ────────────────────────────────────────────
export function SpiralIcon({ size = 40, color = '#a78bfa' }: IconProps) {
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

// ─── Dichoptic Reaction — Dual overlapping color circles ──────────────────────
export function DichopticReactionIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* Red circle (left eye) */}
      <Circle cx="16" cy="20" r="12" fill="#FF3366" opacity={0.6} />
      {/* Cyan circle (right eye) — overlaps to show anaglyph */}
      <Circle cx="24" cy="20" r="12" fill="#00D4FF" opacity={0.6} />
      {/* Glasses icon */}
      <Circle cx="20" cy="20" r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
      <Line x1="14" y1="20" x2="20" y2="20" stroke="#fff" strokeWidth="0.8" strokeDasharray="2,1" />
      {/* Bridge */}
      <Line x1="14" y1="18" x2="18" y2="18" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="22" y1="18" x2="26" y2="18" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

export const GAME_ICON_COLORS: Record<string, string> = {
  'saccade-sniper': '#e24b4a',
  'focus-sprint': '#6ee7b7',
  'comet-trace': '#60a5fa',
  spiral: '#a78bfa',
  'dichoptic-reaction': '#7B61FF',
};

type EyeGameIconProps = {
  gameId: string;
  size?: number;
};

export function EyeGameIcon({ gameId, size = 36 }: EyeGameIconProps) {
  const color = GAME_ICON_COLORS[gameId] ?? '#a78bfa';

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
