import Svg, { Circle, Path } from 'react-native-svg';

/** Heart shape path */
const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

interface HeartIconProps {
  size?: number;
  filled?: boolean;
  color?: string;
}

export function HeartIcon({ size = 22, filled = true, color = '#FF3366' }: HeartIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={HEART_PATH}
        fill={filled ? color : 'none'}
        stroke={filled ? color : 'rgba(255,255,255,0.25)'}
        strokeWidth={filled ? 0 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle highlight on filled hearts */}
      {filled && (
        <Circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.35)" />
      )}
    </Svg>
  );
}

/** Heart with a crack through it — when health is lost */
export function BrokenHeartIcon({ size = 22, color = '#666' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={HEART_PATH}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crack line */}
      <Path
        d="M12 10v5M10 12l4 2"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
