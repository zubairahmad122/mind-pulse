import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MILLS_THEME as T } from '@/constants/millsTheme';
import { MillsBoardMotif } from './MillsBoardMotif';

/**
 * The one shared Mills background — a deep navy gradient with two genuinely soft radial glows
 * (SVG radial gradients, not flat translucent circles, so they fade rather than reading as
 * "blobs") and an optional near-invisible Morris board watermark. Used identically by the entry,
 * setup, and gameplay screens so the three feel like one visual system instead of three restyles.
 */
export function MillsBackground({ watermark = true, focused = false }: { watermark?: boolean; focused?: boolean }) {
  const { width, height } = useWindowDimensions();
  const base: [string, string] = focused ? ['#05101F', '#030710'] : ['#071426', '#040B16'];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={base} locations={[0, 1]} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="millsCoolGlow" cx="82%" cy="4%" r="52%">
            <Stop offset="0%" stopColor={T.p1} stopOpacity={focused ? 0.06 : 0.09} />
            <Stop offset="100%" stopColor={T.p1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="millsWarmGlow" cx="10%" cy="92%" r="46%">
            <Stop offset="0%" stopColor={T.bronze} stopOpacity={focused ? 0.035 : 0.055} />
            <Stop offset="100%" stopColor={T.bronze} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#millsCoolGlow)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#millsWarmGlow)" />
      </Svg>
      {watermark && (
        <MillsBoardMotif
          size={Math.min(width, height) * 0.86}
          opacity={0.04}
          style={{ top: height * 0.24, alignSelf: 'center' }}
        />
      )}
    </View>
  );
}
