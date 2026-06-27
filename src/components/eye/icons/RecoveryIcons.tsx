import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Daily Recovery — 6-step CVS protocol */
export function DailyRecoveryIcon({ size = 40, color = '#22d3ee' }: IconProps) {
  const stepDots = [0, 60, 120, 180, 240, 300].map(deg => {
    const rad = (deg * Math.PI) / 180;
    return {
      cx: 20 + 13 * Math.cos(rad - Math.PI / 2),
      cy: 20 + 13 * Math.sin(rad - Math.PI / 2),
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="15" stroke={color} strokeWidth="1" fill="none" opacity={0.25} />
      {stepDots.map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r="2.2" fill={color} opacity={0.85} />
      ))}
      <Ellipse cx="20" cy="20" rx="7" ry="5" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="20" cy="20" r="2.5" fill={color} />
      <Path
        d="M 20 11 A 9 9 0 0 1 29 20"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity={0.7}
      />
    </Svg>
  );
}

/** Quick Relief — moisture / blink relief */
export function QuickReliefIcon({ size = 40, color = '#4FC3F7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="22" r="11" fill={color} opacity={0.12} />
      <Path
        d="M 20 7
           C 27 14 30 20 30 25
           C 30 31 25 35 20 35
           C 15 35 10 31 10 25
           C 10 20 13 14 20 7 Z"
        fill={color}
        opacity={0.9}
      />
      <Ellipse cx="16" cy="24" rx="2.5" ry="3.5" fill="#ffffff" opacity={0.35} />
      <Path
        d="M 12 36 Q 20 33 28 36"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      />
      <Line x1="14" y1="36" x2="14" y2="38" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.4} />
      <Line x1="26" y1="36" x2="26" y2="38" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity={0.4} />
    </Svg>
  );
}

export const RECOVERY_ICON_COLORS: Record<string, string> = {
  'cvs-protocol': '#22d3ee',
  'quick-relief': '#4FC3F7',
  'comet-trace': '#34d399',
};

export const RECOVERY_ICON_BG: Record<string, string> = {
  'cvs-protocol': 'rgba(123, 97, 255, 0.15)',
  'quick-relief': 'rgba(79, 195, 247, 0.15)',
  'comet-trace': 'rgba(52, 211, 153, 0.15)',
};

type RecoveryIconProps = {
  sessionId: string;
  size?: number;
};

export function RecoverySessionIcon({ sessionId, size = 36 }: RecoveryIconProps) {
  const color = RECOVERY_ICON_COLORS[sessionId] ?? '#22d3ee';

  switch (sessionId) {
    case 'quick-relief':
      return <QuickReliefIcon size={size} color={color} />;
    case 'comet-trace':
      return <QuickReliefIcon size={size} color={color} />;
    case 'cvs-protocol':
    default:
      return <DailyRecoveryIcon size={size} color={color} />;
  }
}
