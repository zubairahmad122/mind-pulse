import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/** Build a sine-wave path string across `width`. */
function sinePath(width: number, midY: number, amp: number, cycles: number, phase: number): string {
  const steps = 64;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = midY + amp * Math.sin((i / steps) * cycles * Math.PI * 2 + phase);
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** A glowing moon over a soft golden sound-wave. */
export function MoonWave({ width = 320, height = 170 }: { width?: number; height?: number }) {
  const midY = height * 0.6;
  const moonR = 32;
  const moonCx = width / 2;
  const moonCy = height * 0.4;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.30" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="moonBody" cx="38%" cy="36%" r="68%">
            <Stop offset="0%" stopColor="#FDFCF7" stopOpacity="1" />
            <Stop offset="100%" stopColor="#C7D0DE" stopOpacity="1" />
          </RadialGradient>
          <LinearGradient id="waveGold" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#F6C453" stopOpacity="0.05" />
            <Stop offset="50%" stopColor="#FBD66B" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F6C453" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Moon halo */}
        <Circle cx={moonCx} cy={moonCy} r={moonR * 2} fill="url(#moonGlow)" />

        {/* Faint back wave */}
        <Path
          d={sinePath(width, midY + 10, 12, 1.8, 1)}
          stroke="#9FB3D1"
          strokeOpacity={0.22}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />

        {/* Moon body + craters */}
        <Circle cx={moonCx} cy={moonCy} r={moonR} fill="url(#moonBody)" />
        <Circle cx={moonCx - 9} cy={moonCy - 5} r={5} fill="#B9C3D4" opacity={0.45} />
        <Circle cx={moonCx + 8} cy={moonCy + 8} r={6.5} fill="#B9C3D4" opacity={0.4} />
        <Circle cx={moonCx + 11} cy={moonCy - 10} r={3} fill="#B9C3D4" opacity={0.35} />

        {/* Golden glowing wave */}
        <Path
          d={sinePath(width, midY, 20, 1.4, 0)}
          stroke="url(#waveGold)"
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
