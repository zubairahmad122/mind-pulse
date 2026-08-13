import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { MILLS_THEME as T } from '@/constants/millsTheme';

const PAD = 28;
const BOX = 600;
const VIEWBOX = BOX + PAD * 2;

/** Faint Nine Men's Morris board linework — decorative identity motif, not interactive. */
export function MillsBoardMotif({
  size,
  opacity = 0.16,
  color = T.boardLine,
  style,
}: {
  size: number;
  opacity?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size, opacity }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <Rect x={PAD} y={PAD} width={BOX} height={BOX} fill="none" stroke={color} strokeWidth={3} />
        <Rect x={PAD + 100} y={PAD + 100} width={400} height={400} fill="none" stroke={color} strokeWidth={2.5} />
        <Rect x={PAD + 200} y={PAD + 200} width={200} height={200} fill="none" stroke={color} strokeWidth={2.5} />
        <Line x1={PAD + 300} y1={PAD} x2={PAD + 300} y2={PAD + 200} stroke={color} strokeWidth={2.5} />
        <Line x1={PAD + 300} y1={PAD + 400} x2={PAD + 300} y2={PAD + 600} stroke={color} strokeWidth={2.5} />
        <Line x1={PAD} y1={PAD + 300} x2={PAD + 200} y2={PAD + 300} stroke={color} strokeWidth={2.5} />
        <Line x1={PAD + 400} y1={PAD + 300} x2={PAD + 600} y2={PAD + 300} stroke={color} strokeWidth={2.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
